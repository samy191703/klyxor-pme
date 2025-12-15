"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import * as RSelect from "@radix-ui/react-select";

// ShadCN UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// MUI (inputs only)
import TextField from "@mui/material/TextField";

import { useCreateTermination } from "../queries/useCreateTermination";
import { Contract } from "@shared/schema";
import { StatusPill } from "@/components/pills/contract-status-pill";

export interface ContractOption extends Contract {}
interface Props {
  open: boolean;
  onClose: () => void;
  contracts: ContractOption[];
}

type TerminationType = "non_renewal" | "mutual_agreement" | "breach" | "other";

type FormState = {
  contractId: string;
  contractNumber?: string;
  contractTitle?: string;
  effectiveDate: string; // yyyy-mm-dd
  reason: string;

  // ✅ Newly added (schema-aligned)
  type: TerminationType | ""; // required
  noticeDate: string; // optional (required if type === non_renewal)
  compensationAmount: string; // UI as string, server as decimal; optional >= 0
  description: string; // optional
};

const initialForm: FormState = {
  contractId: "",
  contractNumber: undefined,
  contractTitle: undefined,
  effectiveDate: "",
  reason: "",
  type: "",
  noticeDate: "",
  compensationAmount: "",
  description: "",
};

export default function CreateTerminationDialog({
  open,
  onClose,
  contracts,
}: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const create = useCreateTermination();

  // Local portal container for Radix popups (prevents dialog focus/portal conflicts)
  const popupContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setError(null);
      setStepError(null);
      setCurrentStep(1);
    }
  }, [open]);

  const selectableContracts = useMemo(
    () =>
      contracts.filter(
        (c) => c.status !== "terminated" && c.status !== "expired"
      ),
    [contracts]
  );
  const selected = useMemo(
    () => contracts.find((c) => c.id === form.contractId),
    [contracts, form.contractId]
  );

  const isValidISODate = (val: string) => /^\d{4}-\d{2}-\d{2}$/.test(val);

  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {};

    if (!form.contractId) errs.contractId = "Contrat requis.";
    if (!form.type) errs.type = "Type de résiliation requis.";
    if (form.effectiveDate && !isValidISODate(form.effectiveDate))
      errs.effectiveDate = "Date d'effet invalide (aaaa-mm-jj).";

    // Conditional: noticeDate required for non_renewal
    if (form.type === "non_renewal") {
      if (!form.noticeDate) {
        errs.noticeDate = "Date de préavis requise pour une non-reconduction.";
      } else if (!isValidISODate(form.noticeDate)) {
        errs.noticeDate = "Date de préavis invalide (aaaa-mm-jj).";
      }
    }

    // Compensation: optional, but if provided must be >= 0 and valid decimal
    if (form.compensationAmount.trim() !== "") {
      const n = Number(form.compensationAmount);
      if (Number.isNaN(n)) errs.compensationAmount = "Montant invalide.";
      else if (n < 0) errs.compensationAmount = "Le montant doit être ≥ 0.";
    }

    if (!form.reason.trim()) errs.reason = "Motif obligatoire.";

    return errs;
  }, [form]);

  const disabled = Object.keys(fieldErrors).length > 0;

  const parseApiError = (err: unknown): string => {
    const anyErr = err as any;
    const payload = anyErr?.response?.data ?? anyErr?.data ?? anyErr;
    const baseMessage =
      payload?.message ||
      anyErr?.message ||
      "Une erreur est survenue lors de la création.";
    const details: string[] = [];
    if (Array.isArray(payload?.errors)) {
      for (const e of payload.errors) {
        if (typeof e === "string") details.push(e);
        else if (e?.message) details.push(e.message);
        else if (e?.field && e?.error) details.push(`${e.field}: ${e.error}`);
      }
    } else if (payload?.errors && typeof payload.errors === "object") {
      for (const [k, v] of Object.entries(payload.errors)) {
        if (Array.isArray(v))
          details.push(`${k}: ${(v as string[]).join(", ")}`);
        else details.push(`${k}: ${String(v)}`);
      }
    }
    return details.length
      ? `${baseMessage}\n- ${details.join("\n- ")}`
      : baseMessage;
  };

  const goNext = () => {
    setStepError(null);
    if (currentStep === 1) {
      if (!form.contractId) {
        setStepError("Veuillez sélectionner un contrat.");
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (Object.keys(fieldErrors).length > 0) {
        setStepError("Veuillez corriger les erreurs avant de continuer.");
        return;
      }
      setCurrentStep(3);
      return;
    }
  };

  const goPrev = () => {
    setStepError(null);
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const saveDraft = () => onClose();

  const submit = async () => {
    if (disabled) {
      setError("Formulaire incomplet ou invalide.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        contractId: form.contractId,
        effectiveDate: (form.effectiveDate || undefined) as any,
        reason: form.reason.trim(),
        type: form.type as TerminationType,
        noticeDate: form.noticeDate ? (form.noticeDate as any) : undefined,
        compensationAmount:
          form.compensationAmount.trim() !== ""
            ? parseFloat(form.compensationAmount)
              ? form.compensationAmount
              : undefined
            : undefined,
        description: form.description?.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter" && !create.isPending) {
      if (currentStep < 3) {
        e.preventDefault();
        goNext();
      } else if (!disabled) {
        e.preventDefault();
        submit();
      }
    }
  };

  const progress = (currentStep / 3) * 100;
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  return (
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(v) => {
        if (create.isPending) return;
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto"
        onKeyDown={onKeyDown}
      >
        <DialogHeader>
          <DialogTitle>Nouvelle résiliation</DialogTitle>
          <Progress value={progress} className="mt-2" />
          <DialogDescription>Étape {currentStep} sur 3</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="whitespace-pre-line">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {stepError && (
          <Alert>
            <AlertDescription>{stepError}</AlertDescription>
          </Alert>
        )}

        {/* STEP 1 — Contrat */}
        {currentStep === 1 && (
          <div className="space-y-4 mt-2">
            <h3 className="font-medium">Étape 1 - Sélection du contrat</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Sélectionner un contrat
              </label>

              <RSelect.Root
                value={form.contractId}
                onValueChange={(value) => {
                  const c = contracts.find((x) => x.id === value);
                  setForm((f) => ({
                    ...f,
                    contractId: value,
                    contractNumber: c?.number,
                    contractTitle: c?.title,
                  }));
                }}
                disabled={create.isPending}
              >
                <RSelect.Trigger
                  aria-label="Contrat"
                  className={`inline-flex w-full items-center justify-between rounded-md border ${
                    !form.contractId && stepError
                      ? "border-red-500"
                      : "border-input"
                  } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <RSelect.Value placeholder="Sélectionner un contrat actif..." />
                  <RSelect.Icon className="ml-2 opacity-60">
                    <ChevronDown className="h-4 w-4" />
                  </RSelect.Icon>
                </RSelect.Trigger>

                <RSelect.Portal
                  container={popupContainerRef.current || undefined}
                >
                  <RSelect.Content
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
                  >
                    <RSelect.ScrollUpButton className="flex items-center justify-center py-1">
                      <ChevronUp className="h-4 w-4" />
                    </RSelect.ScrollUpButton>

                    <RSelect.Viewport className="p-1">
                      {selectableContracts.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Aucun contrat disponible
                        </div>
                      ) : (
                        selectableContracts.map((c) => (
                          <RSelect.Item
                            key={c.id}
                            value={c.id}
                            className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                          >
                            <RSelect.ItemText>
                              {c.number} — {c.title}
                            </RSelect.ItemText>
                            <RSelect.ItemIndicator className="absolute right-2 inline-flex items-center">
                              <Check className="h-4 w-4" />
                            </RSelect.ItemIndicator>
                          </RSelect.Item>
                        ))
                      )}
                    </RSelect.Viewport>

                    <RSelect.ScrollDownButton className="flex items-center justify-center py-1">
                      <ChevronDown className="h-4 w-4" />
                    </RSelect.ScrollDownButton>
                  </RSelect.Content>
                </RSelect.Portal>
              </RSelect.Root>

              <p className="text-xs text-gray-500">
                Seuls les contrats actifs et non déjà résiliés/expirés sont
                listés.
              </p>
            </div>

            {!!selected && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Contrat sélectionné</h4>
                  <div className="text-sm space-y-1">
                    <div>N°: {selected.number}</div>
                    <div>Titre: {selected.title}</div>
                    <div className="flex items-center gap-2">
                      <span>Statut:</span>
                      <StatusPill
                        status={selected.status}
                        variant="soft"
                        size="lg"
                      />
                    </div>
                    <div>
                      Dates: {fmt(selected.startDate as any)} —{" "}
                      {fmt(selected.endDate as any)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* STEP 2 — Paramètres */}
        {currentStep === 2 && (
          <div className="space-y-5 mt-2">
            <h3 className="font-medium">Étape 2 - Paramètres de la demande</h3>

            {/* Type (required) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type de résiliation *
              </label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as TerminationType }))
                }
                disabled={create.isPending}
              >
                <SelectTrigger
                  className={fieldErrors.type ? "border-red-500" : undefined}
                >
                  <SelectValue placeholder="Choisir un type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_renewal">Non-reconduction</SelectItem>
                  <SelectItem value="mutual_agreement">
                    Accord mutuel
                  </SelectItem>
                  <SelectItem value="breach">Rupture</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.type && (
                <p className="text-xs text-red-600">{fieldErrors.type}</p>
              )}
            </div>

            {/* Date d'effet */}
            <div>
              <label htmlFor="effective-date" className="text-sm font-medium">
                Date d'effet
              </label>
              <TextField
                id="effective-date"
                type="date"
                value={form.effectiveDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveDate: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                disabled={create.isPending}
                error={!!fieldErrors.effectiveDate}
                helperText={fieldErrors.effectiveDate || ""}
              />
              <p className="text-xs text-gray-500 mt-1">
                Contrôles : ≥ aujourd&apos;hui et ≥ date de début du contrat
              </p>
            </div>

            {/* Notice date (conditional) */}
            <div>
              <label htmlFor="notice-date" className="text-sm font-medium">
                Date de préavis{" "}
                {form.type === "non_renewal" ? (
                  <span className="text-red-600">*</span>
                ) : (
                  "(optionnel)"
                )}
              </label>
              <TextField
                id="notice-date"
                type="date"
                value={form.noticeDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, noticeDate: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
                disabled={create.isPending}
                error={!!fieldErrors.noticeDate}
                helperText={fieldErrors.noticeDate || ""}
              />
            </div>

            {/* Compensation */}
            <div>
              <label htmlFor="comp-amount" className="text-sm font-medium">
                Montant d&apos;indemnité (optionnel)
              </label>
              <TextField
                id="comp-amount"
                type="number"
                value={form.compensationAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, compensationAmount: e.target.value }))
                }
                fullWidth
                inputProps={{ min: 0, step: "0.01" }}
                disabled={create.isPending}
                error={!!fieldErrors.compensationAmount}
                helperText={fieldErrors.compensationAmount || ""}
              />
            </div>

            {/* Reason (required) */}
            <div>
              <label htmlFor="reason" className="text-sm font-medium">
                Motif de résiliation *
              </label>
              <TextField
                id="reason"
                placeholder="Expliquez la raison de la résiliation..."
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                fullWidth
                multiline
                minRows={4}
                disabled={create.isPending}
                error={!!fieldErrors.reason}
                helperText={fieldErrors.reason || ""}
              />
            </div>

            {/* Description (optional) */}
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Description (optionnel)
              </label>
              <TextField
                id="description"
                placeholder="Ajouter des détails supplémentaires si nécessaire…"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                fullWidth
                multiline
                minRows={3}
                disabled={create.isPending}
              />
            </div>

            <Card className="bg-amber-50">
              <CardContent className="text-sm space-y-2 p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Échéances :</strong> Les échéances postérieures au{" "}
                    {form.effectiveDate || "[date d'effet]"} seront supprimées
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Statut :</strong> Le contrat passera à "Résilié" à
                    la date d'effet
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Intégrations :</strong> Mise à jour automatique dans
                    SAP
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3 — Recap */}
        {currentStep === 3 && (
          <div className="space-y-4 mt-2">
            <h3 className="font-medium">
              Étape 3 - Récapitulatif & soumission
            </h3>
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">
                  Récapitulatif de la demande
                </h4>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contrat :</span>
                    <span className="font-medium">
                      {form.contractNumber ||
                        selected?.number ||
                        "Non sélectionné"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type :</span>
                    <span className="font-medium">
                      {
                        {
                          non_renewal: "Non-reconduction",
                          mutual_agreement: "Accord mutuel",
                          breach: "Rupture",
                          other: "Autre",
                          "": "—",
                        }[form.type]
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date d'effet :</span>
                    <span className="font-medium">
                      {form.effectiveDate || "Non définie"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date de préavis :</span>
                    <span className="font-medium">
                      {form.noticeDate || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Indemnité :</span>
                    <span className="font-medium">
                      {form.compensationAmount
                        ? `${Number(form.compensationAmount).toLocaleString(
                            "fr-FR",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )} €`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Motif :</span>
                    <div className="mt-1 p-2 bg-white rounded text-sm">
                      {form.reason || "Non renseigné"}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Description :</span>
                    <div className="mt-1 p-2 bg-white rounded text-sm">
                      {form.description || "—"}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valideur assigné :</span>
                    <span className="font-medium">
                      Jean Martin (selon règles de routage)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                En soumettant cette demande, vous déclenchez le workflow de
                validation et les notifications associées.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Separator className="my-3" />

        <Alert>
          <AlertDescription>
            La validation déclenchera la mise à jour du cycle de vie et la
            synchronisation SAP.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={goPrev}
                  disabled={create.isPending}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Précédent
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={create.isPending}
              >
                Enregistrer en brouillon
              </Button>
              {currentStep < 3 ? (
                <Button onClick={goNext} disabled={create.isPending}>
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={submit}
                  disabled={disabled || create.isPending}
                >
                  {create.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Soumission...
                    </>
                  ) : (
                    "Soumettre à validation"
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>

        {/* Stable portal container (if present, Select will mount here on subsequent opens) */}
        <div ref={popupContainerRef} />
      </DialogContent>
    </Dialog>
  );
}
