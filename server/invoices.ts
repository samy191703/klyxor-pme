// server/storage/invoices.ts

import { db } from "../db";
import { invoices, billingLines, billingSchedules } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Charge une facture + la ligne + l'échéancier (période de facturation)
 */
export async function getInvoiceByIdWithDetails(id: string) {
  const [row] = await db
    .select({
      // champs principaux de la facture
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      type: invoices.type,
      status: invoices.status,
      dueDate: invoices.dueDate,
      generatedAt: invoices.generatedAt,
      baseAmount: invoices.baseAmount,
      amount: invoices.amount,
      vatRate: invoices.vatRate,
      vatAmount: invoices.vatAmount,
      redactionAmount: invoices.redactionAmount,
      totalAmount: invoices.totalAmount,
      contractId: invoices.contractId,
      contractNumber: invoices.contractNumber,
      clientId: invoices.clientId,
      clientName: invoices.clientName,
      billingLineId: invoices.billingLineId,

      // ligne de facturation
      lineId: billingLines.id,
      lineDueDate: billingLines.dueDate,
      lineAmountHt: billingLines.amountHt,
      scheduleId: billingLines.scheduleId,

      // 🆕 période de facturation (échéancier)
      billingPeriodStart: billingSchedules.startDate,
      billingPeriodEnd: billingSchedules.endDate,
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