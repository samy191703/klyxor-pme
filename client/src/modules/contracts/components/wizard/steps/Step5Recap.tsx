// components/wizard/steps/Step5Recap.tsx
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { BILLING_PERIODS } from "@/modules/contracts/domain/constants";
import { inferFormulaType } from "@/utils/indexation";

type Attachment = {
  id?: string;
  name: string;
  type?: string;
  category?: string;
  size?: number;
  url?: string;
  mimeType?: string;
  uploadedAt?: string;
};

type Props = {
  data: any;
  calcLoading?: boolean;
  calcError?: string | null;
  calcResult?: any;
  contractId?: string | number;
  /** Optional: pass attachments directly; if omitted and contractId provided, the component will fetch them */
  attachments?: Attachment[];
  /** Optional: override the attachments GET endpoint */
  attachmentsEndpoint?: (contractId: string | number) => string;
};

function formatBytes(n?: number) {
  if (n == null) return "—";
  if (n === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  const val = parseFloat((n / Math.pow(k, i)).toFixed(2));
  return `${val} ${sizes[i]}`;
}

export default function Step5Recap({
  data,
  calcLoading,
  calcError,
  calcResult,
  contractId,
  attachments: attachmentsProp,
  attachmentsEndpoint,
}: Props) {
  const [attachments, setAttachments] = useState<Attachment[] | null>(
    attachmentsProp ?? null
  );
  const [attErr, setAttErr] = useState<string | null>(null);
  const [attLoading, setAttLoading] = useState<boolean>(false);

  // Fetch attachments if not provided
  useEffect(() => {
    if (attachmentsProp) {
      setAttachments(attachmentsProp);
      return;
    }
    if (!contractId) return;

    const endpoint =
      attachmentsEndpoint?.(contractId) ??
      `/api/contracts/${contractId}/documents`;

    let cancelled = false;
    (async () => {
      try {
        setAttLoading(true);
        setAttErr(null);
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // Accept either { items: [...] } or raw array
        const items: Attachment[] = Array.isArray(json)
          ? json
          : json.items ?? [];
        if (!cancelled) setAttachments(items);
      } catch (e: any) {
        if (!cancelled)
          setAttErr(e?.message || "Échec du chargement des pièces jointes");
      } finally {
        if (!cancelled) setAttLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attachmentsProp, contractId, attachmentsEndpoint]);

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

  // ✅ Indexation ON/OFF based on new fields
  const indexationOn =
    Boolean(data?.indexationEnabled) &&
    !!data?.indexationFormulaId &&
    data?.indexationFormulaId !== "none";

  // Type guessing based on your local catalog (__formulas) OR directly from data.indexationFormula (type string)
  const typeGuess =
    (indexationOn &&
      data?.__formulas &&
      inferFormulaType(
        (data.__formulas as any[])?.find(
          (f) => f.id === data.indexationFormulaId
        )
      )) ||
    data?.indexationFormula ||
    null;

  // Checklist de validation (steps 1–3)
  const missing: string[] = [];
  const require = (ok: any, label: string) => {
    if (!ok && !missing.includes(label)) missing.push(label);
  };

  // Step 1 (général)
  require(!!data.number, "N° contrat");
  require(!!data.title, "Titre/SPV");
  require(!!data.clientName, "Nom du client");
  require(!!data.type, "Type");
  require(!!data.businessUnit, "BU/Entité");
  require(!!data.startDate, "Date début");
  require(!!data.endDate, "Date fin");

  // Step 3 (indexation)
  if (indexationOn) {
    require(!!data.indexationDate, "Date de première indexation");
    if (typeGuess === "SIMPLE_ICHT") {
      require(data.indexationBaseAmount ??
        data.fixedAmount, "Montant de base (P0)");
      require(!!data.ICHT0, "ICHT0");
    } else if (typeGuess === "MIXED_ICHT_FMOA") {
      require(data.indexationBaseAmount ??
        data.fixedAmount, "Montant de base (P0)");
      require(!!data.ICHT0, "ICHT0");
      require(!!data.FMOA0, "FMOA0");
    } else if (typeGuess === "CPI_PN1" || data.indexationMode === "PN1") {
      require(!!data.PN1, "PN1 (montant période N-1)");
    }
    if (data.indexationPolicy === "LAST_INDICE_VALUE") {
      require(!!data.lastIndiceDate, "Date de prise d'indice");
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

      {/* Bloc : Informations générales (Step 1) */}
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
          {data.technology && <div>Technologie : {data.technology}</div>}
          {data.parkCode && <div>Parc : {data.parkCode}</div>}
        </div>
      </div>

      {/* Bloc : Période & montants (Step 2) */}
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

      {/* Bloc : Indexation (Step 3) */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-medium">Indexation</h3>
        {indexationOn ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Formule ID : {String(data.indexationFormulaId)}</div>
            <div>Type : {String(typeGuess || "—")}</div>
            <div>Date 1ère indexation : {fmtDate(data.indexationDate)}</div>
            <div>Fréquence : {data.indexationFrequency || "annual"}</div>
            <div>Policy : {data.indexationPolicy || "AT_PUBLICATION_DATE"}</div>
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
            {(typeGuess === "CPI_PN1" || data.indexationMode === "PN1") && (
              <div>PN1 : {fmtMoney(Number(data.PN1 ?? 0))}</div>
            )}

            {/* Cap / Floor */}
            <div>Cap (%) : {data.capPercent ?? "—"}</div>
            <div>Floor (%) : {data.floorPercent ?? "—"}</div>

            {/* Revised/Provisional */}
            {data.requireRevised && (
              <div>Publication: {data.requireRevised}</div>
            )}
            {data.lastIndiceDate && (
              <div>Date de prise d’indice: {fmtDate(data.lastIndiceDate)}</div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Pas d’indexation configurée.
          </div>
        )}
      </div>

      {/* Bloc : Pièces jointes (toutes) */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-medium">Pièces jointes</h3>

        {attLoading && <div className="text-sm text-gray-600">Chargement…</div>}
        {attErr && <div className="text-sm text-red-600">{attErr}</div>}

        {attachments && attachments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Nom</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Catégorie</th>
                  <th className="py-2 pr-2">Taille</th>
                  <th className="py-2 pr-2">Lien</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((a) => (
                  <tr key={a.id ?? a.name} className="border-b last:border-0">
                    <td className="py-2 pr-2">{a.name}</td>
                    <td className="py-2 pr-2">{a.type ?? "—"}</td>
                    <td className="py-2 pr-2">{a.category ?? "—"}</td>
                    <td className="py-2 pr-2">{formatBytes(a.size)}</td>
                    <td className="py-2 pr-2">
                      {a.url ? (
                        <a
                          className="text-blue-600 hover:underline"
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Télécharger
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !attLoading ? (
          <div className="text-sm text-gray-600">Aucune pièce jointe</div>
        ) : null}
      </div>

      {/* Prévisualisation d'indexation */}
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
