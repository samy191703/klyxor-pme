/* Main page composition: tabs, filters, table, wizard, dialogs */
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContractsHeader from "./ContractsHeader";
import ContractsKpis from "./ContractsKpis";
import ContractsFilters, {
  type ContractsFiltersValue,
} from "./ContractsFilters";
import ContractsTable from "./ContractsTable";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
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

import { fetchIndexationFormulas } from "../../services/indexation.api";
import ContractDetailsSheet from "./components/modals/ContractDetailsSheet";
import { submitContractForValidation } from "@/services/contracts.api";
import { toast } from "@/hooks/use-toast";

export default function ContractsView() {
  const { canCreateContract, canExportData } = usePermissions();
  const [activeTab, setActiveTab] = useState<"list" | "history">("list");

  const [filters, setFilters] = useState<ContractsFiltersValue>({
    period: "all",
    status: "all",
    type: "all",
    businessUnit: "all",
    search: "",
    itemsPerPage: 25,
  });

  useEffect(() => {
    const handle = () => {
      const qs = new URLSearchParams(window.location.search);
      const wizard = qs.get("wizard"); // "create" | "edit" | null
      if (wizard === "create") {
        openWizard({ mode: "create", initialStep: 1, showNextStep: true });
      } else if (wizard === "edit") {
        const id = qs.get("id") || undefined;
        const step = Number(qs.get("step")) as 1 | 2 | 3 | 4 | 5;
        openWizard({
          mode: "edit",
          contractId: id,
          initialStep: (step && [1, 2, 3, 4, 5].includes(step) ? step : 1) as
            | 1
            | 2
            | 3
            | 4
            | 5,
          showNextStep: qs.get("showNext") !== "false",
        });
      } else {
        // no wizard param -> ensure closed (useful if user cleared query manually)
        setShowWizard(false);
      }
    };

    // run once and then on history/query changes
    handle();
    window.addEventListener("popstate", handle);
    window.addEventListener("app:location-query-changed", handle);
    return () => {
      window.removeEventListener("popstate", handle);
      window.removeEventListener("app:location-query-changed", handle);
    };
  }, []);

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

  // Details sheet
  const [showDetails, setShowDetails] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  // Dialog toggles
  const [showValidation, setShowValidation] = useState(false);
  const [showAmendment, setShowAmendment] = useState(false);
  const [showTermination, setShowTermination] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Dialog data/state
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

  // Data
  const { contracts, kpis, isLoading, filtered, refetch } =
    useContracts(filters);
  const { createContract, onValidate } = useContractActions();

  // Load indexation formulas for the wizard
  const [formulas, setFormulas] = useState<any[]>([]);
  useEffect(() => {
    let ignore = false;
    fetchIndexationFormulas()
      .then((list) => {
        if (!ignore) setFormulas(Array.isArray(list) ? list : []);
      })
      .catch(() => setFormulas([]));
    return () => {
      ignore = true;
    };
  }, []);

  // ---------- Handlers ----------
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
    // strip wizard-related params
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
    // If you keep a final onSubmit path, wire it here
    setShowWizard(false);
    refetch();
  }

  // Table actions
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
    // TODO: backend call
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
    // TODO: backend call
    setShowTermination(false);
  }

  function handleExport(opts: { format: string; range: string }) {
    // TODO: backend export call
  }

  // Edit shortcuts for the table kebab menu
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
    // TIP: if your ContractDetailsSheet supports an initial tab, pass it:
    // setDetailsInitialTab("uploads")
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ContractsHeader />
      <div className="mb-2 mt-3 px-4 py-2 lg:px-6 lg:py-1 flex items-center justify-between">
        <h1 className="ml-3 text-3xl font-bold text-gray-900">
          Gestion des contrats
        </h1>
        {canCreateContract() && !showWizard && (
          <Button
            onClick={() => openWizard({ mode: "create" })}
            className="col-span-2 md:col-span-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un contrat
          </Button>
        )}
        {/*  <p className="text-gray-500 mt-2">
              Gérez vos imports et exports de données
            </p> */}
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-2 lg:px-6 lg:py-1">
        <div className="max-w-7xl mx-3">
          {!showWizard ? (
            <>
              <ContractsKpis kpis={kpis} loading={isLoading} />

              <Card className="mb-3">
                <CardContent className="p-4 flex justify-between items-center gap-3">
                  <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <ContractsFilters
                      value={filters}
                      onChange={(patch) =>
                        setFilters((prev) => ({ ...prev, ...patch }))
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2 justify-end ">
                    <Button variant="outline" onClick={() => refetch()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Actualiser
                    </Button>
                    {canExportData() && (
                      <Button
                        variant="default"
                        onClick={() => setShowExport(true)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  La validation est requise pour l'activation d'un contrat.
                </AlertDescription>
              </Alert>

              <ContractsTable
                items={filtered.slice(0, filters.itemsPerPage)}
                onView={openDetails}
                onValidate={openValidation}
                total={filtered.length}
                pageSize={filters.itemsPerPage}
                onChangePageSize={(n) =>
                  setFilters((prev) => ({ ...prev, itemsPerPage: n }))
                }
                isLoading={isLoading}
                // NEW: edit shortcuts for the kebab menu
                onEditGeneral={handleEditGeneral}
                onEditPeriods={handleEditPeriods}
                onEditIndexation={handleEditIndexation}
                onOpenGed={handleOpenGed}
                onSubmitForValidation={async (c) => {
                  try {
                    await submitContractForValidation(
                      String(c.id),
                      "contract-creation"
                    );
                    toast({ title: "Contrat soumis pour validation." });
                    refetch(); // refresh list to show 'pending_validation'
                  } catch (e: any) {
                    toast({
                      title: e?.message ?? "Échec de soumission.",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </>
          ) : (
            /*             <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
            >
              <TabsList className="mb-6">
                <TabsTrigger value="list">Contrats</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-6">
                
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-gray-600">
                      Historique complet des modifications et actions sur les
                      contrats.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs> */
            <ContractWizard
              indexationFormulas={formulas}
              onCancel={closeWizard}
              onSubmit={submitWizard}
              // NEW: wire the edit/create behavior
              mode={wizardMode}
              contractId={wizardContractId}
              initialStep={wizardInitialStep}
              showNextStep={wizardShowNextStep}
            />
          )}
        </div>
      </main>

      {/* Details sheet */}
      <ContractDetailsSheet
        open={showDetails}
        onOpenChange={setShowDetails}
        contract={selected}
        // If your sheet supports it, you can add: initialTab="uploads"
      />

      {/* Validation */}
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

      {/* Amendment */}
      <AmendmentDialog
        open={showAmendment}
        onOpenChange={setShowAmendment}
        data={amendmentData}
        setData={setAmendmentData}
        onCreate={submitAmendment}
      />

      {/* Termination */}
      <TerminationDialog
        open={showTermination}
        onOpenChange={setShowTermination}
        contracts={contracts}
        data={terminationData}
        setData={setTerminationData}
        onCreate={(id) => submitTermination(id)}
      />

      {/* Export */}
      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        onExport={handleExport}
      />
    </div>
  );
}
