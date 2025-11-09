import { BILLING_TYPE_LABELS } from "@shared/enums/billing.enum";
import {
  BILLING_FREQUENCY_LABELS,
  BILLING_LINE_STATUS_LABELS,
  BILLING_STATUS_LABELS,
} from "../domain/constants";
import { BillingSchedule, BillingLine } from "../domain/types";
import { formatDateFR } from "./formatters";
import * as XLSX from "xlsx";

/**
 * Exporte un échéancier complet (plan + lignes) vers Excel.
 * Les valeurs d’enum sont converties en labels lisibles.
 */
export function exportBillingScheduleToExcel(
  data: BillingSchedule & { lines?: BillingLine[] }
) {
  // --- Sheet 1: Informations de l’échéancier ---
  const scheduleSheetData: (string | number | null)[][] = [
    ["Contrat", data.contractNumber ?? data.contractId],
    [
      "Période",
      `${formatDateFR(data.startDate)} → ${formatDateFR(data.endDate)}`,
    ],
    ["Fréquence", BILLING_FREQUENCY_LABELS[data.frequency] ?? data.frequency],
    ["Type", BILLING_TYPE_LABELS[data.billingType] ?? data.billingType],
    ["Version", data.version],
    ["Statut", BILLING_STATUS_LABELS[data.status] ?? data.status],
    ["Créé le", formatDateFR(data.createdAt)],
  ];

  const wsSchedule = XLSX.utils.aoa_to_sheet(scheduleSheetData);

  // --- Sheet 2: Lignes d’échéance ---
  const linesHeader = ["#", "Date d’échéance", "Montant HT", "Statut"];
  let linesRows: (string | number | null)[][] = [];

  if (data.lines && data.lines.length > 0) {
    linesRows = data.lines.map((ln) => [
      ln.sequenceNo,
      formatDateFR(ln.dueDate),
      Number(ln.amountHt),
      BILLING_LINE_STATUS_LABELS[ln.status] ?? ln.status,
    ]);
  }

  const wsLines = XLSX.utils.aoa_to_sheet([linesHeader, ...linesRows]);

  // --- Workbook ---
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSchedule, "Échéancier");
  XLSX.utils.book_append_sheet(wb, wsLines, "Échéances");

  // --- Nom du fichier ---
  const rawContractNumber =
    data.contractNumber || data.contractId || "plan_facturation";
  const baseFilename = `echeancier_${rawContractNumber}_v${data.version}.xlsx`;

  XLSX.writeFile(wb, baseFilename);
}

/**
 * Exporte la liste des échéanciers vers Excel.
 * Les valeurs d’enum sont converties en labels lisibles.
 */
export function exportBillingSchedulesListToExcel(
  schedules: BillingSchedule[]
) {
  if (!schedules.length) return;

  const header = [
    "Contrat",
    "Début",
    "Fin",
    "Fréquence",
    "Type",
    "Version",
    "Statut",
    "Créé le",
  ];

  const rows = schedules.map((s) => [
    s.contractNumber ?? s.contractId,
    formatDateFR(s.startDate),
    formatDateFR(s.endDate),
    BILLING_FREQUENCY_LABELS[s.frequency] ?? s.frequency,
    BILLING_TYPE_LABELS[s.billingType] ?? s.billingType,
    s.version,
    BILLING_STATUS_LABELS[s.status] ?? s.status,
    formatDateFR(s.createdAt),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plans");

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `export_echeanciers_${stamp}.xlsx`;

  XLSX.writeFile(wb, filename);
}
