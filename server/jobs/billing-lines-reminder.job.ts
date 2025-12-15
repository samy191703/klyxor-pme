// server/jobs/billing-lines-reminder.job.ts
import { db } from "server/db";
import {
  billingLines,
  billingSchedules,
  contracts,
  alerts,
} from "@shared/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

const ALERT_TYPE = "billing_line_due_soon"; // free text, consistent with your conventions
const ALERT_CATEGORY = "billing";
const ALERT_SEVERITY = "warning";

// small helper
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffInDays(a: Date, b: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / msPerDay);
}

export async function runBillingLinesReminderJob() {
  const now = new Date();
  const windowEnd = addDays(now, 7); // échéances dans les 7 prochains jours

  // 1) Récupérer les billing_lines à facturer dans la fenêtre [now, now+7j]
  //    et qui n'ont pas déjà une alerte pour cette ligne.
  const lines = await db
    .select({
      lineId: billingLines.id,
      dueDate: billingLines.dueDate,
      amountHt: billingLines.amountHt,
      contractId: contracts.id,
      contractNumber: contracts.number,
      contractTitle: contracts.title,
      createdBy: contracts.createdBy,
    })
    .from(billingLines)
    .innerJoin(
      billingSchedules,
      eq(billingLines.scheduleId, billingSchedules.id)
    )
    .innerJoin(contracts, eq(billingSchedules.contractId, contracts.id))
    .where(
      and(
        eq(billingLines.status, "A_FACTURER"),
        gte(billingLines.dueDate, now),
        lte(billingLines.dueDate, windowEnd),
        // éviter de recréer des alertes sur la même ligne
        sql`NOT EXISTS (
          SELECT 1 FROM ${alerts} a
          WHERE a.reference_id = ${billingLines.id}
            AND a.type = ${ALERT_TYPE}
        )`
      )
    );

  if (!lines.length) {
    console.log(
      `[BillingLinesReminder] no upcoming billing lines in next 7 days (${now.toISOString()})`
    );
    return;
  }

  // 2) Construire les alertes
  const alertRows = lines.map((row) => {
    const daysRemaining = diffInDays(row.dueDate!, now);

    const title = `Échéance de facturation dans ${daysRemaining} jour${
      daysRemaining > 1 ? "s" : ""
    }`;
    const message = [
      `Une ligne de facturation arrive à échéance.`,
      `Contrat : ${row.contractNumber} - ${row.contractTitle ?? ""}`,
      `Montant HT : ${row.amountHt?.toString() ?? "—"}`,
      `Date d’échéance : ${row.dueDate?.toISOString().slice(0, 10)}`,
    ].join(" | ");

    return {
      type: ALERT_TYPE,
      severity: ALERT_SEVERITY,
      category: ALERT_CATEGORY,
      title,
      message,
      contractNumber: row.contractNumber,
      sendStatus: "pending", // pour ton moteur de notif
      readStatus: false,
      channel: "in-app",
      userId: row.createdBy, // tu pourras plus tard cibler un user spécifique
      referenceId: row.lineId, // pour éviter les doublons
    };
  });

  await db.insert(alerts).values(alertRows);

  console.log(
    `[BillingLinesReminder] created ${alertRows.length} alerts for upcoming billing lines`
  );
}
