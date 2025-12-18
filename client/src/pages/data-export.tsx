// client/src/pages/data-export.tsx (ou votre chemin actuel)

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { KlyxorPageLayout } from "@/components/layout/KlyxorPageLayout";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/widgets/status-badge";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle,
  ChevronRight,
  Copy,
  Database,
  DollarSign,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  X,
} from "lucide-react";

type ExportFormat = "xlsx" | "csv";
type ExportStatus = "pending" | "in_progress" | "completed" | "failed";
type Step = "selection" | "refinement" | "preview" | "generation" | "history";
type TabKey = "export" | "history" | "settings";

interface ExportJob {
  id: string;
  name: string;
  domain: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  requestedAt: Date;
  completedAt?: Date;
  requestedBy: string;
  filters: string;
  columns: string[];
  rowCount?: number;
  fileSize?: string;
  traceId: string;
  errorMessage?: string;
}

type FilterOperator = "equals" | "contains" | "between" | "greater_than" | "less_than";
type LogicalOperator = "AND" | "OR";

interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string; // simplifié (UI)
  logicalOperator?: LogicalOperator;
}

interface DataColumn {
  id: string;
  name: string;
  field: string;
  included: boolean;
  required?: boolean;
}

function prettifyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusVariant(status: ExportStatus) {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "warning";
    case "pending":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: ExportStatus) {
  switch (status) {
    case "completed":
      return "Terminé";
    case "in_progress":
      return "En cours";
    case "pending":
      return "En attente";
    case "failed":
      return "Échec";
    default:
      return status;
  }
}

export default function DataExport() {
  // Typage volontairement souple pour éviter les soulignements TS côté data
  const { data: contracts = [] } = useQuery<any[]>({ queryKey: ["/api/contracts"] });
  const { data: indexations = [] } = useQuery<any[]>({ queryKey: ["/api/indexations"] });
  const { data: amendments = [] } = useQuery<any[]>({ queryKey: ["/api/amendments"] });

  const [activeTab, setActiveTab] = useState<TabKey>("export");
  const [currentStep, setCurrentStep] = useState<Step>("selection");

  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("xlsx");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<FilterRule[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<DataColumn[]>([]);

  const [previewData, setPreviewData] = useState<any[]>([]);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);

  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ExportJob | null>(null);

  const [showError, setShowError] = useState<string | null>(null);

  const dataDomains = useMemo(
    () => [
      { id: "contracts", name: "Contrats", icon: FileText, count: contracts.length },
      {
        id: "amounts",
        name: "Montants",
        icon: DollarSign,
        count: contracts.filter((c: any) => c?.annual_amount).length,
      },
      {
        id: "lifecycle",
        name: "États / cycle de vie",
        icon: Activity,
        count: contracts.filter((c: any) => c?.status).length,
      },
      { id: "indexations", name: "Indexations", icon: Database, count: indexations.length },
      { id: "payments", name: "Paiements", icon: Database, count: 0 },
      { id: "other", name: "Autres", icon: Archive, count: amendments.length },
    ],
    [contracts, indexations, amendments]
  );

  const domainColumns: Record<string, DataColumn[]> = useMemo(() => {
    const contractsCols: DataColumn[] =
      contracts.length > 0
        ? Object.keys(contracts[0] || {}).map((key, index) => ({
            id: String(index + 1),
            name: prettifyKey(key),
            field: key,
            included: ["contract_number", "contract_name", "start_date", "end_date", "status"].includes(key),
            required: key === "contract_number",
          }))
        : [
            { id: "1", name: "Numéro de contrat", field: "contractNumber", included: true, required: true },
            { id: "2", name: "Intitulé", field: "title", included: true },
            { id: "3", name: "Date de début", field: "startDate", included: true },
            { id: "4", name: "Date de fin", field: "endDate", included: true },
            { id: "5", name: "Montant", field: "amount", included: true },
            { id: "6", name: "Statut", field: "status", included: true },
          ];

    const indexationsCols: DataColumn[] =
      indexations.length > 0
        ? Object.keys(indexations[0] || {}).map((key, index) => ({
            id: String(index + 1),
            name: prettifyKey(key),
            field: key,
            included: true,
            required: false,
          }))
        : [];

    return { contracts: contractsCols, indexations: indexationsCols };
  }, [contracts, indexations]);

  const exportHistory: ExportJob[] = useMemo(() => {
    const realFromContracts: ExportJob[] =
      contracts.length > 0
        ? [
            {
              id: `EXP-${new Date().getFullYear()}-001`,
              name: `Export_Contrats_${new Date().toISOString().split("T")[0]}`,
              domain: "contracts",
              format: "xlsx",
              status: "completed",
              progress: 100,
              requestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
              completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 120000),
              requestedBy: "Utilisateur",
              filters: `Total: ${contracts.length} contrats`,
              columns: ["contract_number", "contract_name", "status"],
              rowCount: contracts.length,
              fileSize: `${(contracts.length * 0.005).toFixed(1)} MB`,
              traceId: `TRC-EXP-${new Date().getFullYear()}-001`,
            },
          ]
        : [];

    return [
      ...realFromContracts,
      {
        id: "EXP-2024-002",
        name: "Export_Indexations_Janvier",
        domain: "indexations",
        format: "csv",
        status: "completed",
        progress: 100,
        requestedAt: new Date("2024-01-15T14:30:00"),
        completedAt: new Date("2024-01-15T14:31:00"),
        requestedBy: "Pierre Durand",
        filters: "Période: Janvier 2024",
        columns: ["indexId", "contractNumber", "oldValue", "newValue"],
        rowCount: 89,
        fileSize: "156 KB",
        traceId: "TRC-EXP-2024-002",
      },
      {
        id: "EXP-2024-003",
        name: "Export_Paiements_2024",
        domain: "payments",
        format: "xlsx",
        status: "failed",
        progress: 45,
        requestedAt: new Date("2024-02-10T09:00:00"),
        requestedBy: "Sophie Bernard",
        filters: "Année: 2024",
        columns: ["paymentId", "amount", "date", "status"],
        errorMessage: "Timeout base de données",
        traceId: "TRC-EXP-2024-003",
      },
    ];
  }, [contracts]);

  const fieldOptions = useMemo(
    () => [
      { value: "contractNumber", label: "Numéro de contrat" },
      { value: "amount", label: "Montant" },
      { value: "status", label: "Statut" },
      { value: "supplier", label: "Fournisseur" },
    ],
    []
  );

  const operatorOptions = useMemo(
    () => [
      { value: "equals" as const, label: "=" },
      { value: "contains" as const, label: "Contient" },
      { value: "between" as const, label: "Entre" },
      { value: "greater_than" as const, label: ">" },
      { value: "less_than" as const, label: "<" },
    ],
    []
  );

  function resetSelection() {
    setSelectedDomain("");
    setSelectedFormat("xlsx");
    setDateRange({ from: "", to: "" });
    setSelectedFilters([]);
    setAdvancedFilters([]);
    setSelectedColumns([]);
    setPreviewData([]);
    setCurrentJob(null);
    setCurrentStep("selection");
    setShowError(null);
  }

  function handleDomainSelect(domain: string) {
    setSelectedDomain(domain);
    setSelectedColumns(domainColumns[domain] || []);
  }

  function handleColumnToggle(columnId: string) {
    setSelectedColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, included: !col.included } : col))
    );
  }

  function handleAddFilter() {
    setAdvancedFilters((prev) => [
      ...prev,
      {
        id: `filter-${Date.now()}`,
        field: "",
        operator: "equals",
        value: "",
        logicalOperator: prev.length > 0 ? "AND" : undefined,
      },
    ]);
  }

  function handleRemoveFilter(filterId: string) {
    setAdvancedFilters((prev) => prev.filter((f) => f.id !== filterId));
  }

  function handleUpdateFilter(filterId: string, patch: Partial<FilterRule>) {
    setAdvancedFilters((prev) => prev.map((f) => (f.id === filterId ? { ...f, ...patch } : f)));
  }

  function generatePreviewData() {
    return [
      { contractNumber: "CNT-2024-001", title: "Maintenance informatique", amount: "250 000 €", status: "Actif" },
      { contractNumber: "CNT-2024-002", title: "Location bureaux", amount: "180 000 €", status: "Actif" },
      { contractNumber: "CNT-2024-003", title: "Services de nettoyage", amount: "45 000 €", status: "Actif" },
      { contractNumber: "CNT-2024-004", title: "Fournitures de bureau", amount: "25 000 €", status: "Résilié" },
      { contractNumber: "CNT-2024-005", title: "Transport logistique", amount: "120 000 €", status: "En cours" },
    ];
  }

  function handleStartExport() {
    if (!selectedDomain) return;

    const newJob: ExportJob = {
      id: `EXP-${Date.now()}`,
      name: `Export_${selectedDomain}_${new Date().toISOString().split("T")[0]}`,
      domain: selectedDomain,
      format: selectedFormat,
      status: "in_progress",
      progress: 0,
      requestedAt: new Date(),
      requestedBy: "Utilisateur actuel",
      filters: `Période: ${dateRange.from || "—"} - ${dateRange.to || "—"}`,
      columns: selectedColumns.filter((c) => c.included).map((c) => c.field),
      traceId: `TRC-EXP-${Date.now()}`,
    };

    setCurrentJob(newJob);
    setCurrentStep("generation");

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(interval);
        setCurrentJob((prev) =>
          prev
            ? {
                ...prev,
                status: "completed",
                progress: 100,
                completedAt: new Date(),
                rowCount: 450,
                fileSize: "2.3 MB",
              }
            : null
        );
      } else {
        setCurrentJob((prev) => (prev ? { ...prev, progress } : null));
      }
    }, 450);
  }

  return (
    <>
      <KlyxorPageLayout
        title="Extraction des données"
        subtitle="Nouvelle extraction, historique et règles de gouvernance (RBAC / RGPD)."
        actions={() => (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetSelection}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        )}
      >
        {() => (
          <div className="max-w-7xl mx-auto space-y-6" data-testid="data-export-main">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
              <TabsList className="mb-2">
                <TabsTrigger value="export">Nouvelle extraction</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
                <TabsTrigger value="settings">Paramétrage</TabsTrigger>
              </TabsList>

              {/* -------------------- TAB EXPORT -------------------- */}
              <TabsContent value="export" className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Seules les données accessibles selon vos droits seront extraites.
                  </AlertDescription>
                </Alert>

                {/* STEP 1 - Selection */}
                {currentStep === "selection" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Domaine de données</CardTitle>
                        <CardDescription>Sélectionnez le type de données à extraire</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {dataDomains.map((domain) => {
                            const Icon = domain.icon;
                            const selected = selectedDomain === domain.id;
                            return (
                              <button
                                key={domain.id}
                                onClick={() => handleDomainSelect(domain.id)}
                                className={[
                                  "p-4 border rounded-lg text-left transition-all",
                                  "hover:shadow-md",
                                  selected ? "border-primary bg-primary/5" : "border-gray-200",
                                ].join(" ")}
                              >
                                <Icon className="w-8 h-8 mb-2 text-gray-600" />
                                <div className="font-medium">{domain.name}</div>
                                <div className="text-sm text-gray-500">{domain.count} enregistrements</div>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Période</CardTitle>
                        <CardDescription>Définissez la plage de dates pour l'extraction</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="date-from">Du</Label>
                            <Input
                              id="date-from"
                              type="date"
                              value={dateRange.from}
                              onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="date-to">Au</Label>
                            <Input
                              id="date-to"
                              type="date"
                              value={dateRange.to}
                              onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Filtres rapides</CardTitle>
                        <CardDescription>Sélectionnez plusieurs options pour affiner</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>Type de contrat</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {["Achat", "Vente", "Service", "Location"].map((type) => (
                                <Button
                                  key={type}
                                  variant={selectedFilters.includes(type) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    setSelectedFilters((prev) =>
                                      prev.includes(type) ? prev.filter((f) => f !== type) : [...prev, type]
                                    )
                                  }
                                >
                                  {type}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label>Statut</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {["Brouillon", "À valider", "Actif", "Résilié", "Clôturé"].map((status) => (
                                <Button
                                  key={status}
                                  variant={selectedFilters.includes(status) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    setSelectedFilters((prev) =>
                                      prev.includes(status) ? prev.filter((f) => f !== status) : [...prev, status]
                                    )
                                  }
                                >
                                  {status}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Format de sortie</CardTitle>
                        <CardDescription>Choisissez le format du fichier généré</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ExportFormat)}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="xlsx" id="xlsx" />
                            <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer">
                              <FileSpreadsheet className="w-4 h-4" />
                              Excel (.xlsx)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="csv" id="csv" />
                            <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                              <File className="w-4 h-4" />
                              CSV (.csv)
                            </Label>
                          </div>
                        </RadioGroup>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-sm">
                            <strong>Conformité & sécurité</strong>
                            <p className="text-gray-600 mt-1">
                              Accès selon profil RBAC • Traçabilité de l'action d'export • Conformité RGPD
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={resetSelection}>
                        Réinitialiser
                      </Button>
                      <Button onClick={() => setCurrentStep("refinement")} disabled={!selectedDomain}>
                        Continuer
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2 - Refinement */}
                {currentStep === "refinement" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Affiner l'extraction</h2>
                      <Badge variant="outline">
                        {selectedFormat === "xlsx" ? "Excel (.xlsx)" : "CSV (.csv)"}
                      </Badge>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Constructeur de filtres avancés</CardTitle>
                        <CardDescription>Ajoutez des conditions pour filtrer les données</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {advancedFilters.map((filter, index) => (
                            <div key={filter.id} className="space-y-2">
                              {index > 0 && (
                                <Select
                                  value={filter.logicalOperator}
                                  onValueChange={(v) =>
                                    handleUpdateFilter(filter.id, { logicalOperator: v as LogicalOperator })
                                  }
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="ET/OU" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AND">ET</SelectItem>
                                    <SelectItem value="OR">OU</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}

                              <div className="flex gap-2">
                                <Select
                                  value={filter.field}
                                  onValueChange={(v) => handleUpdateFilter(filter.id, { field: v })}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Champ" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fieldOptions.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Select
                                  value={filter.operator}
                                  onValueChange={(v) => handleUpdateFilter(filter.id, { operator: v as FilterOperator })}
                                >
                                  <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Opérateur" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {operatorOptions.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Input
                                  className="flex-1"
                                  placeholder="Valeur"
                                  value={filter.value}
                                  onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                                />

                                <Button variant="ghost" size="sm" onClick={() => handleRemoveFilter(filter.id)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Button variant="outline" onClick={handleAddFilter} className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter un filtre
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Colonnes à inclure</CardTitle>
                        <CardDescription>
                          Sélectionnez les champs à exporter (certaines colonnes peuvent être obligatoires)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedColumns.map((column) => (
                            <div key={column.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={column.id}
                                checked={column.included}
                                onCheckedChange={() => handleColumnToggle(column.id)}
                                disabled={column.required}
                              />
                              <Label htmlFor={column.id} className={`flex-1 ${column.required ? "font-medium" : ""}`}>
                                {column.name}
                                {column.required && <span className="text-xs text-gray-500 ml-2">(obligatoire)</span>}
                              </Label>
                            </div>
                          ))}
                        </div>

                        <Alert className="mt-4">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Les colonnes et lignes visibles respectent vos droits d'accès.
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep("selection")}>
                        Retour
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPreviewData(generatePreviewData());
                            setCurrentStep("preview");
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Aperçu (50 premières lignes)
                        </Button>
                        <Button onClick={handleStartExport} disabled={!selectedDomain}>
                          Lancer l'export
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 - Preview */}
                {currentStep === "preview" && (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">Aperçu</Badge>
                            <span className="text-sm text-gray-600">Filtres avancés : {advancedFilters.length || 0}</span>
                          </div>
                          <span className="text-sm font-medium">~{previewData.length * 90} lignes estimées</span>
                        </div>
                      </CardContent>
                    </Card>

                    {previewData.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Extrait (5 lignes)</CardTitle>
                          <CardDescription>Simulation d’un export selon vos paramètres</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  {selectedColumns
                                    .filter((c) => c.included)
                                    .slice(0, 4)
                                    .map((c) => (
                                      <th key={c.id} className="text-left p-3 text-sm text-gray-600">
                                        {c.name}
                                      </th>
                                    ))}
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.slice(0, 5).map((row, idx) => (
                                  <tr key={idx} className="border-b last:border-b-0">
                                    <td className="p-3 text-sm">{row.contractNumber}</td>
                                    <td className="p-3 text-sm">{row.title}</td>
                                    <td className="p-3 text-sm">{row.amount}</td>
                                    <td className="p-3 text-sm">
                                      <Badge variant="outline">{row.status}</Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
                            ... et {previewData.length * 90 - 5} autres lignes
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Aperçu vide</h3>
                          <p className="text-gray-500">
                            Aucun enregistrement ne correspond à vos filtres. Un fichier vide (entêtes uniquement) sera
                            généré si vous exportez.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep("refinement")}>
                        Modifier les filtres
                      </Button>
                      <Button onClick={handleStartExport} disabled={!selectedDomain}>
                        Lancer l'export
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4 - Generation */}
                {currentStep === "generation" && currentJob && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Génération de votre export...</h2>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{currentJob.name}</CardTitle>
                          <StatusBadge
                            variant={getStatusVariant(currentJob.status)}
                            text={getStatusLabel(currentJob.status)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Format :</span>
                              <span className="ml-2 font-medium">{currentJob.format === "xlsx" ? "Excel" : "CSV"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Horodatage :</span>
                              <span className="ml-2 font-medium">{formatDateTime(currentJob.requestedAt)}</span>
                            </div>
                          </div>

                          {currentJob.status === "in_progress" && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Progression</span>
                                <span>{currentJob.progress}%</span>
                              </div>
                              <Progress value={currentJob.progress} />
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Génération en cours...
                              </div>
                            </div>
                          )}

                          {currentJob.status === "completed" && (
                            <Alert className="border-green-200 bg-green-50">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertDescription>
                                Export terminé avec succès !
                                {currentJob.rowCount && ` ${currentJob.rowCount} lignes exportées.`}
                                {currentJob.fileSize && ` Taille : ${currentJob.fileSize}`}
                              </AlertDescription>
                            </Alert>
                          )}

                          {currentJob.status === "failed" && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                La génération a échoué — aucune donnée partielle n'a été produite.
                                {currentJob.errorMessage && <div className="mt-1">{currentJob.errorMessage}</div>}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-50">
                      <CardHeader>
                        <CardTitle className="text-base">Ce que contient le fichier</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Domaine :</span>
                            <span className="ml-2">{currentJob.domain}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Période :</span>
                            <span className="ml-2">
                              {dateRange.from || "—"} - {dateRange.to || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Filtres :</span>
                            <span className="ml-2">{currentJob.filters}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Colonnes :</span>
                            <span className="ml-2">{currentJob.columns.length}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveTab("history");
                          setCurrentStep("history");
                        }}
                      >
                        Voir l'historique
                      </Button>

                      <div className="flex gap-2">
                        {currentJob.status === "failed" && (
                          <Button variant="outline" onClick={handleStartExport}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Relancer
                          </Button>
                        )}
                        {currentJob.status === "completed" && (
                          <Button>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* -------------------- TAB HISTORY -------------------- */}
              <TabsContent value="history" className="space-y-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <Input type="date" placeholder="Période" />
                      <Input placeholder="Demandeur" />
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Domaine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contracts">Contrats</SelectItem>
                          <SelectItem value="indexations">Indexations</SelectItem>
                          <SelectItem value="payments">Paiements</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Terminé</SelectItem>
                          <SelectItem value="failed">Échec</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input placeholder="Rechercher par nom..." className="pl-10" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Historique des exports</CardTitle>
                    <CardDescription>Vous pouvez re-télécharger les fichiers déjà générés</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm text-gray-600">Date/heure</th>
                            <th className="text-left p-3 text-sm text-gray-600">Domaine</th>
                            <th className="text-left p-3 text-sm text-gray-600">Filtres</th>
                            <th className="text-left p-3 text-sm text-gray-600">Format</th>
                            <th className="text-left p-3 text-sm text-gray-600">Taille</th>
                            <th className="text-left p-3 text-sm text-gray-600">Statut</th>
                            <th className="text-left p-3 text-sm text-gray-600">Demandeur</th>
                            <th className="text-left p-3 text-sm text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exportHistory.map((job) => (
                            <tr key={job.id} className="border-b last:border-b-0">
                              <td className="p-3 text-sm">{formatDateTime(job.requestedAt)}</td>
                              <td className="p-3 text-sm">{job.domain}</td>
                              <td className="p-3 text-sm max-w-xs truncate">{job.filters}</td>
                              <td className="p-3 text-sm">
                                <Badge variant="outline">{job.format === "xlsx" ? "Excel" : "CSV"}</Badge>
                              </td>
                              <td className="p-3 text-sm">{job.fileSize || "-"}</td>
                              <td className="p-3 text-sm">
                                <StatusBadge variant={getStatusVariant(job.status)} text={getStatusLabel(job.status)} />
                              </td>
                              <td className="p-3 text-sm">{job.requestedBy}</td>
                              <td className="p-3 text-sm">
                                <div className="flex items-center gap-1">
                                  {job.status === "completed" && (
                                    <Button variant="ghost" size="sm">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedExport(job);
                                      setShowDetailPanel(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Lock className="w-4 h-4" />
                        L'accès aux exports et leur contenu restent soumis à vos droits ; toutes les actions sont
                        journalisées.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* -------------------- TAB SETTINGS -------------------- */}
              <TabsContent value="settings" className="space-y-6">
                <Alert className="border-amber-200 bg-amber-50">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    <strong>Section lecture seule</strong> - Configuration réservée aux administrateurs
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Règles d'extraction</CardTitle>
                    <CardDescription>Lecture pour tous, édition Admin uniquement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>Extraction limitée aux données visibles selon les droits RBAC</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>Formats disponibles : Excel (.xlsx) et CSV (.csv)</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>Limite maximale : 100 000 lignes par export</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div>Rétention des exports : 30 jours</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Gouvernance & conformité</CardTitle>
                    <CardDescription>Rappel des règles de conformité</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          RBAC (Role-Based Access Control)
                        </h4>
                        <p className="text-sm text-gray-600">
                          Les utilisateurs ne peuvent extraire que les données auxquelles ils ont accès selon leur profil.
                        </p>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <History className="w-4 h-4" />
                          Audit des actions d'export
                        </h4>
                        <p className="text-sm text-gray-600">
                          Toutes les actions d'export sont horodatées et tracées : auteur, paramètres, résultat.
                        </p>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Conformité RGPD
                        </h4>
                        <p className="text-sm text-gray-600">
                          Minimisation des données, limitation de finalité, et droit à l'effacement sur demande.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t">
                      <Button variant="outline" disabled className="opacity-50">
                        <Settings className="w-4 h-4 mr-2" />
                        Consulter les logs d'export (Admin)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {showError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {showError}
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowError(null)}>
                      Réessayer
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </KlyxorPageLayout>

      {/* Side panel details */}
      <Sheet open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <SheetContent className="w-[600px] overflow-y-auto">
          {selectedExport && (
            <>
              <SheetHeader>
                <SheetTitle>
                  <div className="flex items-center justify-between">
                    <span>{selectedExport.name}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        variant={getStatusVariant(selectedExport.status)}
                        text={getStatusLabel(selectedExport.status)}
                      />
                      <Badge variant="outline">{selectedExport.format === "xlsx" ? "Excel" : "CSV"}</Badge>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Paramètres appliqués</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">Domaine :</span>
                        <span className="ml-2 font-medium">{selectedExport.domain}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Période :</span>
                        <span className="ml-2 font-medium">Q1 2024</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Filtres :</span>
                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs">{selectedExport.filters}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Colonnes sélectionnées :</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedExport.columns.map((col) => (
                            <Badge key={col} variant="secondary" className="text-xs">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Traçabilité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Demandeur :</span>
                        <span className="font-medium">{selectedExport.requestedBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Horodatage :</span>
                        <span className="font-medium">{formatDateTime(selectedExport.requestedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Trace-ID :</span>
                        <span className="font-mono text-xs">{selectedExport.traceId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Résultat :</span>
                        <span className="font-medium">{selectedExport.status === "completed" ? "Succès" : "Échec"}</span>
                      </div>

                      {selectedExport.errorMessage && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">{selectedExport.errorMessage}</AlertDescription>
                        </Alert>
                      )}

                      {selectedExport.rowCount && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Lignes exportées :</span>
                          <span className="font-medium">{selectedExport.rowCount}</span>
                        </div>
                      )}

                      {selectedExport.fileSize && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Taille du fichier :</span>
                          <span className="font-medium">{selectedExport.fileSize}</span>
                        </div>
                      )}
                    </div>

                    <Separator className="my-4" />

                    <div>
                      <h4 className="font-medium mb-2">Journal des événements</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex gap-2">
                          <span className="text-gray-500">10:00:00</span>
                          <span>Demande initiée</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500">10:00:05</span>
                          <span>Extraction des données</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500">10:01:30</span>
                          <span>Génération du fichier</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-gray-500">10:02:00</span>
                          <span>Export terminé</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  {selectedExport.status === "completed" && (
                    <Button className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedDomain(selectedExport.domain);
                      setSelectedFormat(selectedExport.format);
                      setSelectedColumns(domainColumns[selectedExport.domain] || []);
                      setCurrentStep("refinement");
                      setActiveTab("export");
                      setShowDetailPanel(false);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copier les paramètres
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
