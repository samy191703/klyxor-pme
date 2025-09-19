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

import ContractWizard from "./components/wizard/ContractWizard";
import ValidationDialog from "./components/dialogs/ValidationDialog";
import AmendmentDialog from "./components/dialogs/AmendmentDialog";
import TerminationDialog from "./components/dialogs/TerminationDialog";
import ExportDialog from "./components/dialogs/ExportDialog";

import { fetchIndexationFormulas } from "../../services/indexation.api";
import ContractDetailsSheet from "./components/modals/ContractDetailsSheet";

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

  const [showWizard, setShowWizard] = useState(false);
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
  const { contracts, kpis, isLoading, filtered } = useContracts(filters);
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

  // Handlers
  function openWizard() {
    setShowWizard(true);
  }
  function closeWizard() {
    setShowWizard(false);
  }
  function submitWizard() {
    // submit to backend; createContract() already wires react-query invalidation + toast
    //createContract(payload);
    setShowWizard(false);
  }

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
    // You can extend this to pass `rejectionReason` and `validationComment` if your backend supports it
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
    // TODO: call your backend to create an amendment linked to selected.id
    // await fetch("/api/amendments", { method:"POST", body: JSON.stringify({ ...amendmentData, contractId: selected?.id }) })
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
    // TODO: call your backend to create a termination request
    // await fetch("/api/validation-requests", { method:"POST", body: JSON.stringify({ ...terminationData, contractId }) })
    setShowTermination(false);
  }

  function handleExport(opts: { format: string; range: string }) {
    // TODO: call your export endpoint with current filters + opts
    // await fetch("/api/contracts/export", { method:"POST", body: JSON.stringify({ filters, ...opts }) })
    // You can also trigger a download here.
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ContractsHeader />

      <main className="flex-1 overflow-y-auto px-4 py-2 lg:px-6 lg:py-1">
        <div className="max-w-7xl mx-3">
          {!showWizard ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
            >
              <TabsList className="mb-6">
                <TabsTrigger value="list">Contrats</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-6">
                <ContractsKpis kpis={kpis} loading={isLoading} />

                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <ContractsFilters
                        value={filters}
                        onChange={(patch) =>
                          setFilters((prev) => ({ ...prev, ...patch }))
                        }
                      />

                      {canCreateContract() && (
                        <Button
                          onClick={openWizard}
                          className="col-span-2 md:col-span-1"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Créer un contrat
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                      >
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
                />
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
            </Tabs>
          ) : (
            <ContractWizard
              indexationFormulas={formulas}
              onCancel={closeWizard}
              onSubmit={submitWizard}
            />
          )}
        </div>
      </main>

      {/* Details sheet */}
      <ContractDetailsSheet
        open={showDetails}
        onOpenChange={setShowDetails}
        contract={selected}
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
