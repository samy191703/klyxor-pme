// src/modules/billing/components/ViewBillingScheduleDialog.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BillingSchedule, BillingLine } from "../../domain/types";
import { formatDateFR, formatMoneyEUR } from "../../utils/formatters";
import {
  BILLING_STATUS_LABELS,
  BILLING_FREQUENCY_LABELS,
  BILLING_LINE_STATUS_LABELS,
} from "../../domain/constants";
import { BILLING_TYPE_LABELS, BillingLineStatus } from "@shared/enums/billing.enum";

import type { Contract } from "@shared/schema";
import type { CalculateDto } from "@/_dtos/calculate-indexation.dto";
import type { CalculationResult } from "@/_dtos/calculate-results.dto";
import { getContract } from "@/services/contracts.api";
import { postIndexationPreview } from "@/services/indexation.api";
import { AlertTriangle, EyeIcon, FilePlus, FileText, Loader2, Calendar } from "lucide-react";
import { createInvoice } from "@/modules/invoices/api/invoice.api";
import { useToast } from "@/hooks/use-toast";
import { IconButton, Tooltip } from "@mui/material";
import { fetchBillingLinesBySchedule, fetchBillingSchedules, fetchBillingScheduleWithLines } from "../../api/billing.api";
import { PaymentTermsEnum } from "@/modules/invoices/domain/types";
import { queryClient } from "@/lib/queryClient";
import { BILLING_QK } from "../../domain/constants";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule?: (BillingSchedule & { lines?: BillingLine[] }) | null;
  onScheduleUpdate?: (schedule: BillingSchedule & { lines?: BillingLine[] }) => void;
};

// Couleur or/jaune fixe pour le design
const GOLD_COLOR = "#C9A646";

// --------- Helpers ---------

function toIsoDateString(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

/** 📈 Calculer la progression basée sur les dates (début/fin) */
function calculateProgression(
  startDate?: string | Date | null,
  endDate?: string | Date | null
): string {
  // Calcul basé sur le temps écoulé (dates)
  if (!startDate || !endDate) return "0.0";

  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Vérifier que les dates sont valides
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "0.0";

  // Si la date actuelle est avant le début, progression = 0%
  if (now < start) return "0.0";

  // Si la date actuelle est après la fin, progression = 100%
  if (now > end) return "100.0";

  // Calculer la progression
  const totalDuration = end.getTime() - start.getTime();
  const elapsedDuration = now.getTime() - start.getTime();

  if (totalDuration === 0) return "0.0";

  const progression = (elapsedDuration / totalDuration) * 100;
  return Math.min(100, Math.max(0, progression)).toFixed(1);
}

/** 📅 Retourne la prochaine échéance à venir (ou null s’il n’y en a pas) */
function getNextDueDate(lines?: BillingLine[]): Date | null {
  if (!lines || lines.length === 0) return null;

  const now = new Date();
  const futureDates = lines
    .map((ln: BillingLine) => new Date(ln.dueDate))
    .filter((date: Date) => !isNaN(date.getTime()) && date > now)
    .sort((a: Date, b: Date) => a.getTime() - b.getTime());

  return futureDates.length > 0 ? futureDates[0] : null;
}

/**
 * Construit CalculateDto à partir d'un contrat
 * Possibilité d'overrider P0 (montant de base) pour une ligne donnée.
 */
function buildCalculateFromContract(
  contract: Contract,
  opts?: { baseAmountOverride?: number }
): CalculateDto {
  // policy = règle de prise de date d'indice
  const policy: CalculateDto["policy"] =
    (contract.indexTakingDateRule as CalculateDto["policy"]) ??
    "AT_PUBLICATION_DATE";

  // date effective : indexTakingDate si LAST_INDICE_VALUE, sinon indexationDate
  const effectiveDateRaw =
    policy === "LAST_INDICE_VALUE"
      ? contract.indexTakingDate ?? contract.indexationDate
      : contract.indexationDate;

  const effectiveDateIso =
    toIsoDateString(effectiveDateRaw) ??
    toIsoDateString(contract.indexationDate) ??
    toIsoDateString(new Date())!;

  const baseAmountSeries: any =
    (contract.indexationBaseAmountSeries as any) || {};
  const baseIndicesValues: any =
    (contract.indexationBaseIndicesValues as any) || {};

  // P0: override par le montant d'échéance si fourni, sinon logique contrat
  const P0 =
    toNum(opts?.baseAmountOverride) ??
    toNum(baseAmountSeries.fixed) ??
    toNum(contract.indexationBaseAmount) ??
    toNum(contract.amount);

  // PN1: montant actuel indexé si présent (pour les formules PN1)
  const PN1 = toNum(contract.indexationCurrentAmount);

  const ICHT0 = toNum(baseIndicesValues.ICHT0);
  const FMOA0 = toNum(baseIndicesValues.FMOA0);

  const capPercent = toNum(contract.indexationCap) ?? null;
  const floorPercent = toNum(contract.indexationThreshold) ?? null;

  const dto: CalculateDto = {
    contractCode: contract.number,
    indexationDate: effectiveDateIso,
    policy,
    // requireRevised: (contract.requireRevised as "R" | "P") ?? "R",
    mode: (contract.calculationMode as "P0" | "PN1") || "P0",
    formulaType:
      (contract.indexationFormula as
        | "SIMPLE_ICHT"
        | "MIXED_ICHT_FMOA"
        | "CPI_PN1") || "SIMPLE_ICHT",
    base: {
      P0: P0,
      PN1: PN1,
      ICHT0: ICHT0,
      FMOA0: FMOA0,
    },
    // Pas de weights explicites pour l'instant
    weights: undefined,
    capPercent,
    floorPercent,
  };

  return dto;
}

export function ViewBillingScheduleDialog({
  open,
  onOpenChange,
  schedule,
  onScheduleUpdate,
}: Props) {
  if (!schedule) return null;

  const {
    contractId,
    contractNumber,
    tvaRate,
    startDate,
    endDate,
    frequency,
    billingType,
    version,
    status,
    createdAt,
    updatedAt,
    lines = [],
  } = schedule as BillingSchedule & {
    contractId?: string | number | null;
    lines?: BillingLine[];
  };

  const statusLabel = BILLING_STATUS_LABELS[status] ?? status;
  const frequencyLabel = BILLING_FREQUENCY_LABELS[frequency] ?? frequency;
  const billingTypeLabel = BILLING_TYPE_LABELS[billingType] ?? billingType;

  // ---------- LINES STATE (local state for refreshing) ----------
  const [localLines, setLocalLines] = useState<BillingLine[]>(lines);
  const [generatingLineId, setGeneratingLineId] = useState<string | null>(null);

  // Update local lines when schedule.lines changes or when schedule.id changes
  useEffect(() => {
    if (schedule?.lines) {
      console.log("📊 Schedule lines loaded:", schedule.lines.length, "lines");
      console.log("📅 First line dates:", schedule.lines[0] ? {
        billingStartDate: schedule.lines[0].billingStartDate,
        billingEndDate: schedule.lines[0].billingEndDate,
        invoiceDate: schedule.lines[0].invoiceDate,
      } : "No lines");
      setLocalLines(schedule.lines);
    } else if (lines) {
      console.log("📊 Lines loaded:", lines.length, "lines");
      console.log("📅 First line dates:", lines[0] ? {
        billingStartDate: lines[0].billingStartDate,
        billingEndDate: lines[0].billingEndDate,
        invoiceDate: lines[0].invoiceDate,
      } : "No lines");
      setLocalLines(lines);
    }
  }, [lines, schedule?.lines, schedule?.id]);

  // ---------- INDEXATION STATE ----------
  const [idxLoading, setIdxLoading] = useState(false);
  const [idxError, setIdxError] = useState<string | null>(null);
  const [lineResults, setLineResults] = useState<
    Record<string, CalculationResult | null>
  >({});

  // Résumé = premier résultat non nul (pour afficher facteur + effectiveFrom)
  const summaryResult = Object.values(lineResults).find(
    (r): r is CalculationResult => !!r
  );

  const factor: number | null =
    summaryResult && typeof summaryResult.factor === "number"
      ? summaryResult.factor
      : summaryResult && typeof summaryResult.rawFactor === "number"
        ? summaryResult.rawFactor
        : null;

  const handlePrecalculateIndexation = async () => {
    if (!contractId) {
      setIdxError("Aucun contrat associé à ce plan de facturation.");
      return;
    }
    if (!localLines.length) {
      setIdxError("Aucune échéance à indexer.");
      return;
    }

    try {
      setIdxLoading(true);
      setIdxError(null);
      setLineResults({});

      // 1) Charger le contrat
      const contract = (await getContract(String(contractId))) as Contract;

      // 1.b) Vérifier si l'indexation est activée sur le contrat
      if (!contract.indexationEnabled) {
        setIdxError("Aucune indexation n'est attachée au contrat !");
        return;
      }

      // 2) Pour chaque ligne, construire un payload dédié avec P0 = montant de l'échéance
      const promises = localLines.map(async (ln: BillingLine) => {
        const rawAmount = Number(ln.amountHt || 0);
        const dto = buildCalculateFromContract(contract, {
          baseAmountOverride: rawAmount,
        });

        try {
          const res = await postIndexationPreview(dto);
          return { lineId: ln.id, result: res as CalculationResult | null };
        } catch {
          // En cas d'erreur sur une ligne, on renvoie null pour celle-ci
          return { lineId: ln.id, result: null };
        }
      });

      const results = await Promise.all(promises);

      const map: Record<string, CalculationResult | null> = {};
      results.forEach(({ lineId, result }) => {
        map[lineId] = result;
      });
      setLineResults(map);
    } catch (e: any) {
      setIdxError(
        e?.message || "Erreur lors du pré-calcul d’indexation des échéances."
      );
      setLineResults({});
    } finally {
      setIdxLoading(false);
    }
  };

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<BillingLine | null>(null);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermsEnum | null>(null);

  const progressionPercent = calculateProgression(startDate, endDate);

  const totalHT = lines.reduce(
    (sum: number, ln: BillingLine) => sum + Number(ln.amountHt || 0),
    0
  );

  const tvaRateValue = Number(tvaRate ?? 0);
  const totalTVA = totalHT * tvaRateValue;
  const totalTTC = totalHT + totalTVA;


  const handleOpenInvoiceModal = (line: BillingLine) => {
    setSelectedLine(line);
    setDueDate(line.dueDate);
    setDescription("");
    setInvoiceModalOpen(true);
  }

  const formatForDateInput = (date: string | Date) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  const { toast } = useToast();

  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const handleGenerateInvoice = async () => {
    if (!selectedLine || !contractId || !schedule?.id) return;

    try {
      setLoadingInvoice(true);
      setGeneratingLineId(selectedLine.id);

      const dueDateParts = dueDate.split("-");
      const dueDateISO = new Date(
        Number(dueDateParts[0]),
        Number(dueDateParts[1]) - 1,
        Number(dueDateParts[2]),
        12, 0, 0, 0
      ).toISOString();

      const payload = {
        contractId,
        billingLineId: selectedLine.id,
        description,
        paymentTerms,
        dueDate: dueDateISO,
      };

      await createInvoice(payload);

      toast({
        title: "Facture générée",
        description: "La facture a été générée avec succès.",
      });

      // Invalider les queries React Query pour rafraîchir les données
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: BILLING_QK.schedules.lines(schedule.id),
        }),
        queryClient.invalidateQueries({
          queryKey: BILLING_QK.schedules.detail(schedule.id),
        }),
        queryClient.invalidateQueries({
          queryKey: BILLING_QK.lines.detail(selectedLine.id),
        }),
      ]);

      // Rafraîchir le schedule complet depuis l'API /api/billing-schedules/{id}
      try {
        const refreshedSchedule = await fetchBillingScheduleWithLines(schedule.id);

        // Mettre à jour les lignes localement
        if (refreshedSchedule.lines) {
          setLocalLines(refreshedSchedule.lines);
        }

        // Notifier le parent pour qu'il mette à jour son état
        if (onScheduleUpdate) {
          onScheduleUpdate(refreshedSchedule);
        }
      } catch (refreshError) {
        console.error("Erreur lors du rafraîchissement du schedule:", refreshError);
        // En cas d'erreur, on essaie quand même de rafraîchir juste les lignes
        try {
          const refreshedLines = await fetchBillingLinesBySchedule(schedule.id);
          setLocalLines(refreshedLines);
        } catch (lineError) {
          console.error("Erreur lors du rafraîchissement des lignes:", lineError);
        }
      }

      setInvoiceModalOpen(false);
    } catch (err: any) {
      console.error("Erreur lors de createInvoice :", err);

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Erreur lors de la génération de la facture";

      toast({
        title: "Erreur",
        description: msg,
      });
    } finally {
      setLoadingInvoice(false);
      setGeneratingLineId(null);
    }
  };


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          {/* Header fixe */}
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
            <div className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-md bg-[#0F2A43] text-white font-semibold text-xs px-2 py-0.5 min-w-[24px]">
                  V {version}
                </span>
                <DialogTitle className="text-lg font-semibold">
                  <span className="text-gray-900">Détails du Plan de facturation </span>
                  <span style={{ color: GOLD_COLOR }}>{contractNumber ?? ""}</span>
                </DialogTitle>
              </div>
              <div className="text-sm text-gray-500">
                Créé le {formatDateFR(createdAt)}
              </div>
            </div>
          </DialogHeader>

          {/* Section informations fixe */}
          <div className="flex-shrink-0 px-6 py-4 space-y-3 bg-white border-b border-gray-200">
            {/* Summary Cards Section - 3x3 Grid */}
            {/* First Row: 3 cards */}
            <div className="grid grid-cols-3 gap-2">
              {/* PÉRIODE Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  PÉRIODE
                </Label>
                <p className="text-[11px] font-bold text-gray-900 leading-tight">
                  {formatDateFR(startDate)} — {formatDateFR(endDate)}
                </p>
              </div>

              {/* FRÉQUENCE Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  FRÉQUENCE
                </Label>
                <p className="text-[11px] font-bold text-gray-900">
                  {frequencyLabel}
                </p>
              </div>

              {/* PROGRESSION Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  PROGRESSION
                </Label>
                <p className="text-[11px] font-bold text-gray-900 mb-1">
                  {progressionPercent}% of completion
                </p>
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, Math.max(0, parseFloat(progressionPercent)))}%`,
                      backgroundColor: GOLD_COLOR
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Second Row: 3 cards */}
            <div className="grid grid-cols-3 gap-2">
              {/* TYPE Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  TYPE
                </Label>
                <p className="text-[11px] font-bold text-gray-900">
                  {billingTypeLabel}
                </p>
              </div>

              {/* STATUT Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  STATUT
                </Label>
                <div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
                    status === "active"
                      ? "bg-green-600"
                      : status === "draft"
                        ? "bg-gray-500"
                        : "bg-gray-400"
                  }`}>
                    <span className="w-1 h-1 bg-white rounded-full"></span>
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* PROCHAINE ÉCHÉANCE Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  PROCHAINE ÉCHÉANCE
                </Label>
                <p className="text-[11px] font-bold text-gray-900">
                  {(() => {
                    const next = getNextDueDate(lines);
                    return next ? formatDateFR(next.toISOString()) : "—";
                  })()}
                </p>
              </div>
            </div>

            {/* Third Row: 3 cards - Financial Summary */}
            <div className="grid grid-cols-3 gap-2">
              {/* TOTAL HT Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  TOTAL HT
                </Label>
                <p className="text-[11px] font-bold text-gray-900">
                  {formatMoneyEUR(totalHT)}
                </p>
              </div>

              {/* TAUX DE TVA Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  TAUX DE TVA APPLICABLE
                </Label>
                <p className="text-[11px] font-bold text-gray-900">
                  {tvaRate != null
                    ? `${(Number(tvaRate) * 100).toFixed(2)}%`
                    : "—"}
                </p>
              </div>

              {/* MONTANT TTC Card */}
              <div className="bg-gray-50 rounded-lg shadow-sm p-2.5" style={{ borderLeft: `4px solid ${GOLD_COLOR}` }}>
                <Label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  MONTANT TTC
                </Label>
                <p className="text-[11px] font-bold text-gray-900">
                  {formatMoneyEUR(totalTTC)}
                </p>
              </div>
            </div>
            {/* Résumé indexation global basé sur la première ligne indexée */}
            {summaryResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="font-semibold text-xs text-blue-900">
                  Pré-calcul d'indexation appliqué (prévisualisation)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] font-medium text-blue-700 uppercase tracking-wide">Facteur</span>
                    <p className="text-xs font-bold text-blue-900 mt-1">
                      {factor != null ? factor.toFixed(4) : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-medium text-blue-700 uppercase tracking-wide">Effectif le</span>
                    <p className="text-xs font-bold text-blue-900 mt-1">
                      {summaryResult.effectiveFrom
                        ? formatDateFR(summaryResult.effectiveFrom as any)
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-blue-700 pt-1 border-t border-blue-200">
                  Les montants indexés par ligne sont calculés à partir de ce contrat. Aucune modification n'est encore enregistrée.
                </div>
              </div>
            )}

            {idxError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-medium text-red-800">{idxError}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section Échéances scrollable */}
          {localLines.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
              {/* Header section Échéances - fixe */}
              <div className="flex-shrink-0 flex items-center justify-between pb-3">
                <h3 className="text-sm font-bold text-gray-900">Échéances</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrecalculateIndexation}
                  disabled={idxLoading}
                  className="text-[10px] font-medium h-7 px-2"
                >
                  {idxLoading
                    ? "Calcul…"
                    : "Pré-calculer l'indexation des lignes"}
                </Button>
              </div>

              {/* Table scrollable */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-h-0">
                <div className="h-full overflow-y-auto overflow-x-auto relative">
                    <table className="w-full text-xs border-collapse relative" style={{ tableLayout: 'auto' }}>
                      <thead className="sticky top-0 bg-gray-50 border-b-2 border-gray-200 z-10">
                        <tr className="text-left">
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-[100] min-w-[40px] border-r border-gray-200">
                            #
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[160px]">
                            Période facturée
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[100px]">
                            Échéance
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider text-right min-w-[110px]">
                            Montant HT
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider text-right min-w-[110px]">
                            Montant TTC
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider text-right min-w-[110px]">
                            Montant TVA
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider text-right min-w-[120px]">
                            Montant indexé
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[100px]">
                            Date facture
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[90px]">
                            Statut
                          </th>
                          <th className="px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider text-center min-w-[80px] sticky right-0 bg-gray-50 z-[100] border-l border-gray-200">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {localLines.map((ln: BillingLine) => {
                          // Debug: Vérifier les dates
                          if (!ln.billingStartDate || !ln.billingEndDate) {
                            console.log("⚠️ BillingLine sans dates:", {
                              id: ln.id,
                              sequenceNo: ln.sequenceNo,
                              billingStartDate: ln.billingStartDate,
                              billingEndDate: ln.billingEndDate,
                              invoiceDate: ln.invoiceDate,
                              fullLine: ln
                            });
                          }

                          const rawAmount = Number(ln.amountHt || 0);
                          const res = lineResults[ln.id];
                          const indexedAmount =
                            res && typeof res.price === "number"
                              ? res.price
                              : null;

                          const lineStatusLabel =
                            (BILLING_LINE_STATUS_LABELS[ln.status as keyof typeof BILLING_LINE_STATUS_LABELS] ?? ln.status) as string;

                          // Calculate TVA and TTC
                          const tvaRateValue = Number(tvaRate ?? 0);
                          const tvaAmount = rawAmount * tvaRateValue;
                          const ttcAmount = rawAmount + tvaAmount;

                          return (
                            <tr key={ln.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                              <td className="px-2 py-2 font-bold text-gray-900 sticky left-0 bg-white z-[90] border-r border-gray-100 text-xs">
                                {ln.sequenceNo}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700">
                                {ln.billingStartDate && ln.billingEndDate ? (
                                  (() => {
                                    const startDate = new Date(ln.billingStartDate).toDateString();
                                    const endDate = new Date(ln.billingEndDate).toDateString();
                                    const isSameDate = startDate === endDate;
                                    return (
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                        <span className="font-medium whitespace-nowrap">
                                          {isSameDate 
                                            ? formatDateFR(ln.billingStartDate)
                                            : `${formatDateFR(ln.billingStartDate)} → ${formatDateFR(ln.billingEndDate)}`
                                          }
                                        </span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                <div className="font-semibold text-gray-900 text-xs">
                                  {formatDateFR(ln.dueDate)}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <span className="font-bold text-gray-900 text-xs">
                                  {formatMoneyEUR(rawAmount)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <span className="font-semibold text-gray-900 text-xs">
                                  {formatMoneyEUR(ttcAmount)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <span className="font-medium text-gray-700 text-xs">
                                  {formatMoneyEUR(tvaAmount)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right">
                                {indexedAmount != null ? (
                                  <span className="font-bold text-blue-700 text-xs">
                                    {formatMoneyEUR(indexedAmount)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {ln.invoiceDate ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-50 text-green-700 font-medium text-[10px] border border-green-200">
                                    <FileText className="h-3 w-3" />
                                    {formatDateFR(ln.invoiceDate)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  ln.status === "FACTUREE" 
                                    ? "bg-green-100 text-green-800 border border-green-300" 
                                    : "bg-amber-100 text-amber-800 border border-amber-300"
                                }`}>
                                  {lineStatusLabel}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center sticky right-0 bg-white z-[90] border-l border-gray-100">
                                {ln.status === BillingLineStatus.A_FACTURER ? (
                                  <button
                                    className="inline-flex items-center justify-center rounded-md bg-green-600 hover:bg-green-700 text-white px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleOpenInvoiceModal(ln)}
                                    disabled={generatingLineId === ln.id || loadingInvoice}
                                  >
                                    {generatingLineId === ln.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <FilePlus className="w-3 h-3" />
                                    )}
                                  </button>
                                ) : (
                                  <Tooltip title="Voir les détails">
                                    <IconButton
                                      size="small"
                                      onClick={() => (window.location.href = `/invoices?ln=${ln.id}`)}
                                      className="text-gray-600 hover:text-gray-900"
                                      sx={{ padding: '4px' }}
                                    >
                                      <EyeIcon className="w-3.5 h-3.5" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          {/* Footer fixe */}
          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-4 py-1.5 text-xs font-medium"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de génération de facture */}
      {invoiceModalOpen && selectedLine && (
        <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Générer une facture du contrat:</DialogTitle>
              <DialogDescription> <b>{contractNumber ?? "—"}</b> </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 mt-4">

              <div>
                <Label className="text-gray-700">Date d'échéance</Label>

                <input
                  type="date"
                  value={formatForDateInput(dueDate)}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-2"
                />
              </div>

              <div>
                <Label className="text-gray-700">Description</Label>

                <textarea
                  rows={3}
                  className="mt-1 w-full border rounded px-2 py-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ajouter une description..."
                />
              </div>

              <div>
                <Label className="text-gray-700">Conditions de paiement</Label>
                <select
                  className="mt-1 w-full border rounded px-2 py-2"
                  value={paymentTerms ?? ""}
                  onChange={(e) => setPaymentTerms(e.target.value as PaymentTermsEnum)}
                >
                  <option value="">-- Sélectionner --</option>
                  {Object.values(PaymentTermsEnum).map((pt) => (
                    <option key={pt} value={pt}>
                      {pt.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>
                Annuler
              </Button>

              <Button
                onClick={handleGenerateInvoice}
                disabled={loadingInvoice} // désactive le bouton pendant le traitement
                className="flex items-center gap-2"
              >
                {loadingInvoice && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                )}
                Générer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default ViewBillingScheduleDialog;
