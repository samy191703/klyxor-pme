import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { BILLING_PERIODS } from "@/modules/contracts/domain/constants";
import { inferFormulaType } from "@/utils/indexation";
import type { CalculationResult } from "@/_dtos/calculate-results.dto";
import VarNumberEditor, {
  VariableNumberInput,
} from "../components/VarNumberEditor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Props = {
  data: any;
  setData: (upd: any) => void;
  indexationFormulas: Array<{ id: string; name: string; type?: string }>;
  onCalculate?: () => void;
  calcLoading?: boolean;
  calcResult?: CalculationResult | null;
  calcError?: string | null;
  contractId?: string | number;
};

export default function Step3Indexation({
  data,
  setData,
  indexationFormulas,
  onCalculate,
  calcLoading,
  calcResult,
  calcError,
  contractId,
}: Props) {
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    if (calcResult && !calcError && !calcLoading) {
      setIsEditing(false);
    }
  }, [calcResult, calcError, calcLoading]);

  const ensure = (patch: any) => setData({ ...data, ...patch });

  const hasFormula =
    data.indexationFormula && data.indexationFormula !== "none";
  const selected = hasFormula
    ? indexationFormulas.find((f) => f.id === data.indexationFormula)
    : null;
  const typeGuess = selected ? inferFormulaType(selected) : null;

  const fmtMoney = (n?: number) =>
    typeof n === "number"
      ? new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: data?.currency || "EUR",
        }).format(n)
      : "—";

  const fmtDate = (d?: string) =>
    d ? new Intl.DateTimeFormat("fr-FR").format(new Date(d)) : "—";

  const fmtMonth = (m?: string) => {
    if (!m) return "—";
    const [y, mm] = m.split("-");
    return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  // Setters for variable editors
  const setBaseAmountInput = (v: VariableNumberInput) =>
    ensure({ baseAmountInput: v });

  const setBaseIndex = (key: string, v: VariableNumberInput) =>
    ensure({
      baseIndices: {
        ...(data.baseIndices || {}),
        [key]: v,
      },
    });

  const effectiveCalcDate =
    data.indexationPolicy === "LAST_INDICE_VALUE"
      ? data.lastIndiceDate || data.indexationDate
      : data.indexationDate;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Étape 3 — Paramètres d'indexation
      </h2>

      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <Label>Formule d'indexation</Label>
          <Select
            value={data.indexationFormula || ""}
            onValueChange={(value) => {
              ensure({ indexationFormula: value });
              setIsEditing(true);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une formule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Pas d'indexation</SelectItem>
              {indexationFormulas.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} {f.type ? `- ${f.type}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Modifier les paramètres
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCalculate}
            disabled={!!calcLoading}
            title="Relancer le calcul avec les mêmes paramètres"
          >
            {calcLoading ? "Recalcul…" : "Recalculer"}
          </Button>
        </div>
      </div>

      {!hasFormula ? (
        <Alert>
          <AlertDescription>
            Aucune formule d'indexation sélectionnée. Le contrat n'aura pas
            d'indexation automatique.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {isEditing && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* Base amount P0 */}
                <VarNumberEditor
                  label="Montant de base P0 *"
                  value={data.baseAmountInput}
                  onChange={setBaseAmountInput}
                  effectiveDate={data.indexationDate}
                  currency={data.currency}
                  placeholder="50000"
                  showCurrency
                />

                {/* Indexation start date */}
                <div>
                  <Label>Date de première indexation *</Label>
                  <Input
                    type="date"
                    value={data.indexationDate || ""}
                    onChange={(e) => ensure({ indexationDate: e.target.value })}
                  />
                </div>

                {/* Frequency */}
                <div>
                  <Label>Fréquence d'indexation</Label>
                  <Select
                    value={data.indexationFrequency || "annual"}
                    onValueChange={(value) =>
                      ensure({ indexationFrequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Mode */}
                <div>
                  <Label>Mode *</Label>
                  <Select
                    value={
                      data.indexationMode ||
                      (typeGuess === "CPI_PN1" ? "PN1" : "P0")
                    }
                    onValueChange={(value) => ensure({ indexationMode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0</SelectItem>
                      <SelectItem value="PN1">PN1</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* <p className="text-xs text-gray-500 mt-1">
                    Dépend du type de formule (ex: CPI_PN1 ⇒ mode PN1).
                  </p> */}
                </div>

                {/* Policy (NEW ENUM) */}
                <div>
                  <Label>Policy de calcul *</Label>
                  <Select
                    value={data.indexationPolicy || "AT_PUBLICATION_DATE"}
                    onValueChange={(value) =>
                      ensure({ indexationPolicy: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AT_PUBLICATION_DATE">
                        Date d'indexation
                      </SelectItem>
                      <SelectItem value="LAST_INDICE_VALUE">
                        Date de prise d'indice personnalisée
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {/*   <p className="text-xs text-gray-500 mt-1">
                    Règle de choix des indices (publication ≤ date d’indexation,
                    ou dernière publication disponible).
                  </p> */}
                </div>

                {/* Custom take date only for LAST_INDICE_VALUE */}
                {data.indexationPolicy === "LAST_INDICE_VALUE" && (
                  <div className="">
                    <Label>Date de prise d'indice personnalisée *</Label>
                    <Input
                      type="date"
                      value={data.lastIndiceDate || ""}
                      onChange={(e) =>
                        ensure({ lastIndiceDate: e.target.value })
                      }
                    />
                    {/*  <p className="text-xs text-gray-500 mt-1">
                      Cette date sera envoyée comme <code>indexationDate</code>{" "}
                      au calcul pour ce mode.
                    </p> */}
                  </div>
                )}

                {/* Revision filter (NEW RADIO GROUP) */}
                <div className="col-span-2 flex justify-start gap-6 items-center my-4">
                  <Label>Révision</Label>
                  <RadioGroup
                    className="grid grid-cols-2 gap-3"
                    value={data.requireRevised ?? "R"}
                    onValueChange={(val) => ensure({ requireRevised: val })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="rev-R" value="R" />
                      <Label htmlFor="rev-R" className="cursor-pointer ">
                        Valeurs révisées uniquement
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="rev-P" value="P" />
                      <Label htmlFor="rev-P" className="cursor-pointer">
                        Autoriser les valeurs provisoires
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Type-specific base indices */}
                {typeGuess === "SIMPLE_ICHT" && (
                  <VarNumberEditor
                    label="ICHT0 *"
                    value={data.baseIndices?.ICHT0}
                    onChange={(v) => setBaseIndex("ICHT0", v)}
                    effectiveDate={data.indexationDate}
                    placeholder="128.72"
                  />
                )}

                {typeGuess === "MIXED_ICHT_FMOA" && (
                  <>
                    <VarNumberEditor
                      label="ICHT0 *"
                      value={data.baseIndices?.ICHT0}
                      onChange={(v) => setBaseIndex("ICHT0", v)}
                      effectiveDate={data.indexationDate}
                      placeholder="128.72"
                    />
                    <VarNumberEditor
                      label="FMOA0 *"
                      value={data.baseIndices?.FMOA0}
                      onChange={(v) => setBaseIndex("FMOA0", v)}
                      effectiveDate={data.indexationDate}
                      placeholder="102.37"
                    />
                  </>
                )}

                {typeGuess === "CPI_PN1" && (
                  <div>
                    <Label>PN1 (montant période N-1) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="52919.2"
                      value={data.PN1 || ""}
                      onChange={(e) => ensure({ PN1: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Obligatoire pour CPI PN1.
                    </p>
                  </div>
                )}

                {/* Cap/Floor */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cap (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="10"
                      value={data.capPercent ?? ""}
                      onChange={(e) => ensure({ capPercent: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Floor (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="-5"
                      value={data.floorPercent ?? ""}
                      onChange={(e) => ensure({ floorPercent: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={onCalculate}
                  disabled={!!calcLoading}
                >
                  {calcLoading ? "Calcul…" : "Pré-calculer l’indexation"}
                </Button>
                {calcResult && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    Voir le dernier résultat
                  </Button>
                )}
              </div>
              {calcError && (
                <p className="text-xs text-red-600 mt-1">{calcError}</p>
              )}
              <p className="text-xs text-gray-500">
                Le calcul utilisera la valeur{" "}
                <b>effective au {effectiveCalcDate || "—"}</b> pour P0 et les
                indices.
              </p>
            </>
          )}

          {/* ===== RESULTS ===== */}
          {!isEditing && (calcResult || calcLoading || calcError) && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-start">
                <h3 className="text-sm font-medium">Résultat du calcul</h3>
              </div>

              {calcError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800 text-sm">
                    {calcError}
                  </AlertDescription>
                </Alert>
              )}

              {calcResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border p-4 bg-white">
                      <div className="text-xs text-gray-500 mb-1">
                        Nouveau prix
                      </div>
                      <div className="text-2xl font-semibold">
                        {fmtMoney(calcResult.price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Effectif le {fmtDate(calcResult.effectiveFrom)}
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-white">
                      <div className="text-xs text-gray-500 mb-1">Facteur</div>
                      <div className="text-2xl font-semibold">
                        {typeof calcResult.factor === "number"
                          ? `× ${calcResult.factor.toFixed(4)}`
                          : typeof calcResult.rawFactor === "number"
                          ? `× ${calcResult.rawFactor.toFixed(4)}`
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-white">
                      <div className="text-xs text-gray-500 mb-1">
                        Statut du calcul
                      </div>
                      <div className="text-sm">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          {String(calcResult.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Indices utilisés */}
                  <div className="rounded-lg border p-4 bg-white">
                    <div className="text-sm font-medium mb-3">
                      Indices utilisés
                    </div>
                    {calcResult.indicesUsed &&
                    Object.keys(calcResult.indicesUsed).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(calcResult.indicesUsed).map(
                          ([series, row]) =>
                            row ? (
                              <div
                                key={series}
                                className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm"
                              >
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Série
                                  </div>
                                  <div>{series}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Mois
                                  </div>
                                  <div>{fmtMonth(row.month)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Valeur
                                  </div>
                                  <div>{row.value}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Publication
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-800">
                                      {row.status || "—"}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {row.updatedAt || "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : null
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Aucun détail d’indice.
                      </div>
                    )}
                  </div>

                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500">
                      Afficher le JSON
                    </summary>
                    <pre className="text-[11px] p-2 bg-gray-100 rounded overflow-x-auto mt-2">
                      {JSON.stringify(calcResult, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
