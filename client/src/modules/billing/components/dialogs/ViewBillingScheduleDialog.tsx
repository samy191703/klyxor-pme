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
import { AlertTriangle, EyeIcon, FilePlus, FileText, Loader2 } from "lucide-react";
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
      setLocalLines(schedule.lines);
    } else if (lines) {
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
        <DialogContent className="max-w-3xl h-[100vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-md bg-[#0F2A43] text-white font-semibold text-xs px-2 py-0.5 min-w-[24px]">
                V {version}
              </span>
              <DialogTitle className="text-lg font-semibold">
                Détails du Plan de facturation {contractNumber ?? ""}
              </DialogTitle>
            </div>
            <div className="text-sm text-gray-500">
              Créé le {formatDateFR(createdAt)}
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-0">
            <div className="grid gap-3">
              {/* First Row: 3 cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg border-l-4 border-[#C9A646] p-1 shadow-sm">

                  <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    PÉRIODE
                  </Label>
                  <p className="mt-1 font-bold text-gray-900 text-xs leading-tight">
                    {formatDateFR(startDate)} — {formatDateFR(endDate)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg border-l-4 border-[#C9A646] p-1 shadow-sm">

                  <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    FRÉQUENCE
                  </Label>
                  <p className="mt-1 font-bold text-gray-900 text-xs">
                    {frequencyLabel}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg border-l-4 border-[#C9A646] p-1 shadow-sm">

                  <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    PROGRESSION
                  </Label>
                  <div className="mt-1 flex flex-col gap-1">
                    <p className="font-bold text-gray-900 text-xs">
                      {progressionPercent} % of completion
                    </p>
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C9A646] rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, parseFloat(progressionPercent)))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Row: 3 cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg border-l-4 border-[#C9A646] p-1 shadow-sm">

                  <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    TYPE
                  </Label>
                  <p className="mt-1 font-bold text-gray-900 text-xs">
                    {billingTypeLabel}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg border-l-4 border-[#C9A646] p-1 shadow-sm">

                  <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    STATUT
                  </Label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${status === "active"
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

                <div className="bg-gray-50 rounded-lg border-l-4 border-[#C9A646] p-1 shadow-sm">

                  <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    PROCHAINE ÉCHÉANCE
                  </Label>
                  <p className="mt-1 font-bold text-gray-900 text-xs">
                    {(() => {
                      const next = getNextDueDate(lines);
                      return next ? formatDateFR(next.toISOString()) : "—";
                    })()}
                  </p>
                </div>
              </div>

              {/* Third Row: Financial summary - single card with 3 columns */}
              <div className="bg-gray-50 rounded-lg border-l-4 border-[#C9A646] p-1 shadow-sm">

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      TOTAL HT
                    </Label>
                    <p className="mt-1 font-bold text-gray-900 text-xs">
                      {formatMoneyEUR(totalHT)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      TAUX DE TVA APPLICABLE
                    </Label>
                    <p className="mt-1 font-bold text-gray-900 text-xs">
                      {tvaRate != null
                        ? `${(Number(tvaRate) * 100).toFixed(2)}%`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      MONTANT TTC
                    </Label>
                    <p className="mt-1 font-bold text-gray-900 text-xs">
                      {formatMoneyEUR(totalTTC)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Résumé indexation global basé sur la première ligne indexée */}
            {summaryResult && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-1">
                <div className="font-medium text-sm">
                  Pré-calcul d’indexation appliqué (prévisualisation)
                </div>
                <div>
                  Facteur&nbsp;
                  <b>{factor != null ? factor.toFixed(4) : "—"}</b>
                </div>
                <div>
                  Effectif le&nbsp;
                  <b>
                    {summaryResult.effectiveFrom
                      ? formatDateFR(summaryResult.effectiveFrom as any)
                      : "—"}
                  </b>
                </div>
                <div className="text-[11px] text-gray-500">
                  Les montants indexés par ligne sont calculés à partir de ce
                  contrat. Aucune modification n’est encore enregistrée.
                </div>
              </div>
            )}

            {idxError && <div className="text-xs text-red-600">{idxError}</div>}

            {localLines.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-600">Échéances</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrecalculateIndexation}
                    disabled={idxLoading}
                  >
                    {idxLoading
                      ? "Calcul…"
                      : "Pré-calculer l'indexation des lignes"}
                  </Button>
                </div>

                <div className="mt-2 rounded-md border">
                  <div className="max-h-[320px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b z-10">
                        <tr className="text-left">
                          <th className="px-3 py-2 w-[80px]">#</th>
                          <th className="px-3 py-2 w-[140px]">Échéance</th>
                          <th className="px-3 py-2 w-[140px]">Montant HT</th>
                          <th className="px-3 py-2 w-[140px]">Montant TTC</th>
                          <th className="px-3 py-2 w-[140px]">Montant TVA</th>
                          <th className="px-3 py-2 w-[160px]">Montant indexé</th>
                          <th className="px-3 py-2">Statut</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {localLines.map((ln: BillingLine) => {
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
                            <tr key={ln.id} className="border-b last:border-0 z-0">
                              <td className="px-3 py-2">{ln.sequenceNo}</td>
                              <td className="px-3 py-2">
                                {formatDateFR(ln.dueDate)}
                              </td>
                              <td className="px-3 py-2">
                                {formatMoneyEUR(rawAmount)}
                              </td>
                              <td className="px-3 py-2">
                                {formatMoneyEUR(ttcAmount)}
                              </td>
                              <td className="px-3 py-2">
                                {formatMoneyEUR(tvaAmount)}
                              </td>
                              <td className="px-3 py-2">
                                {indexedAmount != null
                                  ? formatMoneyEUR(indexedAmount)
                                  : "—"}
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                  {lineStatusLabel}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {ln.status === BillingLineStatus.A_FACTURER ? (
                                  <button
                                    className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleOpenInvoiceModal(ln)}
                                    disabled={generatingLineId === ln.id || loadingInvoice}
                                  >
                                    {generatingLineId === ln.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <FilePlus className="w-4 h-4" />
                                    )}
                                  </button>
                                ) : (
                                  <Tooltip title="Voir les détails">
                                    <IconButton
                                      size="small"
                                      onClick={() => (window.location.href = `/invoices?ln=${ln.id}`)}
                                      className="relative z-0" 
                                      style={{ position: 'sticky', right: 0 }} 
                                    >
                                      <EyeIcon className="w-4 h-4 mr-2" />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
