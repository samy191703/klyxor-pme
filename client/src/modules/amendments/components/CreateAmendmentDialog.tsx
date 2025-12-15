// client/src/modules/amendments/components/CreateAmendmentDialog.tsx

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { FileText, AlertTriangle } from "lucide-react";
import type { ContractRef } from "../domain/types";

export type ContractOption = ContractRef;

interface CreateAmendmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: ContractRef[];
  canCreate: boolean;
}

type Step = 1 | 2 | 3;

interface AmendmentFormState {
  contractId: string;
  type: string;
  title: string;
  effectiveDate: string;
  endDate: string;
  amountDelta: string;
  indexationImpact: string;
  reason: string;
  notes: string;
}

/**
 * Export nommé + export par défaut pour être compatible avec
 * `import { CreateAmendmentDialog } from ...` et `import CreateAmendmentDialog from ...`
 */
export function CreateAmendmentDialog({
  open,
  onOpenChange,
  contracts,
  canCreate,
}: CreateAmendmentDialogProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<AmendmentFormState>({
    contractId: "",
    type: "financial",
    title: "",
    effectiveDate: "",
    endDate: "",
    amountDelta: "",
    indexationImpact: "no_change",
    reason: "",
    notes: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetState = () => {
    setStep(1);
    setForm({
      contractId: "",
      type: "financial",
      title: "",
      effectiveDate: "",
      endDate: "",
      amountDelta: "",
      indexationImpact: "no_change",
      reason: "",
      notes: "",
    });
    setErrorMsg(null);
  };

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      // API simple : POST /api/amendments
      return await apiRequest("POST", "/api/amendments", payload);
    },
    onSuccess: () => {
      toast({
        title: "Avenant créé",
        description:
          "L'avenant a été créé avec succès. Vous pouvez maintenant le consulter dans la liste.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/amendments"] });
      onOpenChange(false);
      resetState();
    },
    onError: (err: any) => {
      console.error(err);
      setErrorMsg(
        err?.message ||
          "Une erreur est survenue lors de la création de l'avenant."
      );
      toast({
        title: "Erreur",
        description:
          err?.message ||
          "Impossible de créer l'avenant. Merci de réessayer.",
        variant: "destructive",
      });
    },
  });

  const handleClose = (openValue: boolean) => {
    if (!openValue) {
      onOpenChange(false);
      resetState();
    } else {
      onOpenChange(true);
    }
  };

  const goNext = () => {
    setErrorMsg(null);

    if (step === 1) {
      if (!form.contractId) {
        setErrorMsg("Merci de sélectionner un contrat.");
        return;
      }
    }

    if (step === 2) {
      if (!form.title.trim()) {
        setErrorMsg("Le titre de l'avenant est requis.");
        return;
      }
      if (!form.effectiveDate) {
        setErrorMsg("La date d'effet est requise.");
        return;
      }
      if (!form.reason.trim() || form.reason.trim().length < 10) {
        setErrorMsg(
          "Merci de détailler le motif de l'avenant (au moins 10 caractères)."
        );
        return;
      }
    }

    setStep((prev) => (prev === 1 ? 2 : 3));
  };

  const goBack = () => {
    setErrorMsg(null);
    setStep((prev) => (prev === 3 ? 2 : 1));
  };

  const handleSaveDraft = () => {
    // Pour l’instant, simple toast (à connecter plus tard à une API / stockage local)
    toast({
      title: "Brouillon enregistré",
      description:
        "Le brouillon de l'avenant a été enregistré localement (à connecter à l'API).",
    });
  };

  const handleSubmit = () => {
    setErrorMsg(null);

    if (!canCreate) {
      setErrorMsg(
        "Vous n'avez pas les droits pour créer des avenants. Contactez un administrateur."
      );
      return;
    }

    const payload = {
      contractId: form.contractId,
      type: form.type,
      title: form.title,
      effectiveDate: form.effectiveDate,
      endDate: form.endDate || null,
      amountDelta: form.amountDelta ? Number(form.amountDelta) : null,
      indexationImpact: form.indexationImpact,
      reason: form.reason,
      notes: form.notes,
      status: "draft", // ou "pending_validation" selon le workflow
    };

    mutation.mutate(payload);
  };

  const selectedContract = contracts.find((c) => c.id === form.contractId);
  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nouvel avenant</DialogTitle>
          <DialogDescription>
            Créez un avenant au contrat en suivant les étapes guidées.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="mt-2 mb-4">
          <div className="text-xs font-medium text-slate-600 mb-1">
            Étape {step} sur 3
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Contenu par étape */}
        <div className="space-y-6">
          {step === 1 && (
            <Step1ContractSelection
              form={form}
              setForm={setForm}
              contracts={contracts}
            />
          )}

          {step === 2 && (
            <Step2MainParameters
              form={form}
              setForm={setForm}
              selectedContract={selectedContract}
            />
          )}

          {step === 3 && (
            <Step3Summary form={form} selectedContract={selectedContract} />
          )}

          {errorMsg && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft}>
              Enregistrer en brouillon
            </Button>
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={goBack}
                disabled={mutation.isPending}
              >
                Retour
              </Button>
            )}
            {step < 3 && (
              <Button
                size="sm"
                onClick={goNext}
                disabled={mutation.isPending}
              >
                Suivant
              </Button>
            )}
            {step === 3 && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Création..." : "Créer l'avenant"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* === Étape 1 – Sélection contrat & type === */

function Step1ContractSelection({
  form,
  setForm,
  contracts,
}: {
  form: AmendmentFormState;
  setForm: (fn: (prev: AmendmentFormState) => AmendmentFormState) => void;
  contracts: ContractRef[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Étape 1 – Sélection du contrat
        </h3>
        <p className="text-xs text-slate-500">
          Sélectionnez le contrat concerné et le type d&apos;avenant.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Sélectionner un contrat</Label>
          <Select
            value={form.contractId}
            onValueChange={(v) =>
              setForm((prev) => ({ ...prev, contractId: v }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Sélectionner un contrat actif..." />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.number || c.code || c.id} – {c.title || c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-slate-500">
            Seuls les contrats actifs et non déjà résiliés/expirés sont listés
            (logique à brancher côté API).
          </p>
        </div>

        <div>
          <Label className="text-xs">Type d&apos;avenant</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setForm((prev) => ({ ...prev, type: v }))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="financial">Financier (montant)</SelectItem>
              <SelectItem value="duration">Durée</SelectItem>
              <SelectItem value="scope">Périmètre / services</SelectItem>
              <SelectItem value="indexation">Indexation</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* === Étape 2 – Paramètres principaux === */

function Step2MainParameters({
  form,
  setForm,
  selectedContract,
}: {
  form: AmendmentFormState;
  setForm: (fn: (prev: AmendmentFormState) => AmendmentFormState) => void;
  selectedContract?: ContractRef;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Étape 2 – Paramètres principaux
        </h3>
        <p className="text-xs text-slate-500">
          Définissez le titre, la date d&apos;effet et les impacts principaux de
          l&apos;avenant.
        </p>
      </div>

      {selectedContract && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-3">
            <p className="text-xs text-slate-500 mb-1">Contrat sélectionné</p>
            <p className="text-sm font-medium text-slate-900">
              {selectedContract.number || selectedContract.code} –{" "}
              {selectedContract.title || selectedContract.name}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Titre de l&apos;avenant</Label>
          <Input
            className="mt-1"
            placeholder="Ex : Avenant financier n°1 – indexation 2026"
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />
        </div>

        <div>
          <Label className="text-xs">Date d&apos;effet</Label>
          <Input
            className="mt-1"
            type="date"
            value={form.effectiveDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))
            }
          />
        </div>

        <div>
          <Label className="text-xs">Date de fin (optionnel)</Label>
          <Input
            className="mt-1"
            type="date"
            value={form.endDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, endDate: e.target.value }))
            }
          />
        </div>

        <div>
          <Label className="text-xs">
            Impact financier (Δ montant, optionnel)
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              type="number"
              placeholder="Ex : 5000"
              value={form.amountDelta}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amountDelta: e.target.value }))
              }
            />
            <div className="flex items-center text-xs text-slate-500">EUR</div>
          </div>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs">Impact sur l&apos;indexation</Label>
          <Select
            value={form.indexationImpact}
            onValueChange={(v) =>
              setForm((prev) => ({ ...prev, indexationImpact: v }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no_change">
                Aucun changement de formule
              </SelectItem>
              <SelectItem value="update_formula">
                Modification de la formule
              </SelectItem>
              <SelectItem value="suspension">
                Suspension temporaire de l&apos;indexation
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs">Motif de l&apos;avenant</Label>
          <Textarea
            className="mt-1"
            placeholder="Expliquez le motif de l'avenant, le contexte et les impacts attendus..."
            value={form.reason}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

/* === Étape 3 – Résumé === */

function Step3Summary({
  form,
  selectedContract,
}: {
  form: AmendmentFormState;
  selectedContract?: ContractRef;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Étape 3 – Vérification & résumé
        </h3>
        <p className="text-xs text-slate-500">
          Vérifiez les informations avant de créer l&apos;avenant.
        </p>
      </div>

      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">
            Contrat concerné
          </p>
          {selectedContract ? (
            <p className="text-sm font-medium text-slate-900">
              {selectedContract.number || selectedContract.code} –{" "}
              {selectedContract.title || selectedContract.name}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Aucun contrat sélectionné</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-2 text-sm">
          <p className="font-semibold text-slate-900">
            {form.title || "(Titre non renseigné)"}
          </p>
          <p className="text-xs text-slate-500 mb-2">
            Date d&apos;effet :{" "}
            {form.effectiveDate
              ? new Date(form.effectiveDate).toLocaleDateString("fr-FR")
              : "-"}
            {form.endDate && (
              <>
                {" "}
                • Fin :{" "}
                {new Date(form.endDate).toLocaleDateString("fr-FR")}
              </>
            )}
          </p>

          <p className="text-xs font-medium text-slate-500 mt-2">
            Type d&apos;avenant
          </p>
          <p className="text-sm text-slate-800">{form.type}</p>

          <p className="text-xs font-medium text-slate-500 mt-2">
            Impact financier
          </p>
          <p className="text-sm text-slate-800">
            {form.amountDelta
              ? `Δ ${Number(form.amountDelta).toLocaleString("fr-FR")} EUR`
              : "Aucun impact déclaré"}
          </p>

          <p className="text-xs font-medium text-slate-500 mt-2">
            Impact indexation
          </p>
          <p className="text-sm text-slate-800">{form.indexationImpact}</p>

          <p className="text-xs font-medium text-slate-500 mt-2">
            Motif de l&apos;avenant
          </p>
          <p className="text-sm text-slate-800 whitespace-pre-line">
            {form.reason || "-"}
          </p>

          {form.notes && (
            <>
              <p className="text-xs font-medium text-slate-500 mt-2">
                Notes internes
              </p>
              <p className="text-sm text-slate-800 whitespace-pre-line">
                {form.notes}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Alert className="border-blue-200 bg-blue-50 mt-2">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800">
          La validation de l&apos;avenant déclenchera les mises à jour
          contractuelles (montant, durée, indexation…) et la synchronisation
          vers les systèmes externes (à brancher).
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default CreateAmendmentDialog;
