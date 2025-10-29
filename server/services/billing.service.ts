// server/services/billing.service.ts
import { db } from "server/db";
import { and, desc, eq } from "drizzle-orm";
import { billingLines, billingSchedules, contracts } from "@shared/schema";
import { BillingFrequency, BillingType } from "@shared/enums/billing.enum";
import {
  buildPeriods,
  prorataForPeriod,
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

// ⬇️ New helper: compute the due date rule you requested:
// - first period: 15th of the start month
// - subsequent periods: 1st of the period month (A Échoir)
function dueDateFirst15Then1st(
  pStart: Date,
  periodIndex: number,
  billingType: BillingType
): Date {
  // A Échoir only for now. (Keep your existing rule for TERME_ECHU if needed)
  if (billingType === "A_ECHOIR") {
    const y = pStart.getUTCFullYear();
    const m = pStart.getUTCMonth();
    const day = periodIndex === 0 ? 15 : 1;
    return new Date(Date.UTC(y, m, day, 0, 0, 0));
  }
  // Fallback: keep end-of-period for terme échu if you use it
  // (or adapt to your own rule)
  return new Date(pStart);
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

    const frequency = (ct.billingFrequency as BillingFrequency) ?? "MONTHLY";
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

    // 4) Calendar periods (month/quarter/year)
    const periods = buildPeriods(start, end, frequency);
    if (!periods.length)
      throw new Error("No periods generated for given dates/frequency");

    // 4.bis) Prorata on extremities only (naturally happens because only first/last overlap partially)
    // Use overlap of period with the CONTRACT [start..end] — THIS is the core fix.
    const ratios = periods.map(({ pStart, pEnd }) => {
      const { ratio } = prorataForPeriod(pStart, pEnd, start, end);
      return ratio; // 0..1
    });

    // 5) Normalize weights
    const sum = ratios.reduce((a, b) => a + b, 0);
    if (sum <= 0) throw new Error("Invalid ratios (no overlap)");
    const norm = ratios.map((r) => r / sum);

    // 6) Split total by normalized weights (and fix cents)
    const amounts = splitAmountWithRounding(totalAmount, norm);

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

    // 9) Insert lines with requested due date rule
    type NewLine = typeof billingLines.$inferInsert;
    const lineValues: NewLine[] = periods.map(({ pStart, pEnd }, i) => ({
      scheduleId: schedule.id,
      sequenceNo: i + 1,
      dueDate: dueDateFirst15Then1st(pStart, i, billingType), // ⬅️ 15th for first, then 1st
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
