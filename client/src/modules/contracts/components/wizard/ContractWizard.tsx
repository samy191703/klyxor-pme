// components/wizard/ContractWizard.tsx
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import Step1General from "./steps/Step1General";
import Step2PeriodAmounts from "./steps/Step2PeriodAmounts";
import Step3Indexation from "./steps/Step3Indexation";
import Step4Attachment from "./steps/Step4Attachment";
import Step5Recap from "./steps/Step5Recap";
import { buildCalculateFromAssetsPayload } from "@/utils/indexation";
import { postIndexationPreview } from "@/services/indexation.api";

// ===== keep your services file "as-is" and import from it =====
import {
  // TODO: adapt names if different in your services
  createContractDraft,
  patchContractStep2,
  patchContractStep3,
  PatchStep3Payload, // (payload) => Promise<{ id: string|number, ... }>
  updateContract, // (id, patch) => Promise<any>
  // createContract,   // will be used at final submit; you already pass onSubmit()
} from "@/services/contracts.api";
import { contractTypeDefinitions } from "../../domain/constants";

type Props = {
  indexationFormulas: any[];
  onCancel: () => void;
  onSubmit: (payload: any) => void; // used on step 5 submit (final Create or Submit for validation)
};

type StepErrors = Record<string, string>;

export default function ContractWizard({
  indexationFormulas,
  onCancel,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({ contractId: null });
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<any>(null);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<StepErrors>({}); // collect step-validation errors
  const [formError, setFormError] = useState<string | null>(null); // server/network error

  const steps = useMemo(
    () => [
      "Informations générales",
      "Période & montants",
      "Indexation",
      "Pièce jointe",
      "Récapitulatif",
    ],
    []
  );

  const DEFAULTS = [{ currency: "EUR", language: "FR" }];

  function withDefaults(d: any, step: number) {
    return { ...DEFAULTS[step - 1], ...d };
  }

  // ---------- STEP VALIDATION ----------

  function validateStep1(d: any): StepErrors {
    const e: StepErrors = {};
    const v = withDefaults(d, 1);

    // Required in Step 1
    if (!v.number) e.number = "N° contrat requis";
    if (!v.title) e.title = "Titre requis";
    if (!v.type) e.type = "Type requis";
    if (!v.businessUnit) e.businessUnit = "Business Unit requise";
    if (!v.clientName) e.clientName = "Client requis";
    if (!v.currency) e.currency = "Devise requise";
    if (!v.language) e.language = "Langue requise";

    // Conditional requirements based on selected contract type
    const typeDef = contractTypeDefinitions.find((t) => t.value === d.type);
    if (typeDef?.hasTechnology && !d.technology) {
      e.technology = "Technologie requise";
    }
    // Maintainer is optional per your UI; if one type ever makes it mandatory:
    // if (typeDef?.hasMaintainer && !d.maintainer) e.maintainer = "Mainteneur requis";

    // Mask/uniqueness are server-side; optional client-side mask example:
    // const mask = /^CT-\d{4}-[A-Z0-9]{4}$/i;
    // if (d.number && !mask.test(d.number)) e.number = "Format attendu : CT-YYYY-XXXX";

    // Dates are not part of Step 1 validation:
    // (no start/end date checks here)

    return e;
  }

  function validateStep2(d: any): StepErrors {
    const e: StepErrors = {};
    const fixed = Number(d.fixedAmount || 0) || 0;
    const variable = Number(d.variableAmount || 0) || 0;

    if (!d.startDate) e.startDate = "Date de début requise";
    if (!d.endDate) e.endDate = "Date de fin requise";
    if (
      d.startDate &&
      d.endDate &&
      new Date(d.endDate) <= new Date(d.startDate)
    ) {
      e.endDate = "La date de fin doit être postérieure à la date de début";
    }

    if (fixed <= 0 && variable <= 0) {
      e.amount = "Au moins un montant (fixe ou variable) doit être > 0";
    }

    // Accept either billingPeriod or billingFrequency from UI, normalize later
    if (!d.billingPeriod && !d.billingFrequency) {
      e.billingPeriod = "Périodicité de facturation requise";
    }
    if (!d.paymentType) e.paymentType = "Type de paiement requis";

    // Optional pre-check for energy contracts (UI-level; server revalidates by type in DB)
    const isEnergy = d?.type === "electricity" || d?.type === "renewable_ppa";
    if (isEnergy) {
      if (d.maxAnnualProduction == null || d.maxAnnualProduction === "")
        e.maxAnnualProduction = "Production annuelle max requise (Énergie)";
      if (d.pricePerMWh == null || d.pricePerMWh === "")
        e.pricePerMWh = "Prix par MWh requis (Énergie)";
    }

    return e;
  }

  function validateStep3(d: any): StepErrors {
    const e: StepErrors = {};
    if (d.indexationFormula && d.indexationFormula !== "none") {
      if (!d.indexationDate)
        e.indexationDate = "Date de première indexation requise";

      if (d.indexationMode === "PN1" && (!d.PN1 || Number(d.PN1) <= 0)) {
        e.PN1 = "PN1 (montant période N-1) requis pour CPI PN1";
      }
      if (d.indexationPolicy === "LAST_INDICE_VALUE" && !d.lastIndiceDate) {
        e.lastIndiceDate = "Date de prise d'indice personnalisée requise";
      }

      // P0 series must be provided
      const P0: any = d.baseAmountInput;
      const hasP0 =
        P0 &&
        ((P0.mode === "FIXED" && Number(P0.fixed ?? 0) > 0) ||
          (P0.mode === "VARIABLE" &&
            Array.isArray(P0.items) &&
            P0.items.length > 0 &&
            P0.items.some((it: any) => Number(it.value) > 0)));

      if (!hasP0) e.P0 = "Montant de base P0 requis et > 0";
    }
    return e;
  }

  // Step 4 optional: we don't block if no attachment selected.
  function validateStep4(_d: any): StepErrors {
    return {};
  }

  // ---------- BUILD PATCHES PER STEP (for draft updates) ----------

  function buildPatchForStep1(d: any) {
    return {
      title: d.title,
      type: d.type,
      businessUnit: d.businessUnit,
      clientName: d.clientName,
      number: d.number,
      /*    startsOn: d.startDate,
      endsOn: d.endDate || undefined, */
      technology: d.technology,
      maintenanceProvider: d.maintainer,
      currency: d.currency || "EUR",
    };
  }

  function buildPatchForStep2(d: any) {
    const toNum = (v: any) =>
      Number.isFinite(v)
        ? Number(v)
        : parseFloat(String(v ?? "").replace(",", "."));

    const fixed = Math.max(0, toNum(d.fixedAmount) || 0);
    const variable = Math.max(0, toNum(d.variableAmount) || 0);

    const billingPeriod = d.billingPeriod || d.billingFrequency; // normalize
    const billingFrequency = d.billingFrequency || d.billingPeriod; // keep both for compatibility

    const isEnergy = d?.type === "electricity" || d?.type === "renewable_ppa";

    const payload: any = {
      startDate: d.startDate, // "YYYY-MM-DD"
      endDate: d.endDate, // "YYYY-MM-DD"
      fixedAmount: fixed || 0,
      variableAmount: variable || 0,
      billingPeriod, // "monthly" | "quarterly" | ...
      billingFrequency, // allow backend to mirror if needed
      paymentType: d.paymentType,
      currency: d.currency || "EUR",
    };

    if (isEnergy) {
      payload.maxAnnualProduction =
        d.maxAnnualProduction != null
          ? toNum(d.maxAnnualProduction)
          : undefined;
      payload.numberOfTurbines =
        d.numberOfTurbines != null ? toNum(d.numberOfTurbines) : undefined;
      payload.pricePerMWh =
        d.pricePerMWh != null ? toNum(d.pricePerMWh) : undefined;
    }

    return payload;
  }

  function buildIndexationBlock(d: any) {
    // When LAST_INDICE_VALUE => send lastIndiceDate as indexationDate
    const policy = d.indexationPolicy || "AT_PUBLICATION_DATE";
    const indexationDate =
      policy === "LAST_INDICE_VALUE"
        ? d.lastIndiceDate || d.indexationDate
        : d.indexationDate;

    return {
      formulaId: d.indexationFormula || null,
      frequency: d.indexationFrequency || "annual",
      mode: d.indexationMode || "P0",
      policy,
      indexationDate,
      requireRevised: d.requireRevised ?? "R",
      base: {
        P0: d?.baseAmountInput?.value ?? null,
        ICHT0: d?.baseIndices?.ICHT0?.value ?? undefined,
        FMOA0: d?.baseIndices?.FMOA0?.value ?? undefined,
        PN1: d.indexationMode === "PN1" ? Number(d?.PN1 ?? 0) : undefined,
      },
      capPercent:
        d.capPercent !== undefined && d.capPercent !== ""
          ? Number(d.capPercent)
          : null,
      floorPercent:
        d.floorPercent !== undefined && d.floorPercent !== ""
          ? Number(d.floorPercent)
          : null,
      currency: d.currency || "EUR",
    };
  }

  // Build the exact payload expected by /api/contracts/:id/step3
  function buildPatchForStep3(d: any): PatchStep3Payload {
    const policy = d.indexationPolicy || "AT_PUBLICATION_DATE";

    return {
      indexationEnabled:
        !!d.indexationFormula && d.indexationFormula !== "none",
      indexationFormulaId: d.indexationFormulaId || null, // formula id
      indexationFormula: d.indexationFormula || "none",
      indexationFrequency: d.indexationFrequency || "annual",
      indexationMode: d.indexationMode || "P0",
      indexationPolicy: policy,
      indexationDate:
        policy === "LAST_INDICE_VALUE"
          ? d.lastIndiceDate || d.indexationDate // server also receives lastIndiceDate below
          : d.indexationDate,
      lastIndiceDate: d.lastIndiceDate || undefined,
      requireRevised: d.requireRevised ?? "R",

      // series as entered in the UI
      baseAmountInput: d.baseAmountInput,
      baseIndices: d.baseIndices, // e.g. { ICHT0: {...}, FMOA0: {...} }

      // PN1 if mode=PN1
      PN1: d.indexationMode === "PN1" ? Number(d.PN1) : undefined,

      // caps/floors
      capPercent:
        d.capPercent !== undefined && d.capPercent !== ""
          ? Number(d.capPercent)
          : null,
      floorPercent:
        d.floorPercent !== undefined && d.floorPercent !== ""
          ? Number(d.floorPercent)
          : null,

      currency: d.currency || "EUR",

      // optional helper values if you compute them client-side
      baseIndiceValues: d.baseIndiceValues,

      // cache last preview (if any)
      lastIndexationPreview: d.lastIndexationPreview || undefined,
    };
  }

  // ---------- CALCULATE (unchanged) ----------
  const handleCalculate = async () => {
    if (!data.indexationFormula || data.indexationFormula === "none") return;
    try {
      setCalcLoading(true);
      setCalcError(null);
      const dto = buildCalculateFromAssetsPayload(
        { ...data },
        indexationFormulas
      );
      const apiResult = await postIndexationPreview(dto);
      setCalcResult(apiResult);
    } catch (e: any) {
      setCalcError(e?.message || "Erreur lors du calcul d’indexation");
      setCalcResult(null);
    } finally {
      setCalcLoading(false);
    }
  };

  // ---------- ACTIONS ----------

  const doCreateDraft = async () => {
    // Validates step 1, then creates the draft if not exists.
    const e1 = validateStep1(data);
    setErrors(e1);
    if (Object.keys(e1).length) return false;

    try {
      setSaving(true);
      setFormError(null);
      const draftPayload = {
        ...buildPatchForStep1(data),
        status: "DRAFT",
      };
      // server returns id
      const created = await createContractDraft(draftPayload); // TODO: name must match your services
      setData((prev: any) => ({ ...prev, contractId: created?.id }));
      return true;
    } catch (e: any) {
      // NEW: map uniqueness to field-level error
      if (e?.status === 409 && e?.field === "number") {
        setErrors((prev) => ({
          ...prev,
          number: e.message || "Numéro déjà utilisé",
        }));
        setFormError(null);
      } else {
        setFormError(e?.message || "Échec création du brouillon.");
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const doUpdateDraft = async (patch: any) => {
    if (!data.contractId) {
      setFormError("Aucun brouillon. Merci de créer le brouillon à l’étape 1.");
      return false;
    }
    try {
      setSaving(true);
      setFormError(null);
      await updateContract(data.contractId, patch); // TODO: name must match your services
      return true;
    } catch (e: any) {
      setFormError(e?.message || "Échec de mise à jour du contrat.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // “Enregistrer le brouillon” button — available at all steps
  const handleSaveDraftClick = async () => {
    if (!data.contractId) {
      await doCreateDraft();
      return;
    }
    // Update depending on current step
    const currentErrors =
      step === 1
        ? validateStep1(data)
        : step === 2
        ? validateStep2(data)
        : step === 3
        ? validateStep3(data)
        : validateStep4(data);
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length) return;

    // inside handleSaveDraftClick, after computing currentErrors...
    const patch =
      step === 1
        ? buildPatchForStep1(data)
        : step === 2
        ? buildPatchForStep2(data)
        : step === 3
        ? buildPatchForStep3(data)
        : {};

    if (step === 2) {
      // ensure draft exists first
      if (!data.contractId) {
        const ok = await doCreateDraft();
        if (!ok) return;
      }
      try {
        setSaving(true);
        await patchContractStep2(data.contractId, patch);
      } catch (e: any) {
        setFormError(e?.message || "Échec mise à jour étape 2.");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (step === 3) {
      // ensure draft exists first
      if (!data.contractId) {
        const ok = await doCreateDraft();
        if (!ok) return;
      }
      try {
        setSaving(true);
        await patchContractStep3(data.contractId, patch as PatchStep3Payload);
        // keep calc result in local state too (so the “results” view stays in sync)
        setCalcResult(
          (patch as PatchStep3Payload).lastIndexationPreview ?? calcResult
        );
      } catch (e: any) {
        setFormError(e?.message || "Échec mise à jour étape 3.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // default path (steps 1,3,4)
    // Default (steps 1 & 4)
    const ok = await doUpdateDraft(patch);
    if (ok) onCancel(); // ⬅️ close wizard on success
  };

  const handleNext = async () => {
    setFormError(null);

    if (step === 1) {
      // validate + create draft if needed, else update the draft
      const e1 = validateStep1(data);
      setErrors(e1);
      if (Object.keys(e1).length) return;

      if (!data.contractId) {
        const ok = await doCreateDraft();
        if (!ok) return;
      } else {
        const ok = await doUpdateDraft(buildPatchForStep1(data));
        if (!ok) return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const e2 = validateStep2(data);
      setErrors(e2);
      if (Object.keys(e2).length) return;

      // ensure draft exists
      if (!data.contractId) {
        const ok = await doCreateDraft();
        if (!ok) return;
      }

      try {
        setSaving(true);
        const payload = buildPatchForStep2(data);
        await patchContractStep2(data.contractId, payload);
      } catch (e: any) {
        setFormError(
          e?.message || "Échec de mise à jour du contrat (étape 2)."
        );
        return;
      } finally {
        setSaving(false);
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      const e3 = validateStep3(data);
      setErrors(e3);
      if (Object.keys(e3).length) return;

      // ensure draft exists
      if (!data.contractId) {
        const ok = await doCreateDraft();
        if (!ok) return;
      }

      try {
        setSaving(true);
        const payload = buildPatchForStep3({
          ...data,
          // include latest preview if you want it persisted on “Suivant”
          lastIndexationPreview: calcResult || undefined,
        });
        await patchContractStep3(data.contractId, payload);
      } catch (e: any) {
        setFormError(
          e?.message || "Échec de mise à jour du contrat (étape 3)."
        );
        return;
      } finally {
        setSaving(false);
      }

      setStep(4);
      return;
    }

    if (step === 4) {
      // optional; no blocking (attachment uploaded inside Step4Attachment with contractId)
      setStep(5);
      return;
    }

    // Step 5 → Final submit via parent handler
    const finalPayload = {
      ...buildPatchForStep1(data),
      ...buildPatchForStep2(data),
      ...(data.indexationFormula && data.indexationFormula !== "none"
        ? { indexation: buildIndexationBlock(data) }
        : {}),
      contractId: data.contractId,
      status: "ACTIVE", // or keep DRAFT and let validation flow activate later
    };
    onSubmit(finalPayload);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  // ---------- UI ----------
  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Nouveau contrat
          {data.contractId && (
            <span className="text-xs rounded bg-green-100 text-green-700 px-2 py-0.5">
              Brouillon créé (ID: {String(data.contractId)})
            </span>
          )}
        </h1>
        <Progress value={(step / 5) * 100} className="mt-2" />
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          {steps.map((s, i) => (
            <span key={i} className={step >= i + 1 ? "font-medium" : ""}>
              {s}
            </span>
          ))}
        </div>

        {/* Global errors */}
        {(formError || Object.keys(errors).length > 0) && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError && <div className="mb-1">{formError}</div>}
            {Object.keys(errors).length > 0 && (
              <ul className="list-disc ml-4">
                {Object.entries(errors).map(([k, v]) => (
                  <li key={k}>
                    <b>{k}</b>: {v}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 1 && <Step1General data={data} setData={setData} />}

          {step === 2 && (
            <Step2PeriodAmounts
              data={data}
              setData={setData}
              contractId={data.contractId}
            />
          )}

          {step === 3 && (
            <Step3Indexation
              data={data}
              setData={setData}
              indexationFormulas={indexationFormulas}
              onCalculate={handleCalculate}
              calcLoading={calcLoading}
              calcResult={calcResult}
              calcError={calcError}
              contractId={data.contractId}
            />
          )}

          {step === 4 && (
            <Step4Attachment
              data={data}
              setData={setData}
              // IMPORTANT: pass the contractId to enable upload
              contractId={data.contractId}
            />
          )}

          {step === 5 && (
            <Step5Recap
              data={data}
              calcLoading={calcLoading}
              calcError={calcError}
              calcResult={calcResult}
            />
          )}

          <div className="flex justify-between mt-6">
            <div>
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={saving}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Précédent
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onCancel} disabled={saving}>
                Annuler
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraftClick}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {data.contractId
                  ? "Mettre à jour le brouillon"
                  : "Enregistrer le brouillon"}
              </Button>
              {step < 5 ? (
                <Button onClick={handleNext} disabled={saving}>
                  Suivant <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={saving}>
                  <Send className="w-4 h-4 mr-2" />
                  Soumettre
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
