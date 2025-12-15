// client/src/modules/contracts/index.tsx
/* Page principale de gestion des contrats :
 * - Header + KPI
 * - Filtres + actions
 * - Tableau contrats
 * - Wizard de création / édition
 * - Fiche contrat en side sheet premium
 */

import { useEffect, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Plus, RefreshCw, Download } from "lucide-react";

import ContractsHeader from "./ContractsHeader";
import ContractsKpis from "./ContractsKpis";
import ContractsFilters, {
  type ContractsFiltersValue,
} from "./ContractsFilters";
import ContractsTable from "./ContractsTable";

import { useContracts } from "../../hooks/contrats/useContracts";
import { useContractActions } from "../../hooks/contrats/useContractActions";
import { usePermissions } from "@/hooks/usePermissions";

import ContractWizard, {
  type WizardMode,
} from "./components/wizard/ContractWizard";
import ValidationDialog from "./components/dialogs/ValidationDialog";
import AmendmentDialog from "./components/dialogs/AmendmentDialog";
import TerminationDialog from "./components/dialogs/TerminationDialog";
import ExportDialog from "./components/dialogs/ExportDialog";
import ContractDetailsSheet from "./components/modals/ContractDetailsSheet";

import { fetchIndexationFormulas } from "../../services/indexation.api";
import { submitContractForValidation } from "@/services/contracts.api";
import { toast } from "@/hooks/use-toast";

export default function MainContractsPage() {
  const { canCreateContract, canExportData } = usePermissions();

  // ---------- Onglet principal de la page (liste / historique) ----------
  const [activeTab, setActiveTab] = useState<"list" | "history">("list");

  // ---------- Filtres de la liste ----------
  const [filters, setFilters] = useState<ContractsFiltersValue>({
    period: "all",
    status: "all",
    type: "all",
    businessUnit: "all",
    search: "",
    itemsPerPage: 25,
  });

  // ---------- Wizard state ----------
  const [showWizard, setShowWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>("create");
  const [wizardContractId, setWizardContractId] = useState<string | undefined>(
    undefined
  );
  const [wizardInitialStep, setWizardInitialStep] = useState<1 | 2 | 3 | 4 | 5>(
    1
  );
  const [wizardShowNextStep, setWizardShowNextStep] = useState(true);

  // ---------- Détails & dialogs ----------
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const [showValidation, setShowValidation] = useState(false);
  const [showAmendment, setShowAmendment] = useState(false);
  const [showTermination, setShowTermination] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const [validationDecision, setValidationDecision] = useState<
    "" | "validate" | "reject"
  >("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [validationComment, setValidationComment] = useState("");

  const [amendmentData, setAmendmentData] = useState<any>({
    title: "",
    description: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    newAmount: "",
    impactDescription: "",
  });

  const [terminationData, setTerminationData] = useState<any>({
    contractId: "",
    terminationReason: "",
    terminationDate: new Date().toISOString().split("T")[0],
  });

  // ---------- Données contrats ----------
  const { contracts, kpis, isLoading, filtered, refetch } =
    useContracts(filters);
  const { onValidate } = useContractActions();

  // ---------- Formules d’indexation pour le wizard ----------
  const [formulas, setFormulas] = useState<any[]>([]);
  useEffect(() => {
    let ignore = false;

    fetchIndexationFormulas()
      .then((list) => {
        if (!ignore) {
          setFormulas(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => setFormulas([]));

    return () => {
      ignore = true;
    };
  }, []);

  // ---------- Helpers Wizard ----------
  type OpenWizardOpts = {
    mode: WizardMode;
    contractId?: string;
    initialStep?: 1 | 2 | 3 | 4 | 5;
    showNextStep?: boolean;
  };

  function openWizard(opts?: OpenWizardOpts) {
    setWizardMode(opts?.mode ?? "create");
    setWizardContractId(opts?.contractId);
    setWizardInitialStep(opts?.initialStep ?? 1);
    setWizardShowNextStep(opts?.showNextStep ?? true);
    setShowWizard(true);
  }

  function closeWizard() {
    setShowWizard(false);
    refetch();

    // Nettoyage des paramètres d’URL liés au wizard (par sécurité)
    const qs = new URLSearchParams(window.location.search);
    qs.delete("wizard");
    qs.delete("id");
    qs.delete("step");
    qs.delete("showNext");

    const next = qs.toString()
      ? `${window.location.pathname}?${qs.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, "", next);
    window.dispatchEvent(new CustomEvent("app:location-query-changed"));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function submitWizard() {
    setShowWizard(false);
    refetch();
  }

  // ---------- Actions table / fiche ----------
  function openDetails(c: any) {
    setSelected(c);
    setShowDetails(true);
  }

  function openValidation(c: any) {
    setSelected(c);
    setValidationDecision("");
    setRejectionReason("");
    setValidationComment("");
    setShowValidation(true);
  }

  function submitValidation() {
    if (!selected || !validationDecision) return;
    onValidate(selected, validationDecision);
    setShowValidation(false);
  }

  function openAmendment(c: any) {
    setSelected(c);
    setAmendmentData({
      title: "",
      description: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      newAmount: "",
      impactDescription: "",
    });
    setShowAmendment(true);
  }

  function submitAmendment() {
    // TODO: appel backend pour créer un avenant
    setShowAmendment(false);
  }

  function openTermination(c: any) {
    setSelected(c);
    setTerminationData((d: any) => ({
      ...d,
      contractId: String(c?.id || ""),
      terminationReason: "",
      terminationDate: new Date().toISOString().split("T")[0],
    }));
    setShowTermination(true);
  }

  function submitTermination(contractId: string) {
    // TODO: appel backend de résiliation
    setShowTermination(false);
  }

  function handleExport(opts: { format: string; range: string }) {
    // TODO: appel backend d’export (CSV / Excel / etc.)
    console.log("Export contrats", opts);
  }

  // ---------- Soumission en validation (table + fiche) ----------
  const handleSubmitForValidation = async (c: any) => {
    if (!c?.id) return;
    try {
      await submitContractForValidation(String(c.id), "contract-creation");
      toast({ title: "Contrat soumis pour validation." });
      refetch();
    } catch (e: any) {
      toast({
        title: e?.message ?? "Échec de la soumission.",
        variant: "destructive",
      });
    }
  };

  // ---------- Raccourcis édition pour wizard ----------
  const handleEditGeneral = (c: any) =>
    openWizard({
      mode: "edit",
      contractId: c.id,
      initialStep: 1,
      showNextStep: false,
    });

  const handleEditPeriods = (c: any) =>
    openWizard({
      mode: "edit",
      contractId: c.id,
      initialStep: 2,
      showNextStep: false,
    });

  const handleEditIndexation = (c: any) =>
    openWizard({
      mode: "edit",
      contractId: c.id,
      initialStep: 3,
      showNextStep: false,
    });

  const handleOpenGed = (c: any) => {
    setSelected(c);
    setShowDetails(true);
  };

  // Handler PDF (simple hook, à adapter quand ton endpoint sera prêt)
  const handleDownloadPdf = (c: any) => {
    if (!c?.id) return;
    window.open(`/api/contracts/${c.id}/pdf`, "_blank");
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Header global contrats (aligné avec le style dashboard) */}
      <ContractsHeader />

      {/* Bandeau de titre + CTA créa contrat */}
      <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b bg-white">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Gestion des contrats
          </h1>
          <p className="text-sm text-slate-500">
            Vue consolidée des contrats, avenants et résiliations.
          </p>
        </div>

        {canCreateContract() && !showWizard && (
          <Button
            onClick={() => openWizard({ mode: "create" })}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouveau contrat
          </Button>
        )}
      </div>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">
        <div className="mx-auto w-full max-w-6xl">
          {!showWizard ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "list" | "history")}
              className="space-y-4"
            >
              <TabsList className="w-full justify-start rounded-xl bg-slate-100 p-1">
                <TabsTrigger
                  value="list"
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Contrats
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Historique
                </TabsTrigger>
              </TabsList>

              {/* Onglet LISTE des contrats */}
              <TabsContent value="list" className="space-y-6">
                {/* KPIs contrats */}
                <ContractsKpis
                  kpis={kpis}
                  loading={isLoading}
                  onSelectStatus={(statusKey) =>
                    setFilters((prev) => ({
                      ...prev,
                      status:
                        statusKey === "draft"
                          ? "draft"
                          : statusKey === "to_validate"
                          ? "pending_validation"
                          : statusKey === "active"
                          ? "active"
                          : statusKey === "terminated"
                          ? "terminated"
                          : statusKey === "closed"
                          ? "closed"
                          : prev.status,
                    }))
                  }
                />

                {/* Filtres + actions liste */}
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="w-full lg:w-auto">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                        <ContractsFilters
                          value={filters}
                          onChange={(patch) =>
                            setFilters((prev) => ({ ...prev, ...patch }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Actualiser
                      </Button>

                      {canExportData() && (
                        <Button
                          variant="default"
                          onClick={() => setShowExport(true)}
                          className="inline-flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Exporter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Info process validation */}
                <Alert className="border-amber-200 bg-amber-50/80">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm text-amber-900">
                    La validation est requise pour l&apos;activation d&apos;un
                    contrat. Utilisez le menu d&apos;actions sur chaque ligne
                    pour soumettre un contrat en validation, créer un avenant ou
                    lancer une résiliation.
                  </AlertDescription>
                </Alert>

                {/* Table contrats */}
                <ContractsTable
                  items={filtered.slice(0, filters.itemsPerPage)}
                  total={filtered.length}
                  pageSize={filters.itemsPerPage}
                  onChangePageSize={(n) =>
                    setFilters((prev) => ({ ...prev, itemsPerPage: n }))
                  }
                  isLoading={isLoading}
                  onView={openDetails}
                  onValidate={openValidation}
                  onSubmitForValidation={handleSubmitForValidation}
                  onEditGeneral={handleEditGeneral}
                  onEditPeriods={handleEditPeriods}
                  onEditIndexation={handleEditIndexation}
                  onOpenGed={handleOpenGed}
                />
              </TabsContent>

              {/* Onglet HISTORIQUE (à enrichir plus tard) */}
              <TabsContent value="history" className="space-y-4">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="space-y-2 p-6">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Historique des contrats
                    </h2>
                    <p className="text-sm text-slate-600">
                      Visualisez ici l’historique des actions clés sur vos
                      contrats (créations, validations, avenants, résiliations,
                      exports…).
                    </p>
                    <p className="text-xs text-slate-500">
                      Astuce PME : commencez simple en listant les dernières
                      actions importantes, puis affinez ensuite (filtres par
                      période, BU, type d’action, etc.).
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <ContractWizard
              indexationFormulas={formulas}
              onCancel={closeWizard}
              onSubmit={submitWizard}
              mode={wizardMode}
              contractId={wizardContractId}
              initialStep={wizardInitialStep}
              showNextStep={wizardShowNextStep}
            />
          )}
        </div>
      </main>

      {/* FICHE CONTRAT (détails QUICK VIEW) */}
      <ContractDetailsSheet
        open={showDetails}
        onOpenChange={setShowDetails}
        contract={selected}
        onEdit={handleEditGeneral}
        onTerminate={openTermination}
        onSubmitForValidation={handleSubmitForValidation}
        onDownloadPdf={handleDownloadPdf}
      />

      {/* VALIDATION */}
      <ValidationDialog
        open={showValidation}
        onOpenChange={setShowValidation}
        contract={selected}
        decision={validationDecision}
        setDecision={setValidationDecision}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        validationComment={validationComment}
        setValidationComment={setValidationComment}
        onSubmit={submitValidation}
      />

      {/* AVENANT */}
      <AmendmentDialog
        open={showAmendment}
        onOpenChange={setShowAmendment}
        data={amendmentData}
        setData={setAmendmentData}
        onCreate={submitAmendment}
      />

      {/* RÉSILIATION */}
      <TerminationDialog
        open={showTermination}
        onOpenChange={setShowTermination}
        contracts={contracts}
        data={terminationData}
        setData={setTerminationData}
        onCreate={(id) => submitTermination(id)}
      />

      {/* EXPORT */}
      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        onExport={handleExport}
      />
    </div>
  );
}
