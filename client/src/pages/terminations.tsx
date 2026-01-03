import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/widgets/status-badge";
import {
  XCircle,
  Plus,
  Eye,
  Check,
  X,
  Calendar,
  FileText,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Download,
  ChevronRight,
  ChevronLeft,
  History,
  Settings,
  User,
  Building,
  Bell,
  Link,
  Timer,
  Mail,
  AlertTriangle,
  Info,
  CheckCircle,
  MessageSquare,
  FileDown,
  Archive,
  Shield,
  Database,
  RefreshCw,
} from "lucide-react";
import Header from "@/components/layout/header";

// Type definitions
interface Termination {
  id: string;
  contractId: string;
  contractNumber: string;
  contractTitle: string;
  reason: string;
  effectiveDate: Date;
  status: "draft" | "to_validate" | "validated" | "rejected";
  assignedValidator: string | null;
  lastUpdate: Date;
  requestedBy: string;
  createdAt: Date;
  validatedBy?: string | null;
  validatedAt?: Date | null;
  rejectionReason?: string | null;
  sla?: number; // heures restantes
  history?: Array<{
    id: string;
    action: string;
    date: Date;
    user: string;
    details?: string;
    traceId: string;
  }>;
  impact?: {
    lifecycle: string;
    deadlines: string;
    integrations: string;
  };
}

interface RoutingRule {
  id: string;
  name: string;
  businessUnit: string;
  threshold?: number;
  validator: string;
  substitute?: string;
  active: boolean;
}

interface NotificationTemplate {
  id: string;
  type: "submitted" | "validated" | "rejected";
  channel: "in-app" | "email" | "teams";
  template: string;
  active: boolean;
}

export default function Terminations() {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"list" | "history" | "settings">(
    "list"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTermination, setSelectedTermination] =
    useState<Termination | null>(null);
  const [showNewTerminationDialog, setShowNewTerminationDialog] =
    useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationDecision, setValidationDecision] = useState<
    "validate" | "reject"
  >("validate");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  // Query pour récupérer les contrats actifs
  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ["/api/contracts"],
    enabled: showNewTerminationDialog, // Only fetch when dialog is open
  });

  // Mutation pour créer une demande de résiliation
  const createTerminationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/validation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create termination request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/validation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Demande de résiliation créée",
        description: "La demande de résiliation a été envoyée pour validation.",
      });
      setShowNewTerminationDialog(false);
      resetNewTerminationForm();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la demande de résiliation.",
        variant: "destructive",
      });
    },
  });

  // Settings states
  const [slaEnabled, setSlaEnabled] = useState(true);
  const [slaHours, setSlaHours] = useState(24);
  const [autoReminders, setAutoReminders] = useState(true);
  const [sapSync, setSapSync] = useState(true);

  // New termination form data
  const [newTermination, setNewTermination] = useState({
    contractId: "",
    contractNumber: "",
    contractTitle: "",
    effectiveDate: "",
    reason: "",
    validator: "",
  });

  // Mock data with complete specification compliance
  const terminations: Termination[] = [
    {
      id: "RE-2024-001",
      contractId: "cnt-1",
      contractNumber: "CNT-2024-001",
      contractTitle: "Maintenance informatique",
      reason: "Non-renouvellement à échéance suite à changement de prestataire",
      effectiveDate: new Date("2024-03-31"),
      status: "to_validate",
      assignedValidator: "Jean Martin",
      lastUpdate: new Date("2024-02-01"),
      requestedBy: "Marie Dupont",
      createdAt: new Date("2024-02-01"),
      sla: 18,
      impact: {
        lifecycle: "Le contrat passera à 'Résilié' à la date d'effet",
        deadlines: "Suppression des échéances postérieures au 31/03/2024",
        integrations: "Mise à jour du statut dans SAP",
      },
      history: [
        {
          id: "h-1",
          action: "Création",
          date: new Date("2024-02-01T10:00:00"),
          user: "Marie Dupont",
          details: "Demande créée en brouillon",
          traceId: "TRC-2024-RE-001-001",
        },
        {
          id: "h-2",
          action: "Soumission",
          date: new Date("2024-02-01T14:30:00"),
          user: "Marie Dupont",
          details: "Soumise à validation",
          traceId: "TRC-2024-RE-001-002",
        },
      ],
    },
    {
      id: "RE-2024-002",
      contractId: "cnt-2",
      contractNumber: "CNT-2023-045",
      contractTitle: "Location bureaux",
      reason: "Résiliation amiable - déménagement du siège social",
      effectiveDate: new Date("2024-06-30"),
      status: "validated",
      assignedValidator: "Sophie Bernard",
      lastUpdate: new Date("2024-01-15"),
      requestedBy: "Pierre Durand",
      createdAt: new Date("2024-01-10"),
      validatedBy: "Sophie Bernard",
      validatedAt: new Date("2024-01-15"),
      impact: {
        lifecycle: "Contrat résilié avec effet au 30/06/2024",
        deadlines: "Échéances supprimées après le 30/06/2024",
        integrations: "Statut SAP mis à jour",
      },
    },
    {
      id: "RE-2024-003",
      contractId: "cnt-3",
      contractNumber: "CNT-2024-008",
      contractTitle: "Services de nettoyage",
      reason:
        "Résiliation pour faute - non-respect des engagements contractuels",
      effectiveDate: new Date("2024-02-29"),
      status: "draft",
      assignedValidator: null,
      lastUpdate: new Date("2024-02-10"),
      requestedBy: "Marie Dupont",
      createdAt: new Date("2024-02-10"),
    },
    {
      id: "RE-2024-004",
      contractId: "cnt-4",
      contractNumber: "CNT-2023-089",
      contractTitle: "Fournitures de bureau",
      reason: "Fin de contrat",
      effectiveDate: new Date("2024-05-31"),
      status: "rejected",
      assignedValidator: "Jean Martin",
      lastUpdate: new Date("2024-02-05"),
      requestedBy: "Sophie Bernard",
      createdAt: new Date("2024-02-03"),
      validatedBy: "Jean Martin",
      validatedAt: new Date("2024-02-05"),
      rejectionReason:
        "Date d'effet antérieure au délai de préavis contractuel",
    },
  ];

  // Routing rules mock data
  const routingRules: RoutingRule[] = [
    {
      id: "rule-1",
      name: "BU France - Contrats < 100k€",
      businessUnit: "BU France",
      threshold: 100000,
      validator: "Jean Martin",
      substitute: "Sophie Bernard",
      active: true,
    },
    {
      id: "rule-2",
      name: "BU International - Tous contrats",
      businessUnit: "BU International",
      validator: "Marie Dupont",
      substitute: "Pierre Durand",
      active: true,
    },
  ];

  // Notification templates mock data
  const notificationTemplates: NotificationTemplate[] = [
    {
      id: "notif-1",
      type: "submitted",
      channel: "email",
      template:
        "Une demande de résiliation a été soumise pour le contrat {contract_number}",
      active: true,
    },
    {
      id: "notif-2",
      type: "validated",
      channel: "in-app",
      template: "La résiliation du contrat {contract_number} a été validée",
      active: true,
    },
    {
      id: "notif-3",
      type: "rejected",
      channel: "teams",
      template:
        "La résiliation du contrat {contract_number} a été rejetée: {reason}",
      active: false,
    },
  ];

  // KPI calculations
  const kpiData = {
    drafts: terminations.filter((t) => t.status === "draft").length,
    toValidate: terminations.filter((t) => t.status === "to_validate").length,
    validated30Days: terminations.filter(
      (t) =>
        t.status === "validated" &&
        t.validatedAt &&
        (new Date().getTime() - t.validatedAt.getTime()) /
          (1000 * 60 * 60 * 24) <=
          30
    ).length,
    rejected: terminations.filter((t) => t.status === "rejected").length,
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "validated":
        return "success";
      case "to_validate":
        return "warning";
      case "draft":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "validated":
        return "Validée";
      case "to_validate":
        return "À valider";
      case "draft":
        return "Brouillon";
      case "rejected":
        return "Rejetée";
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR").format(date);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Filter terminations based on current filters
  const filteredTerminations = terminations.filter((termination) => {
    if (statusFilter !== "all" && termination.status !== statusFilter)
      return false;
    if (
      searchQuery &&
      !termination.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !termination.contractNumber
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) &&
      !termination.reason.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const handleValidation = () => {
    if (validationDecision === "reject" && !rejectionReason) {
      setShowError("Le motif du rejet est obligatoire");
      return;
    }
    // Process validation
    setShowValidationModal(false);
    setValidationDecision("validate");
    setRejectionReason("");
  };

  const resetNewTerminationForm = () => {
    setNewTermination({
      contractId: "",
      contractNumber: "",
      contractTitle: "",
      effectiveDate: "",
      reason: "",
      validator: "",
    });
    setCurrentStep(1);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-50">
        <Header />
        <main
          className="flex-1 overflow-y-auto p-4 lg:p-6"
          data-testid="terminations-main"
        >
          <div className="max-w-7xl mx-auto">
            {/* Page Header - RE-1 */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Résiliations</h1>
            </div>

            <Tabs
              value={activeView}
              onValueChange={(v) =>
                setActiveView(v as "list" | "history" | "settings")
              }
            >
              <TabsList className="mb-6">
                <TabsTrigger value="list">Liste globale</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
                <TabsTrigger value="settings">Paramétrage</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                {/* KPI Tiles - RE-1 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-6 h-6 text-gray-400" />
                        <span className="text-2xl font-bold text-gray-900">
                          {kpiData.drafts}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Brouillons</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="w-6 h-6 text-warning" />
                        <span className="text-2xl font-bold text-gray-900">
                          {kpiData.toValidate}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">À valider</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {kpiData.validated30Days}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Validées (30 j)</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <XCircle className="w-6 h-6 text-destructive" />
                        <span className="text-2xl font-bold text-gray-900">
                          {kpiData.rejected}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Rejetées</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Reminder Alert */}
                <Alert className="mb-6 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-gray-700">
                    <strong>Rappel :</strong> Toute résiliation nécessite une
                    validation avant application. Motif obligatoire.
                  </AlertDescription>
                </Alert>

                {/* Impact Alert */}
                <Alert className="mb-6 border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-gray-700">
                    Une résiliation <strong>validée</strong> passe le contrat à
                    l'état <strong>Résilié</strong> (cycle de vie), met à jour
                    les systèmes connectés (ex. SAP) et est{" "}
                    <strong>historisée</strong>.
                  </AlertDescription>
                </Alert>

                {/* Filters Bar - RE-1 */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label
                          htmlFor="period-filter"
                          className="text-sm font-medium mb-1"
                        >
                          Période de demande
                        </Label>
                        <Select
                          value={periodFilter}
                          onValueChange={setPeriodFilter}
                        >
                          <SelectTrigger id="period-filter">
                            <SelectValue placeholder="Sélectionner une période" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              Toutes les périodes
                            </SelectItem>
                            <SelectItem value="30days">
                              30 derniers jours
                            </SelectItem>
                            <SelectItem value="90days">
                              90 derniers jours
                            </SelectItem>
                            <SelectItem value="year">Cette année</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="effective-period"
                          className="text-sm font-medium mb-1"
                        >
                          Période d'effet
                        </Label>
                        <Input
                          id="effective-period"
                          type="date"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="status-filter"
                          className="text-sm font-medium mb-1"
                        >
                          Statut
                        </Label>
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger id="status-filter">
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              Tous les statuts
                            </SelectItem>
                            <SelectItem value="draft">Brouillon</SelectItem>
                            <SelectItem value="to_validate">
                              À valider
                            </SelectItem>
                            <SelectItem value="validated">Validée</SelectItem>
                            <SelectItem value="rejected">Rejetée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="search"
                          className="text-sm font-medium mb-1"
                        >
                          Recherche
                        </Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            id="search"
                            type="text"
                            placeholder="ID résiliation, mot-clé du motif..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Contrat (N° + intitulé)"
                          className="w-48"
                        />
                        <Input
                          type="text"
                          placeholder="Demandeur"
                          className="w-40"
                        />
                        <Input
                          type="text"
                          placeholder="Valideur assigné"
                          className="w-40"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowNewTerminationDialog(true)}
                          data-testid="button-create-termination"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Créer une demande
                        </Button>
                        <Button variant="outline">
                          <FileDown className="w-4 h-4 mr-2" />
                          Exporter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Terminations List Table - RE-1 */}
                {filteredTerminations.length === 0 && showEmptyState ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Aucune demande
                      </h3>
                      <p className="text-gray-500">
                        Aucune demande ne correspond à vos filtres.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setStatusFilter("all");
                          setSearchQuery("");
                        }}
                      >
                        Réinitialiser les filtres
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID demande</TableHead>
                              <TableHead>Contrat</TableHead>
                              <TableHead>Motif (extrait)</TableHead>
                              <TableHead>Date d'effet</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Valideur assigné</TableHead>
                              <TableHead>Dernière MàJ</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTerminations.map((termination) => (
                              <TableRow
                                key={termination.id}
                                data-testid={`row-termination-${termination.id}`}
                              >
                                <TableCell>
                                  <button
                                    className="text-primary hover:underline font-medium"
                                    onClick={() => {
                                      setSelectedTermination(termination);
                                      setShowDetailPanel(true);
                                    }}
                                  >
                                    {termination.id}
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {termination.contractNumber}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {termination.contractTitle}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div
                                    className="max-w-xs truncate"
                                    title={termination.reason}
                                  >
                                    {termination.reason.substring(0, 50)}...
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatDate(termination.effectiveDate)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <StatusBadge
                                      variant={getStatusVariant(
                                        termination.status
                                      )}
                                      text={getStatusLabel(termination.status)}
                                    />
                                    {termination.sla &&
                                      termination.sla < 24 && (
                                        <Badge
                                          variant="default"
                                          className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200"
                                        >
                                          <Timer className="w-3 h-3 mr-1" />
                                          {termination.sla}h
                                        </Badge>
                                      )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {termination.assignedValidator || "-"}
                                </TableCell>
                                <TableCell>
                                  {formatDate(termination.lastUpdate)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTermination(termination);
                                        setShowDetailPanel(true);
                                      }}
                                      data-testid={`button-view-termination-${termination.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {termination.status === "to_validate" && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-green-600 hover:text-green-700"
                                          onClick={() => {
                                            setSelectedTermination(termination);
                                            setShowValidationModal(true);
                                            setValidationDecision("validate");
                                          }}
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() => {
                                            setSelectedTermination(termination);
                                            setShowValidationModal(true);
                                            setValidationDecision("reject");
                                          }}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="px-6 py-4 border-t flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Affichage de {filteredTerminations.length} résultat(s)
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Lignes par page:</Label>
                          <Select defaultValue="25">
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history">
                {/* RE-5 - Historique des résiliations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Historique des résiliations</CardTitle>
                    <CardDescription>
                      Journal complet des décisions sur les résiliations
                      (lecture seule)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Input type="date" placeholder="Période" />
                      <Input placeholder="Contrat" />
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Décision" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="validated">Validée</SelectItem>
                          <SelectItem value="rejected">Rejetée</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Auteur / Valideur" />
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date/heure</TableHead>
                            <TableHead>Contrat</TableHead>
                            <TableHead>Motif (extrait)</TableHead>
                            <TableHead>Décision</TableHead>
                            <TableHead>Date d'effet</TableHead>
                            <TableHead>Demandeur</TableHead>
                            <TableHead>Valideur</TableHead>
                            <TableHead>Trace-ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {terminations
                            .filter((t) => t.status !== "draft")
                            .map((termination) => (
                              <TableRow key={`history-${termination.id}`}>
                                <TableCell>
                                  {formatDateTime(termination.lastUpdate)}
                                </TableCell>
                                <TableCell>
                                  <button
                                    className="text-primary hover:underline"
                                    onClick={() => {
                                      setSelectedTermination(termination);
                                      setShowDetailPanel(true);
                                    }}
                                  >
                                    {termination.contractNumber}
                                  </button>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {termination.reason.substring(0, 50)}...
                                </TableCell>
                                <TableCell>
                                  <StatusBadge
                                    variant={getStatusVariant(
                                      termination.status
                                    )}
                                    text={getStatusLabel(termination.status)}
                                  />
                                </TableCell>
                                <TableCell>
                                  {formatDate(termination.effectiveDate)}
                                </TableCell>
                                <TableCell>{termination.requestedBy}</TableCell>
                                <TableCell>
                                  {termination.validatedBy || "-"}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {termination.history?.[0]?.traceId || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button variant="outline">
                        <FileDown className="w-4 h-4 mr-2" />
                        Exporter (Excel/CSV)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                {/* RE-6 - Paramétrage */}
                <div className="space-y-6">
                  <Alert className="border-amber-200 bg-amber-50">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <strong>Accès Admin uniquement</strong> - Ces paramètres
                      affectent l'ensemble du système de résiliation.
                    </AlertDescription>
                  </Alert>

                  {/* Section Routage de validation */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Routage de validation</CardTitle>
                      <CardDescription>
                        Règles d'affectation par BU/entité, seuils et
                        remplaçants
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {routingRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-sm text-gray-500">
                                BU: {rule.businessUnit} | Valideur:{" "}
                                {rule.validator}
                                {rule.substitute &&
                                  ` | Remplaçant: ${rule.substitute}`}
                                {rule.threshold &&
                                  ` | Seuil: ${rule.threshold}€`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={rule.active} />
                              <Button variant="ghost" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Créer une règle de routage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section SLA & Relances */}
                  <Card>
                    <CardHeader>
                      <CardTitle>SLA & Relances</CardTitle>
                      <CardDescription>
                        Délai cible et relances automatiques
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="sla-enabled">Activer le SLA</Label>
                            <p className="text-sm text-gray-500">
                              Surveiller les délais de traitement
                            </p>
                          </div>
                          <Switch
                            id="sla-enabled"
                            checked={slaEnabled}
                            onCheckedChange={setSlaEnabled}
                          />
                        </div>

                        {slaEnabled && (
                          <>
                            <div>
                              <Label htmlFor="sla-hours">
                                Délai cible (heures)
                              </Label>
                              <Input
                                id="sla-hours"
                                type="number"
                                value={slaHours}
                                onChange={(e) =>
                                  setSlaHours(parseInt(e.target.value))
                                }
                                className="w-32"
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="auto-reminders">
                                  Relances automatiques
                                </Label>
                                <p className="text-sm text-gray-500">
                                  Envoyer des rappels après {slaHours}h
                                </p>
                              </div>
                              <Switch
                                id="auto-reminders"
                                checked={autoReminders}
                                onCheckedChange={setAutoReminders}
                              />
                            </div>

                            <div>
                              <Label>Message type de relance</Label>
                              <Textarea
                                defaultValue="Rappel: La demande de résiliation {id} est en attente de validation depuis plus de {hours} heures."
                                className="mt-2"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section Notifications */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>
                        Modèles d'alertes et canaux de communication
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {notificationTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    template.type === "validated"
                                      ? "default"
                                      : template.type === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className={
                                    template.type === "validated"
                                      ? "bg-green-50 text-green-800 border-green-200"
                                      : ""
                                  }
                                >
                                  {template.type === "submitted" && "Soumise"}
                                  {template.type === "validated" && "Validée"}
                                  {template.type === "rejected" && "Rejetée"}
                                </Badge>
                                <Badge variant="outline">
                                  {template.channel === "email" && (
                                    <Mail className="w-3 h-3 mr-1" />
                                  )}
                                  {template.channel === "in-app" && (
                                    <Bell className="w-3 h-3 mr-1" />
                                  )}
                                  {template.channel === "teams" && (
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                  )}
                                  {template.channel}
                                </Badge>
                              </div>
                              <Switch checked={template.active} />
                            </div>
                            <div className="text-sm text-gray-600">
                              {template.template}
                            </div>
                          </div>
                        ))}

                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Rétention de l'historique des notifications :{" "}
                            <strong>1 an</strong>
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section Intégrations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Intégrations</CardTitle>
                      <CardDescription>
                        Synchronisation avec les systèmes externes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-gray-500" />
                            <div>
                              <Label htmlFor="sap-sync">
                                Synchronisation SAP
                              </Label>
                              <p className="text-sm text-gray-500">
                                Mettre à jour le statut lors des validations
                              </p>
                            </div>
                          </div>
                          <Switch
                            id="sap-sync"
                            checked={sapSync}
                            onCheckedChange={setSapSync}
                          />
                        </div>

                        {sapSync && (
                          <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription>
                              Synchronisation active - Dernière mise à jour : il
                              y a 5 minutes
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button>Enregistrer les modifications</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* RE-7 - Error banners */}
            {showError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {showError}
                  {showError.includes("Motif") && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowError(null)}
                      >
                        Corriger la demande
                      </Button>
                    </div>
                  )}
                  {showError.includes("valideur") && (
                    <div className="mt-2 text-sm">
                      Workflow en attente - <strong>admin alerté</strong>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </main>

        {/* RE-3 - New Termination Dialog (Assistant) */}
        <Dialog
          open={showNewTerminationDialog}
          onOpenChange={setShowNewTerminationDialog}
        >
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle résiliation</DialogTitle>
              <Progress value={(currentStep / 3) * 100} className="mt-2" />
              <DialogDescription>Étape {currentStep} sur 3</DialogDescription>
            </DialogHeader>

            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-medium">Étape 1 - Sélection du contrat</h3>
                <div>
                  <Label htmlFor="contract-select">
                    Sélectionner un contrat
                  </Label>
                  <Select
                    value={newTermination.contractId}
                    onValueChange={(value) => {
                      const selectedContract = contracts.find(
                        (c: any) => c.id === value
                      );
                      if (selectedContract) {
                        setNewTermination({
                          ...newTermination,
                          contractId: value,
                          contractNumber: selectedContract.number,
                          contractTitle: selectedContract.title,
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="contract-select">
                      <SelectValue placeholder="Sélectionner un contrat actif..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Aucun contrat disponible
                        </SelectItem>
                      ) : (
                        contracts
                          .filter(
                            (contract: any) =>
                              contract.status !== "terminated" &&
                              contract.status !== "expired"
                          )
                          .map((contract: any) => (
                            <SelectItem key={contract.id} value={contract.id}>
                              {contract.number} - {contract.title}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Seuls les contrats "Actifs" et non déjà résiliés sont
                    sélectionnables
                  </p>
                </div>
                {newTermination.contractId && (
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Contrat sélectionné</h4>
                      <div className="text-sm space-y-1">
                        <div>N°: {newTermination.contractNumber}</div>
                        <div>Titre: {newTermination.contractTitle}</div>
                        <div>
                          Statut:{" "}
                          <Badge
                            variant="default"
                            className="bg-green-50 text-green-800 border-green-200"
                          >
                            Actif
                          </Badge>
                        </div>
                        {(() => {
                          const contract = contracts.find(
                            (c: any) => c.id === newTermination.contractId
                          );
                          return contract ? (
                            <div>
                              Dates:{" "}
                              {new Date(contract.startDate).toLocaleDateString(
                                "fr-FR"
                              )}{" "}
                              -{" "}
                              {new Date(contract.endDate).toLocaleDateString(
                                "fr-FR"
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="font-medium">
                  Étape 2 - Paramètres de la demande
                </h3>
                <div>
                  <Label htmlFor="effective-date">Date d'effet *</Label>
                  <Input
                    id="effective-date"
                    type="date"
                    value={newTermination.effectiveDate}
                    onChange={(e) =>
                      setNewTermination({
                        ...newTermination,
                        effectiveDate: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contrôles : ≥ aujourd'hui et ≥ date début du contrat
                  </p>
                </div>

                <div>
                  <Label htmlFor="reason">
                    Motif de résiliation (obligatoire) *
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Expliquez la raison de la résiliation..."
                    value={newTermination.reason}
                    onChange={(e) =>
                      setNewTermination({
                        ...newTermination,
                        reason: e.target.value,
                      })
                    }
                    className="h-32"
                  />
                  {!newTermination.reason && showError && (
                    <p className="text-sm text-red-500 mt-1">
                      Le motif est obligatoire
                    </p>
                  )}
                </div>

                <Card className="bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-base">Aperçu d'impact</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div>
                        <strong>Échéances :</strong> Les échéances postérieures
                        au {newTermination.effectiveDate || "[date d'effet]"}{" "}
                        seront supprimées
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div>
                        <strong>Statut :</strong> Le contrat passera à "Résilié"
                        à la date d'effet
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div>
                        <strong>Intégrations :</strong> Mise à jour automatique
                        dans SAP
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
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
                          {newTermination.contractNumber || "Non sélectionné"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date d'effet :</span>
                        <span className="font-medium">
                          {newTermination.effectiveDate || "Non définie"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Motif :</span>
                        <div className="mt-1 p-2 bg-white rounded text-sm">
                          {newTermination.reason || "Non renseigné"}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Valideur assigné :
                        </span>
                        <span className="font-medium">
                          Jean Martin (selon règles de routage)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    En soumettant cette demande, vous déclenchez le workflow de
                    validation et les notifications associées.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <DialogFooter>
              <div className="flex justify-between w-full">
                <div>
                  {currentStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Précédent
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Save as draft
                      setShowNewTerminationDialog(false);
                      resetNewTerminationForm();
                    }}
                  >
                    Enregistrer en brouillon
                  </Button>
                  {currentStep < 3 ? (
                    <Button
                      onClick={() => {
                        if (currentStep === 2 && !newTermination.reason) {
                          setShowError(
                            "Le motif est obligatoire pour soumettre la demande"
                          );
                          return;
                        }
                        setCurrentStep(currentStep + 1);
                      }}
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        // Créer la demande de résiliation
                        if (
                          !newTermination.contractId ||
                          !newTermination.reason
                        ) {
                          toast({
                            title: "Erreur",
                            description:
                              "Veuillez sélectionner un contrat et fournir un motif",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Submit for validation
                        const terminationData = {
                          type: "termination",
                          contractId: newTermination.contractId,
                          title: `Résiliation - ${newTermination.contractNumber}`,
                          description: newTermination.reason,
                          targetDate:
                            newTermination.effectiveDate ||
                            new Date().toISOString().split("T")[0],
                          priority: "high",
                          metadata: {
                            contractNumber: newTermination.contractNumber,
                            contractTitle: newTermination.contractTitle,
                            effectiveDate: newTermination.effectiveDate,
                            reason: newTermination.reason,
                          },
                        };

                        createTerminationMutation.mutate(terminationData);
                      }}
                    >
                      Soumettre à validation
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* RE-2 - Termination Detail Panel */}
        <Sheet open={showDetailPanel} onOpenChange={setShowDetailPanel}>
          <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[600px] lg:max-w-[700px] overflow-y-auto">
            {selectedTermination && (
              <>
                <SheetHeader>
                  <SheetTitle>
                    <div className="flex items-center justify-between">
                      <div>
                        <div>
                          {selectedTermination.contractNumber} -{" "}
                          {selectedTermination.contractTitle}
                        </div>
                      </div>
                      <StatusBadge
                        variant={getStatusVariant(selectedTermination.status)}
                        text={getStatusLabel(selectedTermination.status)}
                      />
                    </div>
                  </SheetTitle>
                  <div className="text-sm text-gray-500 mt-2">
                    <div>
                      Date d'effet:{" "}
                      {formatDate(selectedTermination.effectiveDate)}
                    </div>
                    {selectedTermination.sla && (
                      <div className="text-amber-600">
                        SLA: {selectedTermination.sla}h restantes
                      </div>
                    )}
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Bloc Demande */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Demande</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-500">
                            Motif de résiliation (obligatoire)
                          </Label>
                          <div className="mt-1 p-3 bg-gray-50 rounded text-sm">
                            {selectedTermination.reason}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Demandeur:</span>
                            <div className="font-medium">
                              {selectedTermination.requestedBy}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Date de création:
                            </span>
                            <div className="font-medium">
                              {formatDate(selectedTermination.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bloc Impact fonctionnel */}
                  {selectedTermination.impact && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Impact fonctionnel
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div>
                            <div className="font-medium text-gray-700 mb-1">
                              Cycle de vie
                            </div>
                            <div className="text-gray-600">
                              {selectedTermination.impact.lifecycle}
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <div className="font-medium text-gray-700 mb-1">
                              Échéances
                            </div>
                            <div className="text-gray-600">
                              {selectedTermination.impact.deadlines}
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <div className="font-medium text-gray-700 mb-1">
                              Intégrations
                            </div>
                            <div className="text-gray-600">
                              {selectedTermination.impact.integrations}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Bloc Workflow */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Workflow</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Valideur assigné:</span>
                          <span className="font-medium">
                            {selectedTermination.assignedValidator ||
                              "Non assigné"}
                          </span>
                        </div>
                        {selectedTermination.sla &&
                          selectedTermination.sla < 24 && (
                            <Alert className="border-amber-200 bg-amber-50">
                              <Timer className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-sm">
                                Relance automatique dans{" "}
                                {selectedTermination.sla} heures
                              </AlertDescription>
                            </Alert>
                          )}
                        {selectedTermination.validatedBy && (
                          <div className="flex justify-between">
                            <span>Validé par:</span>
                            <span className="font-medium">
                              {selectedTermination.validatedBy}
                            </span>
                          </div>
                        )}
                        {selectedTermination.rejectionReason && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Motif de rejet:{" "}
                              {selectedTermination.rejectionReason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bloc Historisation */}
                  {selectedTermination.history &&
                    selectedTermination.history.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Historisation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {selectedTermination.history.map((event) => (
                              <div key={event.id} className="flex gap-3">
                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2"></div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium">
                                    {event.action}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDateTime(event.date)} • {event.user}
                                  </div>
                                  {event.details && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {event.details}
                                    </div>
                                  )}
                                  <div className="text-xs font-mono text-gray-400 mt-1">
                                    Trace-ID: {event.traceId}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {selectedTermination.status === "to_validate" && (
                      <>
                        <Button
                          className="flex-1"
                          onClick={() => {
                            setShowValidationModal(true);
                            setValidationDecision("validate");
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Valider
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setShowValidationModal(true);
                            setValidationDecision("reject");
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Rejeter
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Open contract details
                      }}
                    >
                      Ouvrir la fiche contrat
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* RE-4 - Validation Modal */}
        <Dialog
          open={showValidationModal}
          onOpenChange={setShowValidationModal}
        >
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {validationDecision === "validate" ? "Valider" : "Rejeter"} la
                résiliation
              </DialogTitle>
              <DialogDescription>
                Examinez les détails de la demande de résiliation et prenez une
                décision
              </DialogDescription>
            </DialogHeader>

            {selectedTermination && (
              <>
                <div className="space-y-4">
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Résumé</h4>
                      <div className="text-sm space-y-1">
                        <div>
                          Contrat: {selectedTermination.contractNumber} -{" "}
                          {selectedTermination.contractTitle}
                        </div>
                        <div>
                          Date d'effet:{" "}
                          {formatDate(selectedTermination.effectiveDate)}
                        </div>
                        <div>Motif: {selectedTermination.reason}</div>
                        <div>Demandeur: {selectedTermination.requestedBy}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <Label>Décision</Label>
                    <RadioGroup
                      value={validationDecision}
                      onValueChange={(v) =>
                        setValidationDecision(v as "validate" | "reject")
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="validate" id="validate" />
                        <Label htmlFor="validate">Valider</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reject" id="reject" />
                        <Label htmlFor="reject">Rejeter</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {validationDecision === "reject" && (
                    <div>
                      <Label htmlFor="rejection-reason">
                        Motif du rejet (obligatoire)
                      </Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="Expliquez la raison du rejet..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className={
                          !rejectionReason && showError ? "border-red-500" : ""
                        }
                      />
                    </div>
                  )}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {validationDecision === "validate"
                        ? "Si validée : passage du contrat à Résilié selon le cycle de vie + mise à jour SAP + historisation + notification."
                        : "Si rejetée : aucune application, la demande reste en attente avec journalisation du motif."}
                    </AlertDescription>
                  </Alert>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowValidationModal(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    variant={
                      validationDecision === "validate"
                        ? "default"
                        : "destructive"
                    }
                    onClick={handleValidation}
                  >
                    {validationDecision === "validate" ? "Valider" : "Rejeter"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
