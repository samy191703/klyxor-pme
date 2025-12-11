// server/services/billing.service.ts
import { db } from "server/db";
import { and, desc, eq } from "drizzle-orm";
import { billingLines, billingSchedules, contracts } from "@shared/schema";
import { BillingFrequency, BillingType } from "@shared/enums/billing.enum";
import {
  buildPeriods,
  calculateAmountsByPeriodDays,
  arePeriodsEqual,
  splitAmountWithRounding,
} from "server/utils/billing";
import { storage } from "server/storage";

type GenerateArgs = { contractId: string; userId: string };

// --- Helpers ---
function assertNonNullDate(d: Date | null | undefined, label: string): Date {
  if (!d) throw new Error(`${label} is required`);
  return new Date(d);
}
function toMoneyString(n: number): string {
  return n.toFixed(2); // Drizzle decimal() expects string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

function addDaysUtc(d: Date, days: number): Date {
  const nd = new Date(d.getTime());
  nd.setUTCDate(nd.getUTCDate() + days);
  return nd;
}

/**
 * Ajoute une période "théorique" à partir de pStart selon la fréquence :
 * - MONTHLY     -> +1 mois
 * - QUARTERLY   -> +3 mois
 * - SEMIANNUAL  -> +6 mois
 * - ANNUAL      -> +1 an
 * (fallback: +1 mois)
 */
function addFrequencyUtc(start: Date, frequency: BillingFrequency): Date {
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  const d = start.getUTCDate();

  let monthsToAdd = 0;
  let yearsToAdd = 0;

  switch (frequency) {
    case "MONTHLY":
      monthsToAdd = 1;
      break;
    case "QUARTERLY":
      monthsToAdd = 3;
      break;
    case "SEMIANNUAL":
      monthsToAdd = 6;
      break;
    case "ANNUAL":
      yearsToAdd = 1;
      break;
    default:
      // fallback safe: 1 month
      monthsToAdd = 1;
      break;
  }

  return new Date(Date.UTC(y + yearsToAdd, m + monthsToAdd, d));
}

/**
 * Type de période utilisé localement
 * pEnd est INCLUSIVE (pour affichage : 31/03, 30/06, etc.)
 */
type Period = {
  pStart: Date;
  pEnd: Date;
};

/**
 * Construit les périodes calendrier entre [start, end] selon la fréquence.
 *
 * Règles :
 * - on part exactement de start (ex: 06/01/2025)
 * - on avance de +1 mois / +3 mois / +6 mois / +1 an (addFrequencyUtc)
 * - la fin "naturelle" de la période est (finThéoriqueExclusive - 1 jour)
 * - on tronque sur la fin de contrat si besoin
 */
function buildPeriods(
  start: Date,
  end: Date,
  frequency: BillingFrequency
): Period[] {
  const periods: Period[] = [];

  const startMid = toUtcMidnight(start);
  const endMidInclusive = toUtcMidnight(end);

  if (endMidInclusive.getTime() < startMid.getTime()) {
    return periods;
  }

  let cursor = startMid;

  while (cursor.getTime() <= endMidInclusive.getTime()) {
    // Fin théorique EXCLUSIVE (ex: 06/02 pour une période débutant le 06/01 en MONTHLY)
    const theoreticalEndExclusive = addFrequencyUtc(cursor, frequency);

    // Fin naturelle inclusive (ex: 05/02 = 06/02 - 1 jour)
    const naturalEndInclusive = addDaysUtc(theoreticalEndExclusive, -1);

    // Clamp sur la fin de contrat : on ne dépasse jamais end
    const pEndInclusive =
      naturalEndInclusive.getTime() > endMidInclusive.getTime()
        ? endMidInclusive
        : naturalEndInclusive;

    periods.push({
      pStart: cursor,
      pEnd: pEndInclusive,
    });

    // Si la fin théorique exclusive dépasse la fin de contrat, on s'arrête
    if (theoreticalEndExclusive.getTime() > endMidInclusive.getTime()) {
      break;
    }

    // Période suivante : on avance le curseur à la fin théorique (exclusive)
    cursor = theoreticalEndExclusive;
  }

  return periods;
}

/**
 * Prorata rule:
 *   prorata = jours_effectifs / jours_totaux_période  (borne sup exclue)
 *   - jours_effectifs : nombre de jours d'intersection entre [pStart, pEndFull) et [cStart, cEndExcl)
 *   - jours_totaux_période : pEndFull - pStart (en jours) → période THÉORIQUE complète
 *   - clampé dans [0, 1]
 */
function periodProrataAgainstContract(
  pStart: Date,
  pEndFull: Date,
  contractStart: Date,
  contractEndInclusive: Date
): number {
  const p0 = toUtcMidnight(pStart);
  const p1 = toUtcMidnight(pEndFull); // borne sup exclue
  const c0 = toUtcMidnight(contractStart);
  // contract end : borne inclusive → on rend exclue en ajoutant 1 jour
  const c1 = addDaysUtc(toUtcMidnight(contractEndInclusive), 1);

  const periodDays = (p1.getTime() - p0.getTime()) / MS_PER_DAY;
  if (periodDays <= 0) return 0;

  const interStartMs = Math.max(p0.getTime(), c0.getTime());
  const interEndMs = Math.min(p1.getTime(), c1.getTime());

  const overlapDays = Math.max(0, (interEndMs - interStartMs) / MS_PER_DAY);

  let ratio = overlapDays / periodDays;
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;

  return ratio;
}

/**
 * Date d'échéance basée sur la période :
 * - A_ECHOIR  -> début de période (pStart)
 * - TERME_ECHU (ou autre) -> fin de période (pEnd)
 */
function computeDueDateFromPeriod(
  pStart: Date,
  pEnd: Date,
  billingType: BillingType
): Date {
  if (billingType === "A_ECHOIR") {
    return pStart;
  }
  // TERME_ECHU ou autres : fin de période
  return pEnd;
}

export async function generateBillingScheduleForContract({
  contractId,
  userId,
}: GenerateArgs) {
  return await db.transaction(async (tx) => {
    // 1) Contract
    const [ct] = await tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);
    if (!ct) throw new Error("Contract not found");

    const start = assertNonNullDate(
      ct.startDate as Date | null,
      "Contract startDate"
    );
    const end = assertNonNullDate(
      ct.endDate as Date | null,
      "Contract endDate"
    );

    // fréquence dérivée du billingPeriod (MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL)
    const frequency = ct.billingPeriod
      ? (ct.billingPeriod.toUpperCase() as BillingFrequency)
      : ("MONTHLY" as BillingFrequency);

    const billingType = (ct.billingType as BillingType) ?? "A_ECHOIR";

    // Treat contract.amount as the TOTAL for the whole plan period
    const totalAmount = Number((ct as any).amount ?? (ct as any).amountHt ?? 0);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      throw new Error("Total amount must be a non-negative number");
    }

    // 2) Versioning
    const existing = await tx
      .select()
      .from(billingSchedules)
      .where(eq(billingSchedules.contractId, contractId))
      .orderBy(desc(billingSchedules.version));
    const nextVersion = (existing[0]?.version ?? 0) + 1;

    // 3) Archive current active
    if (existing.length && existing[0].status === "active") {
      await tx
        .update(billingSchedules)
        .set({ status: "archived" })
        .where(
          and(
            eq(billingSchedules.contractId, contractId),
            eq(billingSchedules.version, existing[0].version)
          )
        );
    }

    // 4) Récupérer la date d'indexation si elle existe
    const indexationDate = ct.indexationDate
      ? (ct.indexationDate as Date)
      : null;

    // 5) Calendar periods avec nouvelle logique (année n / année n+1, date d'indexation)
    const periods = buildPeriods(start, end, frequency, indexationDate);
    if (!periods.length)
      throw new Error("No periods generated for given dates/frequency");

    // 6) Détecter si toutes les périodes ont le même nombre de jours (périodes complètes)
    // Si oui, utiliser US5.1+US5.2 pour répartition égale
    // Sinon, calculer proportionnellement aux jours réels
    const useEqualDistribution = arePeriodsEqual(periods);
    
    // Calculer les montants (US5.1+US5.2 si périodes égales, sinon proportionnel)
    const amounts = calculateAmountsByPeriodDays(
      totalAmount,
      periods,
      useEqualDistribution,
      contractId
    );

    // 7) Optional control ±0.01€
    const sumRounded =
      Math.round(amounts.reduce((a, b) => a + b, 0) * 100) / 100;
    const expected = Math.round(totalAmount * 100) / 100;
    const delta = Math.abs(sumRounded - expected);
    if (delta > 0.01) {
      await storage.createAuditLog?.({
        userId,
        username: "Action Serveur",
        action: "billing_schedule_generation_error",
        traceId: `contract-${contractId}`,
        entityType: "billing_schedule",
        entityId: "",
        details: JSON.stringify({
          reason: "sum_mismatch",
          sumRounded,
          totalAmount,
          delta,
        }),
        ipAddress: "Action Serveur",
        userAgent: "Action Serveur",
      });
      throw new Error("Mismatch > 0.01 on lines sum vs contract total");
    }

    // 8) Insert schedule
    type NewSchedule = typeof billingSchedules.$inferInsert;
    const scheduleValues: NewSchedule = {
      contractId,
      startDate: start,
      endDate: end,
      frequency,
      billingType,
      version: nextVersion,
      status: "active",
    };
    const [schedule] = await tx
      .insert(billingSchedules)
      .values(scheduleValues)
      .returning();

    // 9) Insert lines with dueDate based purely on the period (no 15/1 rule)
    type NewLine = typeof billingLines.$inferInsert;
    const lineValues: NewLine[] = periods.map(({ pStart, pEnd }, i) => ({
      scheduleId: schedule.id,
      sequenceNo: i + 1,
      dueDate: computeDueDateFromPeriod(pStart, pEnd, billingType),
      billingStartDate: pStart, // Date de début de la période facturée
      billingEndDate: pEnd, // Date de fin de la période facturée
      amountHt: toMoneyString(amounts[i]),
      status: "A_FACTURER",
    }));
    await tx.insert(billingLines).values(lineValues);

    // 10) Audit
    await storage.createAuditLog?.({
      userId,
      username: "",
      action: "billing_schedule_generated",
      traceId: `contract-${contractId}`,
      entityType: "billing_schedule",
      entityId: schedule.id,
      details: JSON.stringify({
        version: nextVersion,
        linesCount: lineValues.length,
        billingType,
        frequency,
        totalAmount,
      }),
      ipAddress: "",
      userAgent: "",
    });

    return {
      scheduleId: schedule.id,
      linesCount: lineValues.length,
      version: nextVersion,
    };
  });
}
