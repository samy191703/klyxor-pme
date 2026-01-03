import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save, Send, Check } from "lucide-react";
import Step1General from "./steps/Step1General";
import Step2PeriodAmounts from "./steps/Step2PeriodAmounts";
import Step3Indexation from "./steps/Step3Indexation";
import Step4Attachment from "./steps/Step4Attachment";
import Step5Recap from "./steps/Step5Recap";
import { buildCalculateFromAssetsPayload } from "@/utils/indexation";
import { postIndexationPreview } from "@/services/indexation.api";
import {
  createContractDraft,
  patchContractStep1, // ⬅️ NEW
  patchContractStep2,
  patchContractStep3,
  PatchStep3Payload,
  submitContractForValidation,
  updateContract,
  getContract,
} from "@/services/contracts.api";
import {
  CONTRACT_TYPE_VALUES,
  contractTypeDefinitions,
  TECHNOLOGY_VALUES,
} from "@shared/enums/contracts";
import { cleanPayload, omitNulAndEmpty } from "@/utils/clean-up";
import { Contract } from "@shared/schema";
import { PatchStep1Payload } from "@shared/models/contract.model";
import { ContractStatus } from "@shared/enums/contracts-status.enum";

export type WizardMode = "create" | "edit";

type Props = {
  indexationFormulas: any[];
  onCancel: () => void;
  onSubmit: (payload: any) => void;
  mode?: WizardMode; // default "create"
  contractId?: string;
  /** Start the wizard at a specific step (1..5). Default 1. */
  initialStep?: 1 | 2 | 3 | 4 | 5;
  /**
   * In edit mode, if false → behave as a single-step updater:
   * - hide progress + step labels
   * - primary button is "Mettre à jour"
   * - only patches the current step then closes
   * Default: true (normal stepper)
   */
  showNextStep?: boolean;
};

type StepErrors = Record<string, string>;

export default function ContractWizard({
  indexationFormulas,
  onCancel,
  onSubmit,
  mode = "create",
  contractId,
  initialStep = 1,
  showNextStep = true,
}: Props) {
  const [loadingContract, setLoadingContract] = useState(false);

  const [step, setStep] = useState<number>(initialStep);
  const [data, setData] = useState<any>({ contractId: contractId ?? null });
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<any>(null);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<StepErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (contractId) {
      setData((prev: any) => ({ ...prev, contractId }));
    }
  }, [contractId]);

  // Normalize backend Contract → wizard data shape
  function normalizeFromDto(dto: any) {
    return {
      contractId: dto.id,

      // --- Step 1 fields
      number: dto.number ?? "",
      title: dto.title ?? "",
      clientName: dto.clientName ?? "",
      type: dto.type ?? "",
      businessUnit: dto.businessUnit ?? "",
      currency: dto.currency ?? "EUR",
      language: dto.language ?? "FR",
      technology: dto.technology ?? "",
      maintainer: dto.maintainer ?? "",

      // --- Step 2 fields
      startDate: dto.startDate ? String(dto.startDate).slice(0, 10) : "",
      endDate: dto.endDate ? String(dto.endDate).slice(0, 10) : "",
      fixedAmount: dto.fixedAmount ?? dto.amount ?? 0,
      tvaRate: dto.tvaRate ?? 0.07,
      variableAmount: dto.variableAmount ?? 0,
      billingPeriod: dto.billingPeriod ?? dto.billingFrequency ?? "",
      billingFrequency: dto.billingFrequency ?? dto.billingPeriod ?? "",
      billingType: dto.billingType ?? "",
      paymentType: dto.paymentType ?? "",

      // --- Step 3 fields (indexation)
      indexationEnabled: !!dto.indexationEnabled,
      indexationFormulaId: dto.indexationFormulaId ?? null,
      indexationFormula:
        dto.indexationFormula ?? (dto.indexationEnabled ? "" : "none"),
      indexationFrequency: dto.indexationFrequency ?? "annual",
      indexationMode: dto.indexationMode ?? "P0",
      indexationPolicy: dto.indexationPolicy ?? "AT_PUBLICATION_DATE",
      indexationDate: dto.indexationDate
        ? String(dto.indexationDate).slice(0, 10)
        : "",
      lastIndiceDate: dto.lastIndiceDate
        ? String(dto.lastIndiceDate).slice(0, 10)
        : "",
      baseAmountInput: dto.baseAmountInput ?? { mode: "FIXED", fixed: 0 },
      baseIndices: dto.baseIndices ?? {},
      PN1: dto.PN1 ?? undefined,
      capPercent: dto.capPercent ?? null,
      floorPercent: dto.floorPercent ?? null,
      baseIndiceValues: dto.baseIndiceValues ?? undefined,
      lastIndexationPreview: dto.lastIndexationPreview ?? undefined,

      _loadedFromServer: true,
    };
  }

  // Fetch the contract once in EDIT mode
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (mode !== "edit") return;
      const id = contractId || data.contractId;
      if (!id) return;

      // avoid re-fetching if we already loaded this contract id
      if (data?._loadedFromServer && String(data.contractId) === String(id))
        return;

      try {
        setLoadingContract(true);
        const dto = await getContract(String(id));
        if (cancelled) return;
        const hydrated = normalizeFromDto(dto);
        setData((prev: any) => ({ ...prev, ...hydrated }));
      } catch (e: any) {
        if (!cancelled)
          setFormError(e?.message || "Échec du chargement du contrat.");
      } finally {
        if (!cancelled) setLoadingContract(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, contractId]);

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

    //if (!v.number) e.number = "N° contrat requis";
    if (!v.title) e.title = "Titre requis";
    if (!v.clientId) e.clientId = "Client requis";
    if (!v.type) e.type = "Type requis";
    if (!v.businessUnit) e.businessUnit = "Business Unit requise";
    if (!v.clientName) e.clientName = "Client requis";
    if (!v.currency) e.currency = "Devise requise";
    if (!v.language) e.language = "Langue requise";

    const typeDef = contractTypeDefinitions.find((t) => t.value === d.type);
    if (typeDef?.hasTechnology && !d.technology) {
      e.technology = "Technologie requise";
    }
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

    if (!d.billingType) e.billingType = "Type de facturation requis";

    if (!d.billingPeriod && !d.billingFrequency) {
      e.billingPeriod = "Périodicité de facturation requise";
    }
    if (!d.paymentType) e.paymentType = "Type de paiement requis";

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

  function validateStep4(_d: any): StepErrors {
    return {};
  }

  // ---------- BUILD PATCHES PER STEP ----------
  function buildPatchForStep1(d: Contract): PatchStep1Payload {
    const typeDef = contractTypeDefinitions.find((t) => t.value === d.type);

    // Sanitize clientName to remove invalid characters
    // Only allow: letters (including accented), spaces, hyphens, dots, apostrophes
    const sanitizeClientName = (name: string | undefined | null): string => {
      if (!name || !name.trim()) return "";
      
      // First, try to clean the name
      const sanitized = name
        .replace(/[^a-zA-ZÀ-ÿ\s\-'.]/g, "") // Remove invalid characters
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .trim();
      
      // If sanitization resulted in a valid name (at least 2 characters with allowed chars), return it
      if (sanitized.length >= 2 && /^[A-Za-zÀ-ÿ\s\-'.]+$/.test(sanitized)) {
        return sanitized;
      }
      
      // If the original name is valid, return it trimmed
      const trimmed = name.trim();
      if (trimmed.length >= 2 && /^[A-Za-zÀ-ÿ\s\-'.]+$/.test(trimmed)) {
        return trimmed;
      }
      
      // If invalid (e.g., only numbers), return the original name
      // The backend validation will catch this and show a proper error message
      // This prevents empty clientName which could cause 500 errors
      return trimmed || name;
    };

    const payload: PatchStep1Payload = {
      number: d.number ?? "", // or omit if truly optional in your API
      title: d.title,
      clientId: d.clientId,
      clientName: sanitizeClientName(d.clientName),
      type: d.type,
      businessUnit: d.businessUnit,
      currency: d.currency || "EUR",
      language: d.language || "FR",
      // Optional only when present & applicable
      ...(typeDef?.hasTechnology && d.technology
        ? { technology: d.technology }
        : {}),
      ...(typeDef?.hasMaintainer && d.maintainer
        ? { maintainer: d.maintainer }
        : {}),
    };

    return payload;
  }

  function buildPatchForStep2(d: any) {
    const toNum = (v: any) =>
      Number.isFinite(v)
        ? Number(v)
        : parseFloat(String(v ?? "").replace(",", "."));

    const fixed = Math.max(0, toNum(d.fixedAmount) || 0);
    const variable = Math.max(0, toNum(d.variableAmount) || 0);

    const billingPeriod = d.billingPeriod || d.billingFrequency;
    const billingFrequency = d.billingFrequency || d.billingPeriod;

    const isEnergy = d?.type === "electricity" || d?.type === "renewable_ppa";

    const payload: any = {
      startDate: d.startDate,
      endDate: d.endDate,
      fixedAmount: fixed || 0,
      tvaRate: d.tvaRate || 0.07,
      variableAmount: variable || 0,
      billingPeriod,
      billingFrequency,
      billingType: d.billingType,
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
  // Helpers for Step 3
  const toNum = (v: any) =>
    Number.isFinite(v)
      ? Number(v)
      : parseFloat(String(v ?? "").replace(",", "."));

  const getTotalAmount = (d: any) =>
    Math.max(0, toNum(d.fixedAmount) || 0) +
    Math.max(0, toNum(d.variableAmount) || 0);

  function buildPatchForStep3(d: any): PatchStep3Payload {
    const policy = d.indexationPolicy || "AT_PUBLICATION_DATE";
    return {
      indexationEnabled:
        !!d.indexationFormula && d.indexationFormula !== "none",
      indexationFormulaId: d.indexationFormulaId || null,
      indexationFormula: d.indexationFormula || "none",
      indexationFrequency: d.indexationFrequency || "annual",
      indexationMode: d.indexationMode || "P0",
      indexationPolicy: policy,
      indexationDate:
        policy === "LAST_INDICE_VALUE"
          ? d.lastIndiceDate || d.indexationDate
          : d.indexationDate,
      lastIndiceDate: d.lastIndiceDate || undefined,
      requireRevised: d.requireRevised ?? "R",
      baseAmountInput: d.baseAmountInput,
      baseIndices: d.baseIndices,
      PN1: d.indexationMode === "PN1" ? Number(d.PN1) : undefined,
      capPercent:
        d.capPercent !== undefined && d.capPercent !== ""
          ? Number(d.capPercent)
          : null,
      floorPercent:
        d.floorPercent !== undefined && d.floorPercent !== ""
          ? Number(d.floorPercent)
          : null,
      currency: d.currency || "EUR",
      baseIndiceValues: d.baseIndiceValues,
      lastIndexationPreview: d.lastIndexationPreview || undefined,
    };
  }

  // ---------- CALCULATE ----------
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

  // ---------- DRAFT HELPERS ----------
  const doCreateDraft = async () => {
    const e1 = validateStep1(data);
    setErrors(e1);
    if (Object.keys(e1).length) return false;

    try {
      setSaving(true);
      setFormError(null);
      
      // Validate clientName before sending
      if (!data.clientName || !data.clientName.trim()) {
        setErrors((prev) => ({
          ...prev,
          clientName: "Le nom du client est requis",
        }));
        return false;
      }
      
      const draftPayload = {
        ...buildPatchForStep1(data),
        //status: ContractStatus.DRAFT,
      };
      
      // Double check clientName is not empty after sanitization
      if (!draftPayload.clientName || !draftPayload.clientName.trim()) {
        setErrors((prev) => ({
          ...prev,
          clientName: "Le nom du client contient des caractères non autorisés",
        }));
        return false;
      }
      
      const created = await createContractDraft(draftPayload);
      setData((prev: any) => ({
        ...prev,
        contractId: created?.id,
        number: created?.number,
      }));
      return true;
    } catch (e: any) {
      // Handle validation errors (400)
      if (e?.message?.includes("clientName") || e?.message?.includes("client")) {
        const errorMsg = e?.message || "Le nom du client est invalide";
        setErrors((prev) => ({
          ...prev,
          clientName: errorMsg.includes("caractères") 
            ? "Le nom du client contient des caractères non autorisés"
            : "Le nom du client est requis",
        }));
        setFormError(null);
      } else if (e?.status === 409 && e?.field === "number") {
        setErrors((prev) => ({
          ...prev,
          number: e.message || "Numéro déjà utilisé",
        }));
        setFormError(null);
      } else {
        // For 500 errors, show a more helpful message
        const errorMsg = e?.message || "Échec création du brouillon";
        setFormError(
          errorMsg.includes("500") 
            ? "Erreur serveur. Veuillez vérifier que tous les champs sont correctement remplis."
            : errorMsg
        );
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const doUpdateDraft = async (patch: any) => {
    const id = data.contractId || contractId;
    if (!id) {
      setFormError(
        "Aucun contrat/brouillon. Merci de créer le brouillon à l’étape 1."
      );
      return false;
    }
    try {
      setSaving(true);
      setFormError(null);
      await updateContract(id, patch);
      return true;
    } catch (e: any) {
      setFormError(e?.message || "Échec de mise à jour du contrat.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ---------- SINGLE-STEP UPDATE (edit mode, showNextStep = false) ----------
  const handleUpdateCurrentStepClick = async () => {
    setFormError(null);

    // Validate current step
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

    // Ensure we have an id
    const id = data.contractId || contractId;
    if (!id) {
      setFormError("Identifiant du contrat manquant.");
      return;
    }

    try {
      setSaving(true);

      if (step === 1) {
        const body = buildPatchForStep1(data) satisfies PatchStep1Payload;
        await patchContractStep1(id, body);
      } else if (step === 2) {
        await patchContractStep2(id, buildPatchForStep2(data));
      } else if (step === 3) {
        await handleCalculate();
        await patchContractStep3(
          id,
          buildPatchForStep3({
            ...data,
            lastIndexationPreview: calcResult || undefined,
          })
        );
      }
      // Step 4 uploads handled inside Step4Attachment; Step 5 has no direct patch.

      onCancel(); // close on success
    } catch (e: any) {
      setFormError(e?.message || "Échec de mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- MULTI-STEP FLOW (create / edit with stepper) ----------
  const handleSaveDraftClick = async () => {
    if (!data.contractId) {
      await doCreateDraft();
      return;
    }

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

    if (step === 1) {
      try {
        setSaving(true);
        const body = buildPatchForStep1(data) satisfies PatchStep1Payload;
        await patchContractStep1(data.contractId, body);
      } catch (e: any) {
        // duplicate number mapping already handled inside service (throws with status=409)
        if (e?.status === 409 && e?.field === "number") {
          setErrors((prev) => ({
            ...prev,
            number: e.message || "Numéro déjà utilisé",
          }));
          setFormError(null);
        } else {
          setFormError(e?.message || "Échec mise à jour étape 1.");
        }
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === 2) {
      try {
        setSaving(true);
        await patchContractStep2(data.contractId, buildPatchForStep2(data));
      } catch (e: any) {
        setFormError(e?.message || "Échec mise à jour étape 2.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === 3) {
      try {
        setSaving(true);
        await patchContractStep3(
          data.contractId,
          buildPatchForStep3(data) as PatchStep3Payload
        );
        setCalcResult(
          (buildPatchForStep3(data) as PatchStep3Payload)
            .lastIndexationPreview ?? calcResult
        );
      } catch (e: any) {
        setFormError(e?.message || "Échec mise à jour étape 3.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // steps 4/5 default path
    const ok = await doUpdateDraft({});
    if (ok) onCancel();
  };

  const handleNext = async () => {
    setFormError(null);

    if (step === 1) {
      const e1 = validateStep1(data);
      setErrors(e1);
      if (Object.keys(e1).length) return;

      if (!data.contractId) {
        const ok = await doCreateDraft();
        if (!ok) return;
      } else {
        try {
          setSaving(true);
          const body = buildPatchForStep1(data) satisfies PatchStep1Payload;
          const response = await patchContractStep1(data.contractId, body);

          setData((prev: any) => ({ ...prev, number: response?.number }));

          //setData((prev: any) => ({ ...prev, ...normalizeFromDto(response) }));
        } catch (e: any) {
          setFormError(
            e?.message || "Échec de mise à jour du contrat (étape 1)."
          );
          return;
        } finally {
          setSaving(false);
        }
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const e2 = validateStep2(data);
      setErrors(e2);
      if (Object.keys(e2).length) return;

      if (!data.contractId) {
        const ok = await doCreateDraft();
        if (!ok) return;
      }
      try {
        setSaving(true);
        await patchContractStep2(data.contractId, buildPatchForStep2(data));
      } catch (e: any) {
        setFormError(
          e?.message || "Échec de mise à jour du contrat (étape 2)."
        );
        return;
      } finally {
        setSaving(false);
      }

      setData((prev: any) => {
        const total = getTotalAmount(prev);
        return {
          ...prev,
          // Date d’indexation = Date début si vide
          indexationDate: prev.startDate || "",
          // 🔒 P0 TOUJOURS FIXED = fixed + variable
          baseAmountInput: {
            mode: "FIXED",
            fixed: total,
          },
        };
      });
      setStep(3);
      return;
    }

    if (step === 3) {
      const e3 = validateStep3(data);
      setErrors(e3);
      if (Object.keys(e3).length) return;

      if (!data.contractId) {
        const ok = await doCreateDraft();
        if (!ok) return;
      }
      try {
        setSaving(true);
        await handleCalculate();
        await patchContractStep3(
          data.contractId,
          buildPatchForStep3({
            ...data,
            lastIndexationPreview: calcResult || undefined,
          })
        );
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
      setStep(5);
      return;
    }

    if (step === 5) {
      if (!data.contractId) {
        setFormError(
          "Aucun brouillon. Merci de créer le brouillon avant la soumission."
        );
        return;
      }
      try {
        setSaving(true);
        await submitContractForValidation(
          String(data.contractId),
          "contract-creation"
        );
        onCancel();
      } catch (e: any) {
        setFormError(
          e?.message || "Échec de soumission du contrat pour validation."
        );
      } finally {
        setSaving(false);
      }
      return;
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  // ---------- RENDER ----------
  const isEdit = mode === "edit";
  const isSingleStepEdit = isEdit && !showNextStep;

  const title = isEdit ? "Mettre à jour le contrat" : "Nouveau contrat";

  // Primary action labeling
  const primaryLabel = isSingleStepEdit
    ? "Mettre à jour"
    : step < 5
    ? "Suivant"
    : isEdit
    ? "Mettre à jour"
    : "Soumettre";

  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {title}{" "}
          {data.number && (
            <span className="ml-2 text-xs rounded bg-green-100 text-green-700 px-2 py-0.5">
              N°: {String(data.number)}
            </span>
          )}
        </h1>

        {!isSingleStepEdit && (
          <>
            <Progress value={(step / 5) * 100} className="mt-2" />
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              {steps.map((s, i) => (
                <span key={i} className={step >= i + 1 ? "font-medium" : ""}>
                  {s}
                </span>
              ))}
            </div>
          </>
        )}

        {(formError || Object.keys(errors).length > 0) && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError && <div className="mb-1">{formError}</div>}
            {Object.keys(errors).length > 0 && (
              <ul className="list-disc ml-4">
                {Object.entries(errors).map(([k, v]) => (
                  <li key={k}>
                    {/* <b>{k}</b>:  */}
                    {v}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {loadingContract && mode === "edit" ? (
            <div className="p-2 text-sm text-gray-500">
              Chargement du contrat…
            </div>
          ) : (
            <>
              {step === 1 && (
                <Step1General
                  data={data}
                  setData={setData}
                  contractId={contractId}
                  mode={mode}
                />
              )}

              {step === 2 && (
                <Step2PeriodAmounts
                  data={data}
                  setData={setData}
                  contractId={data.contractId}
                  mode={mode}
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
                  mode={mode}
                />
              )}

              {step === 4 && (
                <Step4Attachment
                  data={data}
                  setData={setData}
                  contractId={data.contractId}
                  mode={mode}
                />
              )}

              {step === 5 && (
                <Step5Recap
                  data={data}
                  calcLoading={calcLoading}
                  calcError={calcError}
                  calcResult={calcResult}
                  contractId={data.contractId}
                  mode={mode}
                />
              )}
            </>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex justify-between mt-6">
            <div>
              {!isSingleStepEdit && step > 1 && (
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

              {!isSingleStepEdit && (
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
              )}

              {/* Primary */}
              <Button
                onClick={
                  isSingleStepEdit
                    ? handleUpdateCurrentStepClick
                    : step < 5
                    ? handleNext
                    : handleNext
                }
                disabled={saving}
              >
                {isSingleStepEdit ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {primaryLabel}
                  </>
                ) : step < 5 ? (
                  <>
                    {primaryLabel} <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                ) : isEdit ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {primaryLabel}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {primaryLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
