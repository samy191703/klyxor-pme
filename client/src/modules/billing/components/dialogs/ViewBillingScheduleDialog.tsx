// src/modules/billing/components/ViewBillingScheduleDialog.tsx
import { useState } from "react";
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
import type { BillingSchedule, BillingLine } from "../../domain/types";
import { formatDateFR, formatMoneyEUR } from "../../utils/formatters";
import {
  BILLING_STATUS_LABELS,
  BILLING_FREQUENCY_LABELS,
  BILLING_LINE_STATUS_LABELS,
} from "../../domain/constants";
import { BILLING_TYPE_LABELS } from "@shared/enums/billing.enum";

import type { Contract } from "@shared/schema";
import type { CalculateDto } from "@/_dtos/calculate-indexation.dto";
import type { CalculationResult } from "@/_dtos/calculate-results.dto";
import { getContract } from "@/services/contracts.api";
import { postIndexationPreview } from "@/services/indexation.api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule?: (BillingSchedule & { lines?: BillingLine[] }) | null;
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
}: Props) {
  if (!schedule) return null;

  const {
    contractId,
    contractNumber,
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
    if (!lines.length) {
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
      const promises = lines.map(async (ln) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-semibold">
              Détails du Plan de facturation
            </DialogTitle>
            <DialogDescription className="font-bold text-sm text-gray-700">
              {contractNumber ?? "—"}
            </DialogDescription>
          </div>
          <div className="text-sm text-gray-500">
            Créé le {formatDateFR(createdAt)}
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-600">Contrat</Label>
              <p className="font-medium text-gray-900">
                {contractNumber ?? "—"}
              </p>
            </div>
            <div>
              <Label className="text-gray-600">Période</Label>
              <p className="font-medium text-gray-900">
                {formatDateFR(startDate)} — {formatDateFR(endDate)}
              </p>
            </div>
            <div className="flex flex-col justify-start items-start gap-2">
              <Label className="text-gray-600">Statut</Label>
              <p className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {statusLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-600">Fréquence</Label>
              <p className="font-medium text-gray-900">{frequencyLabel}</p>
            </div>
            <div>
              <Label className="text-gray-600">Type</Label>
              <p className="font-medium text-gray-900">{billingTypeLabel}</p>
            </div>
            <div>
              <Label className="text-gray-600">Version</Label>
              <p className="font-medium text-gray-900">{version}</p>
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

          {lines.length > 0 && (
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
                    : "Pré-calculer l’indexation des lignes"}
                </Button>
              </div>

              <div className="mt-2 rounded-md border">
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr className="text-left">
                        <th className="px-3 py-2 w-[80px]">#</th>
                        <th className="px-3 py-2 w-[140px]">Échéance</th>
                        <th className="px-3 py-2 w-[140px]">Montant HT</th>
                        <th className="px-3 py-2 w-[160px]">Montant indexé</th>
                        <th className="px-3 py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((ln) => {
                        const rawAmount = Number(ln.amountHt || 0);
                        const res = lineResults[ln.id];
                        const indexedAmount =
                          res && typeof res.price === "number"
                            ? res.price
                            : null;

                        const lineStatusLabel =
                          BILLING_LINE_STATUS_LABELS[ln.status] ?? ln.status;

                        return (
                          <tr key={ln.id} className="border-b last:border-0">
                            <td className="px-3 py-2">{ln.sequenceNo}</td>
                            <td className="px-3 py-2">
                              {formatDateFR(ln.dueDate)}
                            </td>
                            <td className="px-3 py-2">
                              {formatMoneyEUR(rawAmount)}
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
  );
}

export default ViewBillingScheduleDialog;
