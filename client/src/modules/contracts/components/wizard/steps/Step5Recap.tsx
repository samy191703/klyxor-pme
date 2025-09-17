// components/wizard/steps/Step5Recap.tsx
import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { BILLING_PERIODS } from "@/modules/contracts/domain/constants";
import { inferFormulaType } from "@/utils/indexation";

type Props = {
  data: any;
  calcLoading?: boolean;
  calcError?: string | null;
  calcResult?: any;
  contractId?: string | number;
};

export default function Step5Recap({
  data,
  calcLoading,
  calcError,
  calcResult,
  contractId,
}: Props) {
  const currency = data?.currency || "EUR";
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
      n ?? 0
    );
  const fmtDate = (d?: string) =>
    d ? new Intl.DateTimeFormat("fr-FR").format(new Date(d)) : "—";

  const total = useMemo(() => {
    const toNum = (v: any) =>
      v === "" || v == null ? 0 : parseFloat(String(v).replace(",", "."));
    return toNum(data.fixedAmount) + toNum(data.variableAmount);
  }, [data.fixedAmount, data.variableAmount]);

  const billingLabel =
    BILLING_PERIODS.find(
      (p) => p.value === (data.billingPeriod || data.billingFrequency)
    )?.label || "—";

  // Indexation
  const hasFormula =
    data?.indexationFormula && data.indexationFormula !== "none";
  const typeGuess =
    hasFormula && data?.__formulas
      ? inferFormulaType(
          (data.__formulas as any[]).find(
            (f) => f.id === data.indexationFormula
          )
        )
      : null;

  // Checklist de validation
  const missing: string[] = [];
  const require = (ok: any, label: string) => {
    if (!ok && !missing.includes(label)) missing.push(label);
  };

  require(!!data.number, "N° contrat");
  require(!!data.title, "Titre/SPV");
  require(!!data.clientName, "Nom du client");
  require(!!data.type, "Type");
  require(!!data.businessUnit, "BU/Entité");
  require(!!data.startDate, "Date début");
  require(!!data.endDate, "Date fin");

  if (hasFormula) {
    require(!!data.indexationDate, "Date de première indexation");
    // Champs conditionnels selon le type de formule
    if (typeGuess === "SIMPLE_ICHT") {
      require(data.indexationBaseAmount ??
        data.fixedAmount, "Montant de base (P0)");
      require(!!data.ICHT0, "ICHT0");
    } else if (typeGuess === "MIXED_ICHT_FMOA") {
      require(data.indexationBaseAmount ??
        data.fixedAmount, "Montant de base (P0)");
      require(!!data.ICHT0, "ICHT0");
      require(!!data.FMOA0, "FMOA0");
    } else if (typeGuess === "CPI_PN1") {
      require(!!data.PN1, "PN1 (montant période N-1)");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Étape 5 — Récapitulatif &amp; soumission
      </h2>

      {/* Checklist */}
      {missing.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">
              Champs à compléter avant soumission :
            </div>
            <ul className="list-disc list-inside text-sm">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Bloc : Informations générales */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-medium">Informations générales</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>N° contrat : {data.number || "—"}</div>
          <div>Titre : {data.title || "—"}</div>
          <div>Client : {data.clientName || "—"}</div>
          <div>Type : {data.type || "—"}</div>
          <div>BU : {data.businessUnit || "—"}</div>
          <div>Devise : {currency}</div>
          <div>Langue : {data.language || "FR"}</div>
        </div>
      </div>

      {/* Bloc : Période & montants */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-medium">Période &amp; montants</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Date début : {fmtDate(data.startDate)}</div>
          <div>Date fin : {fmtDate(data.endDate)}</div>
          <div>Périodicité de facturation : {billingLabel}</div>
          <div>Type de paiement : {data.paymentType || "—"}</div>
          <div>Montant fixe : {fmtMoney(Number(data.fixedAmount || 0))}</div>
          <div>
            Montant variable : {fmtMoney(Number(data.variableAmount || 0))}
          </div>
          <div className="col-span-2">
            <strong>Total : {fmtMoney(total)}</strong>
          </div>
        </div>

        {/* Champs Energie si présents */}
        {(data.type === "electricity" || data.type === "renewable_ppa") && (
          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
            <div>
              Prod. annuelle max (MWh) : {data.maxAnnualProduction ?? "—"}
            </div>
            <div>Nb d’éoliennes : {data.numberOfTurbines ?? "—"}</div>
            <div>
              Prix / MWh :{" "}
              {data.pricePerMWh ? fmtMoney(Number(data.pricePerMWh)) : "—"}
            </div>
          </div>
        )}
      </div>

      {/* Bloc : Indexation */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-medium">Indexation</h3>
        {hasFormula ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Formule : {String(data.indexationFormula)}</div>
            <div>Type (déduit) : {typeGuess || "—"}</div>
            <div>Date 1ère indexation : {fmtDate(data.indexationDate)}</div>
            <div>Fréquence : {data.indexationFrequency || "annual"}</div>
            <div>Policy : {data.indexationPolicy || "AT_INDEXATION_DATE"}</div>
            <div>
              Mode :{" "}
              {data.indexationMode || (typeGuess === "CPI_PN1" ? "PN1" : "P0")}
            </div>

            {/* Bases */}
            {typeGuess === "SIMPLE_ICHT" && (
              <>
                <div>
                  Montant base (P0) :{" "}
                  {fmtMoney(
                    Number(data.indexationBaseAmount ?? data.fixedAmount ?? 0)
                  )}
                </div>
                <div>ICHT0 : {data.ICHT0 ?? "—"}</div>
              </>
            )}
            {typeGuess === "MIXED_ICHT_FMOA" && (
              <>
                <div>
                  Montant base (P0) :{" "}
                  {fmtMoney(
                    Number(data.indexationBaseAmount ?? data.fixedAmount ?? 0)
                  )}
                </div>
                <div>ICHT0 : {data.ICHT0 ?? "—"}</div>
                <div>FMOA0 : {data.FMOA0 ?? "—"}</div>
                <div>
                  Poids const. : {(data.weights?.const ?? "—").toString()}
                </div>
                <div>Poids ICHT : {(data.weights?.ICHT ?? "—").toString()}</div>
                <div>Poids FMOA : {(data.weights?.FMOA ?? "—").toString()}</div>
              </>
            )}
            {typeGuess === "CPI_PN1" && (
              <div>PN1 : {fmtMoney(Number(data.PN1 ?? 0))}</div>
            )}

            {/* Cap / Floor */}
            <div>Cap (%) : {data.capPercent ?? "—"}</div>
            <div>Floor (%) : {data.floorPercent ?? "—"}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Pas d’indexation configurée.
          </div>
        )}
      </div>

      {/* Bloc : Pièce jointe */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-medium">Pièce jointe</h3>
        <div className="text-sm">
          {data?.attachment?.name ? (
            <>
              Fichier :{" "}
              <span className="font-medium">{data.attachment.name}</span>
            </>
          ) : (
            "Aucune (optionnelle)"
          )}
        </div>
      </div>

      {/* Prévisualisation d'indexation (si calculée) */}
      {(calcLoading || calcError || calcResult) && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h3 className="font-medium">Prévisualisation d'indexation</h3>
          {calcLoading && <div>Calcul en cours…</div>}
          {calcError && <div className="text-red-600">{calcError}</div>}
          {calcResult && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500">
                Afficher le JSON
              </summary>
              <pre className="text-[11px] p-2 bg-gray-100 rounded overflow-x-auto mt-2">
                {JSON.stringify(calcResult, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Rappel statut */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Statut initial après création :</strong> «&nbsp;À
          valider&nbsp;»
        </AlertDescription>
      </Alert>
    </div>
  );
}
