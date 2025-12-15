// client/src/pages/contracts-new.tsx

import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ClientSelect } from "@/components/ClientSelect";
import { usePermissions } from "@/hooks/usePermissions";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";
import { Calendar, Euro, FileText } from "lucide-react";

type ContractBackendType = "gas" | "fleet" | "ele" | "electricity";

type BillingPeriodicity = "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_OFF";
type BillingType = "IN_ADVANCE" | "IN_ARREARS";
type ContractStatus = "DRAFT" | "ACTIVE" | "CLOSED";
type PlanGenerationMode = "AUTO" | "MANUAL";

interface ContractFormValues {
  number: string;
  title: string;
  description: string;

  clientId: string;
  clientName: string;
  // plus de BU côté front
  type: ContractBackendType | "";

  currency: string;
  amount: string;

  startDate: string;
  endDate: string;

  billingPeriodicity: BillingPeriodicity | "";
  billingType: BillingType | "";
  planGenerationMode: PlanGenerationMode;

  isIndexed: boolean;
  status: ContractStatus;
}

const INITIAL_VALUES: ContractFormValues = {
  number: "",
  title: "",
  description: "",

  clientId: "",
  clientName: "",
  type: "",

  currency: "EUR",
  amount: "",

  startDate: "",
  endDate: "",

  billingPeriodicity: "MONTHLY",
  billingType: "IN_ADVANCE",
  planGenerationMode: "AUTO",

  isIndexed: false,
  status: "DRAFT",
};

export default function NewContractPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { canCreateContract } = usePermissions();

  const [values, setValues] = useState<ContractFormValues>(INITIAL_VALUES);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);

  // --- Validation basique avant appel API ---
  const validateForCreate = (): string[] => {
    const errors: string[] = [];

    if (!values.title.trim()) {
      errors.push("Le titre du contrat est obligatoire.");
    }
    if (!values.clientName.trim()) {
      errors.push("Le client est obligatoire (sélectionner un client).");
    }
    if (!values.type) {
      errors.push("Le type de contrat est obligatoire.");
    }
    if (!values.startDate) {
      errors.push("La date de début est obligatoire.");
    }
    if (!values.billingPeriodicity) {
      errors.push("La périodicité de facturation est obligatoire.");
    }
    if (!values.billingType) {
      errors.push("Le type de facturation est obligatoire.");
    }

    return errors;
  };

  const validateForDraft = (): string[] => {
    const errors: string[] = [];

    if (!values.title.trim()) {
      errors.push(
        "Le titre du contrat est obligatoire pour enregistrer un brouillon.",
      );
    }
    if (!values.clientName.trim()) {
      errors.push(
        "Le client est obligatoire pour enregistrer un brouillon.",
      );
    }

    return errors;
  };

  // --- Helpers mapping pour le backend ---

  const mapBillingTypeToBackend = (t: BillingType): string => {
    if (t === "IN_ADVANCE") return "A_ECHOIR";
    if (t === "IN_ARREARS") return "A_ECHU";
    return "A_ECHOIR";
  };

  // --- Mutation API : POST /api/contracts ---
  const mutation = useMutation({
    mutationFn: async (payload: ContractFormValues) => {
      const body = {
        // Champs principaux
        number: payload.number || undefined,
        title: payload.title.trim(),
        status: payload.status === "ACTIVE" ? "active" : "draft",

        // Type métier backend
        type: payload.type, // valeur "gas" | "fleet" | "ele" | "electricity"
        contractType: payload.type,

        // Client (toutes variantes possibles)
        ClientName: payload.clientName.trim(),
        clientName: payload.clientName.trim(),
        client_id: payload.clientId || null,
        clientId: payload.clientId || null,

        // BU : gérée uniquement côté back, valeur fixe
        businessUnit: "ENGIE",
        BusinessUnit: "ENGIE",

        // Finance
        amount: payload.amount ? Number(payload.amount) : null,
        currency: payload.currency || "EUR",
        tvaRate: "0.10",
        billingPeriod: "monthly",
        billingFrequency: null,
        billingType: mapBillingTypeToBackend(payload.billingType),
        paymentType: "virement",

        // Dates
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,

        // Indexation
        indexationEnabled: payload.isIndexed,
        indexationFrequency: payload.isIndexed ? "annuel" : null,
        indexationDate: payload.isIndexed ? payload.startDate || null : null,
      };

      console.log("[NewContractPage] Payload envoyé à /api/contracts :", body);

      const res = await apiRequest("POST", "/api/contracts", body);
      const json = await res.json();
      console.log("[NewContractPage] Réponse /api/contracts :", json);
      return json;
    },
    onSuccess: async (created: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });

      toast({
        title: "Contrat créé",
        description: "Le contrat a été enregistré avec succès.",
      });

      const id =
        created?.id ||
        created?.contractId ||
        created?.contract_id ||
        created?.number ||
        created?.contract_number;

      if (id) {
        navigate(`/contracts/${id}`);
      } else {
        navigate("/contracts");
      }
    },
    onError: (error: any) => {
      console.error("Erreur création contrat", error);
      const message =
        error instanceof Error ? error.message : "Erreur inconnue.";
      toast({
        title: "Erreur",
        description:
          "Impossible d'enregistrer le contrat : " + message,
        variant: "destructive",
      });
    },
  });

  const handleChange =
    (field: keyof ContractFormValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = e.target;
      setValues((prev) => ({ ...prev, [field]: value }));
    };

  const handleSelect =
    (field: keyof ContractFormValues) => (value: string) => {
      setValues((prev) => ({ ...prev, [field]: value as any }));
    };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canCreateContract) {
      toast({
        title: "Accès refusé",
        description:
          "Vous n'avez pas les droits nécessaires pour créer un contrat.",
        variant: "destructive",
      });
      return;
    }

    const errors = validateForCreate();
    if (errors.length > 0) {
      toast({
        title: "Formulaire incomplet",
        description: errors.join(" "),
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({ ...values, status: "ACTIVE" });
  };

  const handleSaveDraft = () => {
    if (!canCreateContract) {
      toast({
        title: "Accès refusé",
        description:
          "Vous n'avez pas les droits nécessaires pour créer un contrat.",
        variant: "destructive",
      });
      return;
    }

    const errors = validateForDraft();
    if (errors.length > 0) {
      toast({
        title: "Formulaire brouillon incomplet",
        description: errors.join(" "),
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingDraft(true);
    const draft: ContractFormValues = {
      ...values,
      status: "DRAFT",
    };
    mutation.mutate(draft, {
      onSettled: () => setIsSubmittingDraft(false),
    });
  };

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className={cn(
            "text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
          onClick={() => navigate("/contracts")}
        >
          Annuler
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isLoading || isSubmittingDraft}
          className={cn(
            "text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
          onClick={handleSaveDraft}
        >
          Enregistrer en brouillon
        </Button>
        <Button
          type="submit"
          form="contract-create-form"
          className="text-xs bg-[var(--klyxor-bleu-nuit,#111827)] text-white hover:bg-slate-900"
          disabled={mutation.isLoading}
        >
          Créer le contrat
        </Button>
      </div>
    );
  };

  return (
    <KlyxorPageLayout
      title="Nouveau contrat"
      subtitle="Créez un contrat et configurez ses principales caractéristiques."
      actions={renderHeaderActions}
    >
      {(theme) => {
        const { sectionCardClass, primaryText, mutedText } = theme;

        if (!canCreateContract) {
          return (
            <Card className={sectionCardClass}>
              <CardContent className="p-6">
                <p className="text-sm text-red-600">
                  Vous n&apos;avez pas les droits nécessaires pour créer un
                  contrat.
                </p>
              </CardContent>
            </Card>
          );
        }

        return (
          <form
            id="contract-create-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Bloc 1 : Informations principales */}
            <Card className={sectionCardClass}>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className={cn("text-sm font-semibold", primaryText)}>
                  Informations principales
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 px-4 pb-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    N° de contrat
                  </Label>
                  <Input
                    placeholder="Saisir le numéro de contrat"
                    value={values.number}
                    onChange={handleChange("number")}
                  />
                  <p className={cn("text-[11px]", mutedText)}>
                    Si laissé vide, un numéro pourra être généré automatiquement
                    côté système.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Titre du contrat
                  </Label>
                  <Input
                    placeholder="Ex : Contrat de maintenance centrale X"
                    value={values.title}
                    onChange={handleChange("title")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-medium">Description</Label>
                  <Textarea
                    placeholder="Résumé du périmètre, prestations, sites concernés..."
                    rows={3}
                    value={values.description}
                    onChange={handleChange("description")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bloc 2 : Client (BU gérée côté back uniquement) */}
            <Card className={sectionCardClass}>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className={cn("text-sm font-semibold", primaryText)}>
                  Client & rattachement
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 px-4 pb-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Client</Label>
                  <ClientSelect
                    value={values.clientId}
                    onChange={(id, option) =>
                      setValues((prev) => ({
                        ...prev,
                        clientId: id || "",
                        clientName: option?.name || "",
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Type de contrat</Label>
                  <Select
                    value={values.type}
                    onValueChange={handleSelect("type")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gas">Gaz</SelectItem>
                      <SelectItem value="fleet">Flotte</SelectItem>
                      <SelectItem value="ele">
                        Électricité (code court)
                      </SelectItem>
                      <SelectItem value="electricity">
                        Électricité (long)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Bloc 3 : Durée, montants, facturation */}
            <Card className={sectionCardClass}>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className={cn("text-sm font-semibold", primaryText)}>
                  Durée & facturation
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 px-4 pb-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Date de début
                  </Label>
                  <Input
                    type="date"
                    value={values.startDate}
                    onChange={handleChange("startDate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Date de fin
                  </Label>
                  <Input
                    type="date"
                    value={values.endDate}
                    onChange={handleChange("endDate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Euro className="h-3.5 w-3.5" />
                    Montant contractuel
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={values.amount}
                    onChange={handleChange("amount")}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Devise</Label>
                  <Select
                    value={values.currency}
                    onValueChange={handleSelect("currency")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Devise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Périodicité de facturation
                  </Label>
                  <Select
                    value={values.billingPeriodicity}
                    onValueChange={handleSelect("billingPeriodicity")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensuelle</SelectItem>
                      <SelectItem value="QUARTERLY">Trimestrielle</SelectItem>
                      <SelectItem value="YEARLY">Annuelle</SelectItem>
                      <SelectItem value="ONE_OFF">Ponctuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Type de facturation
                  </Label>
                  <Select
                    value={values.billingType}
                    onValueChange={handleSelect("billingType")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_ADVANCE">
                        À échoir (en avance)
                      </SelectItem>
                      <SelectItem value="IN_ARREARS">
                        Échu (en arriérés)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Mode de génération de l&apos;échéancier
                  </Label>
                  <Select
                    value={values.planGenerationMode}
                    onValueChange={handleSelect("planGenerationMode")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">
                        Automatique (recommandé)
                      </SelectItem>
                      <SelectItem value="MANUAL">
                        Manuel (échéancier saisi manuellement)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 md:col-span-3">
                  <Switch
                    checked={values.isIndexed}
                    onCheckedChange={(checked) =>
                      setValues((prev) => ({ ...prev, isIndexed: checked }))
                    }
                  />
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      Contrat indexé
                    </Label>
                    <p className={cn("text-[11px]", mutedText)}>
                      Activez cette option si le contrat est soumis à
                      indexation automatique (indices INSEE, formules, etc.).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        );
      }}
    </KlyxorPageLayout>
  );
}
