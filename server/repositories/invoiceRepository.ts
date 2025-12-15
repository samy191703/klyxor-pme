// server/repositories/invoiceRepository.ts

import { db } from "../db";
import { invoices, billingLines, billingSchedules } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function getInvoiceByIdWithPeriod(id: string) {
  const [row] = await db
    .select({
      id: invoices.id,
      contractId: invoices.contractId,
      invoiceNumber: invoices.invoiceNumber,
      type: invoices.type,
      billingLineId: invoices.billingLineId,
      description: invoices.description,
      baseAmount: invoices.baseAmount,
      amount: invoices.amount,
      vatRate: invoices.vatRate,
      vatAmount: invoices.vatAmount,
      redactionAmount: invoices.redactionAmount,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      dueDate: invoices.dueDate,
      generatedAt: invoices.generatedAt,
      generatedBy: invoices.generatedBy,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      contractNumber: invoices.contractNumber,
      clientName: invoices.clientName,

      // ligne
      lineId: billingLines.id,
      lineDueDate: billingLines.dueDate,
      lineAmountHt: billingLines.amountHt,

      // 🆕 échéancier : période de facturation
      // ⚠️ ADAPTE ICI les noms des colonnes !!!
      billingPeriodStart: billingSchedules.periodStartDate, // ex: periodStartDate ou period_start
      billingPeriodEnd: billingSchedules.periodEndDate,     // ex: periodEndDate ou period_end
    })
    .from(invoices)
    .leftJoin(billingLines, eq(billingLines.id, invoices.billingLineId))
    .leftJoin(
      billingSchedules,
      eq(billingSchedules.id, billingLines.scheduleId)
    )
    .where(eq(invoices.id, id));

  return row ?? null;
}
