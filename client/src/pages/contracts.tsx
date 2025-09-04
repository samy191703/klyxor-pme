import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  FileText,
  FileUp,
  Plus,
  Download,
  RefreshCw,
  Eye,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  Building2,
  Globe,
  Hash,
  Info,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Save,
  Send,
  FileCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Contract } from "@shared/schema";
import { AIHelpBubble } from "@/components/widgets/ai-help-bubble";
import { useAIHelp } from "@/components/widgets/ai-help-context";
import { ConfirmModal } from "@/components/common/confirm-modal";

export default function Contracts() {
  const { canCreateContract, canExportData } = usePermissions();
  const { setPage } = useAIHelp();
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [itemsPerPage, setItemsPerPage] = useState("25");

  // Wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState<any>({});

  // Contract details
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Validation modal
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationDecision, setValidationDecision] = useState<
    "validate" | "reject" | ""
  >("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [validationComment, setValidationComment] = useState("");

  // Amendment modal
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [amendmentData, setAmendmentData] = useState<any>({
    contractId: "",
    type: "price_revision",
    title: "",
    description: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    newAmount: "",
    impactDescription: "",
  });

  // Termination modal
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [terminationData, setTerminationData] = useState<any>({
    contractId: "",
    terminationReason: "",
    terminationDate: new Date().toISOString().split("T")[0],
  });

  // Nouveaux états pour les modals de confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<any>(null);
  const [statusChangeData, setStatusChangeData] = useState<any>({
    contractId: "",
    newStatus: "",
    oldStatus: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Récupérer les formules d'indexation depuis l'API
  const { data: indexationFormulas = [] } = useQuery<any[]>({
    queryKey: ["/api/indexation-formulas"],
  });

  // Mutations
  const createAmendmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/amendments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create amendment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amendments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Avenant créé",
        description: "L'avenant a été créé avec succès.",
      });
      setShowAmendmentModal(false);
      setAmendmentData({
        type: "price_revision",
        title: "",
        description: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        newAmount: "",
        impactDescription: "",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'avenant.",
        variant: "destructive",
      });
    },
  });

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
      setShowTerminationModal(false);
      setTerminationData({
        contractId: "",
        terminationReason: "",
        terminationDate: new Date().toISOString().split("T")[0],
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la demande de résiliation.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour créer un contrat
  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create contract");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Contrat créé",
        description: "Le contrat a été créé avec le statut 'À valider'",
      });
      setShowWizard(false);
      setWizardStep(1);
      setWizardData({});
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description:
          "Impossible de créer le contrat. Vérifiez les données saisies.",
        variant: "destructive",
      });
    },
  });

  // KPIs calculation
  const kpis = {
    drafts: contracts.filter((c) => c.status === "draft").length,
    toValidate: contracts.filter((c) => c.status === "pending_validation")
      .length,
    active: contracts.filter((c) => c.status === "active").length,
    terminated: contracts.filter((c) => c.status === "terminated").length,
    closed: contracts.filter((c) => c.status === "closed").length,
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      searchTerm === "" ||
      contract.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || contract.status === statusFilter;
    const matchesType = typeFilter === "all" || contract.type === typeFilter;
    const matchesBU =
      businessUnitFilter === "all" ||
      contract.businessUnit === businessUnitFilter;

    return matchesSearch && matchesStatus && matchesType && matchesBU;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "pending_validation":
        return "warning";
      case "draft":
        return "secondary";
      case "terminated":
        return "destructive";
      case "closed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Actif";
      case "pending_validation":
        return "À valider";
      case "draft":
        return "Brouillon";
      case "terminated":
        return "Résilié";
      case "closed":
        return "Clôturé";
      default:
        return status;
    }
  };

  const formatAmount = (amount: string | number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("fr-FR").format(new Date(date));
  };

  const getDaysUntilExpiry = (endDate: Date | string | null) => {
    if (!endDate) return null;
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const businessUnits = Array.from(
    new Set(contracts.map((c) => c.businessUnit))
  );

  // Types de contrats pour la compatibilité
  const contractTypes = [
    "OMSA",
    "Bail",
    "LTSA",
    "OMGC",
    "PPA",
    "Distribution",
    "Trading",
  ];

  // Définitions détaillées des types de contrats
  const contractTypeDefinitions = [
    {
      value: "OMSA",
      label: "OMSA - Services de Maintenance",
      hasFixedAmount: true,
      hasTechnology: true,
    },
    {
      value: "Bail",
      label: "Bail - Location/Leasing",
      hasFixedAmount: false,
      hasTechnology: false,
    },
    {
      value: "LTSA",
      label: "LTSA - Services Long Terme",
      hasFixedAmount: true,
      hasTechnology: false,
      hasMaintainer: true,
    },
    {
      value: "OMGC",
      label: "OMGC - Maintenance Globale",
      hasFixedAmount: true,
      hasTechnology: false,
      hasMaintainer: true,
    },
    {
      value: "PPA",
      label: "PPA - Power Purchase Agreement",
      hasFixedAmount: true,
      hasTechnology: true,
    },
    {
      value: "Distribution",
      label: "Distribution Réseau",
      hasFixedAmount: true,
      hasTechnology: false,
    },
    {
      value: "Trading",
      label: "Trading Énergie",
      hasFixedAmount: true,
      hasTechnology: false,
    },
  ];

  const technologies = [
    "Éolien",
    "Photovoltaïque",
    "Hydraulique",
    "Biomasse",
    "Cogénération",
    "Géothermie",
  ];

  // Les formules d'indexation sont maintenant récupérées depuis l'API

  const billingPeriods = [
    { value: "monthly", label: "Mensuelle" },
    { value: "quarterly", label: "Trimestrielle" },
    { value: "semi-annual", label: "Semestrielle" },
    { value: "annual", label: "Annuelle" },
  ];

  const handleCreateContract = () => {
    setShowWizard(true);
    setWizardStep(1);
    setWizardData({});
  };

  const handleWizardNext = () => {
    if (wizardStep < 5) {
      setWizardStep(wizardStep + 1);
    } else {
      // Préparer les données du contrat
      const contractNumber = `CT-2025-${String(Date.now()).slice(-6)}`;
      const totalAmount =
        parseFloat(wizardData.fixedAmount || 0) +
        parseFloat(wizardData.variableAmount || 0);

      const contractData = {
        number: contractNumber,
        title: wizardData.title,
        type: wizardData.type,
        businessUnit: wizardData.businessUnit,
        status: "pending_validation",
        amount: totalAmount,
        currency: "EUR",
        startDate: wizardData.startDate,
        endDate: wizardData.endDate,
        indexationFrequency: wizardData.indexationFrequency || null,
        nextIndexationDate: wizardData.indexationDate || null,
        createdBy: "admin-1",
        hasRequiredDocuments: wizardData.hasAttachment || false,
      };

      // Créer le contrat
      createContractMutation.mutate(contractData);
    }
  };

  const handleWizardPrevious = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleShowContractDetails = (contract: any) => {
    setSelectedContract(contract);
    setShowContractDetails(true);
  };

  const handleValidateContract = (contract: any) => {
    setSelectedContract(contract);
    setShowValidationModal(true);
    setValidationDecision("");
    setRejectionReason("");
    setValidationComment("");
  };

  const handleSubmitValidation = () => {
    if (validationDecision === "validate") {
      toast({
        title: "Contrat validé",
        description: "Le contrat est maintenant actif",
      });
    } else if (validationDecision === "reject" && rejectionReason) {
      toast({
        title: "Contrat rejeté",
        description: "Le créateur a été notifié du rejet",
      });
    }
    setShowValidationModal(false);
    queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main
        className="flex-1 overflow-y-auto p-4 lg:p-6"
        data-testid="contracts-main"
      >
        <div className="max-w-7xl mx-auto">
          {/* Page Title with AI Help */}
          <div className="mb-6 relative">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 hidden lg:block">
              Gestion des contrats
            </h1>
            <AIHelpBubble
              className="absolute -top-2 -right-2 lg:top-0 lg:right-0"
              context={{
                page: "contracts",
                section: "main",
                data: {
                  totalContracts: contracts.length,
                  toValidate: kpis.toValidate,
                  activeContracts: kpis.active,
                },
              }}
            />
          </div>

          {/* GC-1: Liste des contrats */}
          {!showWizard ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="list">Contrats</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-6">
                {/* Titre */}
                <div className="mb-4 lg:mb-6">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                    Contrats
                  </h1>
                </div>

                {/* Tuiles KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 lg:mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {kpis.drafts}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        Brouillons
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="w-8 h-8 text-orange-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {kpis.toValidate}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        À valider
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {kpis.active}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        Actifs
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {kpis.terminated}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        Résiliés
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <FileCheck className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {kpis.closed}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        Clôturés
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Barre de filtres */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {/* Période */}
                      <Select
                        value={periodFilter}
                        onValueChange={setPeriodFilter}
                      >
                        <SelectTrigger data-testid="select-period">
                          <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Toutes les périodes
                          </SelectItem>
                          <SelectItem value="creation">Création</SelectItem>
                          <SelectItem value="effect">Effet</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Statut */}
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="draft">Brouillon</SelectItem>
                          <SelectItem value="pending_validation">
                            À valider
                          </SelectItem>
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="terminated">Résilié</SelectItem>
                          <SelectItem value="closed">Clôturé</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Type */}
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          {contractTypes.map((type) => (
                            <SelectItem key={type} value={type.toLowerCase()}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* BU/Entité */}
                      <Select
                        value={businessUnitFilter}
                        onValueChange={setBusinessUnitFilter}
                      >
                        <SelectTrigger data-testid="select-bu">
                          <SelectValue placeholder="BU/Entité" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les BU</SelectItem>
                          {businessUnits.map((bu) => (
                            <SelectItem key={bu} value={bu}>
                              {bu}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Recherche */}
                      <Input
                        placeholder="N°/titre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search"
                      />

                      {canCreateContract() && (
                        <Button
                          onClick={handleCreateContract}
                          className="col-span-2 md:col-span-1"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Créer un contrat
                        </Button>
                      )}

                      <Button variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualiser
                      </Button>

                      {canExportData() && (
                        <Button
                          variant="default"
                          onClick={() => setShowExportModal(true)}
                          data-testid="button-export"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exporter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Bandeau d'info */}
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    La validation est requise pour l'activation d'un contrat.
                  </AlertDescription>
                </Alert>

                {/* Liste (tableau) */}
                <Card>
                  <CardContent className="p-0">
                    {filteredContracts.length === 0 ? (
                      /* GC-5: État vide */
                      <div className="flex flex-col items-center justify-center py-12">
                        <FileText className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-lg text-gray-600 mb-2">
                          Aucun contrat ne correspond à vos filtres
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setTypeFilter("all");
                            setBusinessUnitFilter("all");
                            setPeriodFilter("all");
                          }}
                        >
                          Réinitialiser les filtres
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>N° contrat</TableHead>
                              <TableHead>Titre / SPV</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Date début</TableHead>
                              <TableHead>Date fin</TableHead>
                              <TableHead>Montant fixe</TableHead>
                              <TableHead>Montant variable</TableHead>
                              <TableHead>Indexation</TableHead>
                              <TableHead>Prochaine échéance</TableHead>
                              <TableHead>PJ obligatoire</TableHead>
                              <TableHead>Dernière maj</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredContracts.map((contract) => {
                              const daysUntilExpiry = getDaysUntilExpiry(
                                contract.endDate
                              );
                              const hasIndexation =
                                contract.indexationFrequency !== null;

                              return (
                                <TableRow
                                  key={contract.id}
                                  data-testid={`row-contract-${contract.id}`}
                                  className="cursor-pointer hover:bg-gray-50"
                                  onClick={() =>
                                    handleShowContractDetails(contract)
                                  }
                                >
                                  <TableCell className="font-medium">
                                    <a
                                      href="#"
                                      className="text-blue-600 hover:underline"
                                    >
                                      CT-2025-
                                      {contract.id.slice(-4).toUpperCase()}
                                    </a>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">
                                        {contract.title}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {contract.type}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{contract.type}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        getStatusVariant(contract.status) as any
                                      }
                                    >
                                      {getStatusLabel(contract.status)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(contract.startDate)}
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(contract.endDate)}
                                  </TableCell>
                                  <TableCell>
                                    {formatAmount(
                                      contract.amount,
                                      contract.currency
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {/* Variable amount placeholder */}-
                                  </TableCell>
                                  <TableCell>
                                    {hasIndexation ? (
                                      <Badge variant="secondary">Oui</Badge>
                                    ) : (
                                      <span className="text-gray-400">Non</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {daysUntilExpiry !== null &&
                                    daysUntilExpiry <= 30 ? (
                                      <Badge
                                        variant={
                                          daysUntilExpiry <= 1
                                            ? "destructive"
                                            : daysUntilExpiry <= 7
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        J-{daysUntilExpiry}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {contract.hasRequiredDocuments ? (
                                      <FileCheck className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(contract.updatedAt)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end space-x-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleShowContractDetails(contract);
                                        }}
                                        data-testid={`button-view-${contract.id}`}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      {contract.status ===
                                        "pending_validation" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleValidateContract(contract);
                                          }}
                                          className="text-green-600 hover:text-green-700"
                                          data-testid={`button-validate-${contract.id}`}
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Pagination */}
                    {filteredContracts.length > 0 && (
                      <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
                        <div>
                          1-
                          {Math.min(
                            parseInt(itemsPerPage),
                            filteredContracts.length
                          )}{" "}
                          sur {filteredContracts.length}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>Afficher:</span>
                          <Select
                            value={itemsPerPage}
                            onValueChange={setItemsPerPage}
                          >
                            <SelectTrigger className="w-[70px]">
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
                    )}
                  </CardContent>
                </Card>

                {/* Note RBAC */}
                <p className="text-xs text-gray-500 mt-4">
                  RBAC : colonnes/contrats visibles selon rôle.
                </p>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Historique des contrats
                  </h1>
                </div>
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
            /* GC-2: Wizard de création */
            <div className="space-y-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  Nouveau contrat
                </h1>
                <Progress value={(wizardStep / 5) * 100} className="mt-4" />
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span className={wizardStep >= 1 ? "font-medium" : ""}>
                    Informations générales
                  </span>
                  <span className={wizardStep >= 2 ? "font-medium" : ""}>
                    Période & montants
                  </span>
                  <span className={wizardStep >= 3 ? "font-medium" : ""}>
                    Indexation
                  </span>
                  <span className={wizardStep >= 4 ? "font-medium" : ""}>
                    Pièce jointe
                  </span>
                  <span className={wizardStep >= 5 ? "font-medium" : ""}>
                    Récapitulatif
                  </span>
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  {/* Étape 1: Informations générales */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">
                        Étape 1 — Informations générales
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>N° contrat *</Label>
                          <Input
                            placeholder="CT-2025-XXXX"
                            value={wizardData.number || ""}
                            onChange={(e) =>
                              setWizardData({
                                ...wizardData,
                                number: e.target.value,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Masque + unicité contrôlée
                          </p>
                        </div>
                        <div>
                          <Label>Titre/SPV *</Label>
                          <Input
                            placeholder="Titre du contrat"
                            value={wizardData.title || ""}
                            onChange={(e) =>
                              setWizardData({
                                ...wizardData,
                                title: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Type *</Label>
                          <Select
                            value={wizardData.type || ""}
                            onValueChange={(value) =>
                              setWizardData({ ...wizardData, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>
                            <SelectContent>
                              {contractTypeDefinitions.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>BU/Entité *</Label>
                          <Select
                            value={wizardData.bu || ""}
                            onValueChange={(value) =>
                              setWizardData({ ...wizardData, bu: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une BU" />
                            </SelectTrigger>
                            <SelectContent>
                              {businessUnits.map((bu) => (
                                <SelectItem key={bu} value={bu}>
                                  {bu}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Devise *</Label>
                          <Select
                            value={wizardData.currency || "EUR"}
                            onValueChange={(value) =>
                              setWizardData({ ...wizardData, currency: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Langue *</Label>
                          <Select
                            value={wizardData.language || "FR"}
                            onValueChange={(value) =>
                              setWizardData({ ...wizardData, language: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FR">Français</SelectItem>
                              <SelectItem value="EN">Anglais</SelectItem>
                              <SelectItem value="ES">Espagnol</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Champs conditionnels selon le type */}
                      {wizardData.type &&
                        (() => {
                          const selectedType = contractTypeDefinitions.find(
                            (t) => t.value === wizardData.type
                          );
                          return (
                            <>
                              {selectedType?.hasTechnology && (
                                <div className="mt-4">
                                  <Label>Technologie *</Label>
                                  <Select
                                    value={wizardData.technology || ""}
                                    onValueChange={(value) =>
                                      setWizardData({
                                        ...wizardData,
                                        technology: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner la technologie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {technologies.map((tech) => (
                                        <SelectItem key={tech} value={tech}>
                                          {tech}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {selectedType?.hasMaintainer && (
                                <div className="mt-4">
                                  <Label>Mainteneur *</Label>
                                  <Input
                                    placeholder="Nom du mainteneur"
                                    value={wizardData.maintainer || ""}
                                    onChange={(e) =>
                                      setWizardData({
                                        ...wizardData,
                                        maintainer: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              )}
                            </>
                          );
                        })()}

                      {/* Formule d'indexation */}
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <Label>Formule d'indexation</Label>
                          <Select
                            value={wizardData.indexationFormula || ""}
                            onValueChange={(value) =>
                              setWizardData({
                                ...wizardData,
                                indexationFormula: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une formule" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                Pas d'indexation
                              </SelectItem>
                              {indexationFormulas.map((formula: any) => (
                                <SelectItem key={formula.id} value={formula.id}>
                                  {formula.name} - {formula.type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Périodicité de facturation */}
                        <div>
                          <Label>Périodicité de facturation</Label>
                          <Select
                            value={wizardData.billingPeriod || "monthly"}
                            onValueChange={(value) =>
                              setWizardData({
                                ...wizardData,
                                billingPeriod: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {billingPeriods.map((period) => (
                                <SelectItem
                                  key={period.value}
                                  value={period.value}
                                >
                                  {period.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Étape 2: Période & montants */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">
                        Étape 2 — Période & montants
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Date début *</Label>
                          <Input
                            type="date"
                            value={wizardData.startDate || ""}
                            onChange={(e) =>
                              setWizardData({
                                ...wizardData,
                                startDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Date fin *</Label>
                          <Input
                            type="date"
                            value={wizardData.endDate || ""}
                            onChange={(e) =>
                              setWizardData({
                                ...wizardData,
                                endDate: e.target.value,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Doit être supérieure à la date début
                          </p>
                        </div>
                        <div>
                          <Label>
                            Montant fixe{" "}
                            {wizardData.type === "Bail"
                              ? "(Non applicable)"
                              : "*"}
                          </Label>
                          <Input
                            type="number"
                            placeholder={
                              wizardData.type === "Bail"
                                ? "Non applicable"
                                : "0.00"
                            }
                            value={wizardData.fixedAmount || ""}
                            onChange={(e) =>
                              setWizardData({
                                ...wizardData,
                                fixedAmount: e.target.value,
                              })
                            }
                            disabled={wizardData.type === "Bail"}
                          />
                        </div>
                        <div>
                          <Label>Montant variable</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={wizardData.variableAmount || ""}
                            onChange={(e) =>
                              setWizardData({
                                ...wizardData,
                                variableAmount: e.target.value,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Optionnel, 0 accepté
                          </p>
                        </div>
                        <div>
                          <Label>Périodicité de facturation</Label>
                          <Select
                            value={wizardData.billingFrequency || ""}
                            onValueChange={(value) =>
                              setWizardData({
                                ...wizardData,
                                billingFrequency: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Mensuelle</SelectItem>
                              <SelectItem value="quarterly">
                                Trimestrielle
                              </SelectItem>
                              <SelectItem value="semi-annual">
                                Semestrielle
                              </SelectItem>
                              <SelectItem value="annual">Annuelle</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Type de paiement</Label>
                          <Select
                            value={wizardData.paymentType || ""}
                            onValueChange={(value) =>
                              setWizardData({
                                ...wizardData,
                                paymentType: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="advance">Avance</SelectItem>
                              <SelectItem value="arrears">
                                Terme échu
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Étape 3: Indexation */}
                  {wizardStep === 3 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">
                        Étape 3 — Paramètres d'indexation
                      </h2>

                      {wizardData.indexationFormula &&
                      wizardData.indexationFormula !== "none" ? (
                        <>
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Formule sélectionnée :</strong>
                              <div className="mt-1">
                                {(() => {
                                  const formula = indexationFormulas.find(
                                    (f: any) =>
                                      f.id === wizardData.indexationFormula
                                  );
                                  return formula ? (
                                    <>
                                      <div className="font-medium">
                                        {formula.name} - {formula.type}
                                      </div>
                                      <div className="text-xs font-mono mt-1">
                                        {formula.expression}
                                      </div>
                                      <div className="text-xs mt-1">
                                        {formula.description}
                                      </div>
                                    </>
                                  ) : (
                                    "Formule sélectionnée"
                                  );
                                })()}
                              </div>
                            </AlertDescription>
                          </Alert>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Montant de base pour l'indexation *</Label>
                              <Input
                                type="number"
                                placeholder="Montant initial"
                                value={
                                  wizardData.indexationBaseAmount ||
                                  wizardData.fixedAmount ||
                                  ""
                                }
                                onChange={(e) =>
                                  setWizardData({
                                    ...wizardData,
                                    indexationBaseAmount: e.target.value,
                                  })
                                }
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Montant qui sera indexé
                              </p>
                            </div>
                            <div>
                              <Label>Date de première indexation *</Label>
                              <Input
                                type="date"
                                value={wizardData.indexationDate || ""}
                                onChange={(e) =>
                                  setWizardData({
                                    ...wizardData,
                                    indexationDate: e.target.value,
                                  })
                                }
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Date anniversaire pour le calcul
                              </p>
                            </div>
                            <div>
                              <Label>Fréquence d'indexation</Label>
                              <Select
                                value={
                                  wizardData.indexationFrequency || "annual"
                                }
                                onValueChange={(value) =>
                                  setWizardData({
                                    ...wizardData,
                                    indexationFrequency: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="annual">
                                    Annuelle
                                  </SelectItem>
                                  <SelectItem value="biennial">
                                    Biennale
                                  </SelectItem>
                                  <SelectItem value="triennial">
                                    Triennale
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Cap (plafond) en %</Label>
                              <Input
                                type="number"
                                placeholder="Ex: 5 pour 5%"
                                value={wizardData.indexationCap || ""}
                                onChange={(e) =>
                                  setWizardData({
                                    ...wizardData,
                                    indexationCap: e.target.value,
                                  })
                                }
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Limite maximale de variation (optionnel)
                              </p>
                            </div>
                            <div>
                              <Label>Seuil minimum en %</Label>
                              <Input
                                type="number"
                                placeholder="Ex: 2 pour 2%"
                                value={wizardData.indexationThreshold || ""}
                                onChange={(e) =>
                                  setWizardData({
                                    ...wizardData,
                                    indexationThreshold: e.target.value,
                                  })
                                }
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Variation minimale pour déclencher (optionnel)
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Aucune formule d'indexation sélectionnée. Le contrat
                            n'aura pas d'indexation automatique.
                            <br />
                            <span className="text-xs">
                              Vous pouvez sélectionner une formule à l'étape 1
                              si vous souhaitez activer l'indexation.
                            </span>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Étape 4: Pièce jointe obligatoire */}
                  {wizardStep === 4 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">
                        Étape 4 — Pièce jointe obligatoire
                      </h2>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Rappels :</strong>
                          <ul className="mt-2 space-y-1 text-sm">
                            <li>• PJ obligatoire pour la validation</li>
                            <li>• Fichier non modifiable après upload</li>
                            <li>• Suppression admin uniquement</li>
                            <li>• Horodatage + auteur enregistrés</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-sm text-gray-600 mb-2">
                          Glisser-déposer un fichier ici ou
                        </p>
                        <Button variant="outline">Parcourir</Button>
                        <p className="text-xs text-gray-500 mt-2">
                          Formats autorisés : PDF, DOCX, XLSX, ODT, JPG, PNG
                        </p>
                      </div>

                      {wizardData.attachment && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">
                              {wizardData.attachment}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setWizardData({ ...wizardData, attachment: null })
                            }
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Étape 5: Récapitulatif & soumission */}
                  {wizardStep === 5 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">
                        Étape 5 — Récapitulatif & soumission
                      </h2>

                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <h3 className="font-medium">Informations générales</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>N° contrat : {wizardData.number || "-"}</div>
                          <div>Titre : {wizardData.title || "-"}</div>
                          <div>Type : {wizardData.type || "-"}</div>
                          <div>BU : {wizardData.bu || "-"}</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <h3 className="font-medium">Période & montants</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Date début : {wizardData.startDate || "-"}</div>
                          <div>Date fin : {wizardData.endDate || "-"}</div>
                          <div>
                            Montant fixe : {wizardData.fixedAmount || "-"}{" "}
                            {wizardData.currency}
                          </div>
                          <div>
                            Montant variable :{" "}
                            {wizardData.variableAmount || "0"}{" "}
                            {wizardData.currency}
                          </div>
                        </div>
                      </div>

                      {wizardData.indexationFormula &&
                        wizardData.indexationFormula !== "none" && (
                          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <h3 className="font-medium">Indexation</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                Formule :{" "}
                                {indexationFormulas.find(
                                  (f: any) =>
                                    f.id === wizardData.indexationFormula
                                )?.name || "-"}
                              </div>
                              <div>
                                Montant de base :{" "}
                                {wizardData.indexationBaseAmount ||
                                  wizardData.fixedAmount ||
                                  "-"}{" "}
                                {wizardData.currency}
                              </div>
                              <div>
                                Date indexation :{" "}
                                {wizardData.indexationDate || "-"}
                              </div>
                              <div>
                                Fréquence :{" "}
                                {wizardData.indexationFrequency === "annual"
                                  ? "Annuelle"
                                  : wizardData.indexationFrequency ===
                                    "biennial"
                                  ? "Biennale"
                                  : "Triennale"}
                              </div>
                              {wizardData.indexationCap && (
                                <div>Cap : {wizardData.indexationCap}%</div>
                              )}
                              {wizardData.indexationThreshold && (
                                <div>
                                  Seuil : {wizardData.indexationThreshold}%
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Statut initial après création :</strong> « À
                          valider »
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex justify-between mt-6">
                    <div>
                      {wizardStep > 1 && (
                        <Button
                          variant="outline"
                          onClick={handleWizardPrevious}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Précédent
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowWizard(false)}
                      >
                        Annuler
                      </Button>
                      <Button variant="outline">
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer le brouillon
                      </Button>
                      {wizardStep < 5 ? (
                        <Button onClick={handleWizardNext}>
                          Suivant
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <Button onClick={handleWizardNext}>
                          <Send className="w-4 h-4 mr-2" />
                          Valider la création
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* GC-3: Fiche contrat (Sheet) */}
          <Sheet
            open={showContractDetails}
            onOpenChange={setShowContractDetails}
          >
            <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[600px] lg:max-w-[800px] overflow-y-auto">
              {selectedContract && (
                <>
                  <SheetHeader>
                    <SheetTitle>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>
                            CT-2025-
                            {selectedContract.id.slice(-4).toUpperCase()}
                          </span>
                          <Badge
                            variant={
                              getStatusVariant(selectedContract.status) as any
                            }
                          >
                            {getStatusLabel(selectedContract.status)}
                          </Badge>
                        </div>
                        <div className="text-sm font-normal">
                          {selectedContract.title} - {selectedContract.type}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm font-normal text-gray-600">
                          <div>
                            Début : {formatDate(selectedContract.startDate)}
                          </div>
                          <div>
                            Fin : {formatDate(selectedContract.endDate)}
                          </div>
                          <div>
                            Montant :{" "}
                            {formatAmount(
                              selectedContract.amount,
                              selectedContract.currency
                            )}
                          </div>
                        </div>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    {/* Cartes récap' */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Prochaines échéances
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>J-30</span>
                              <span>
                                {formatDate(
                                  new Date(
                                    Date.now() + 30 * 24 * 60 * 60 * 1000
                                  )
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>J-7</span>
                              <span>
                                {formatDate(
                                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                )}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Indexation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 text-sm">
                            <div>
                              {selectedContract.indexationFrequency ||
                                "Pas d'indexation"}
                            </div>
                            {selectedContract.indexationFrequency && (
                              <div className="text-gray-500">
                                Prochaine : 01/01/2025
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 text-sm">
                            <div>3 pièces jointes</div>
                            {!selectedContract.hasRequiredDocuments && (
                              <Alert className="p-2">
                                <AlertTriangle className="h-3 w-3" />
                                <AlertDescription className="text-xs">
                                  Contrat signé manquant
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Historique</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 text-sm">
                            <div>
                              Créé le {formatDate(selectedContract.createdAt)}
                            </div>
                            <div>
                              Modifié le{" "}
                              {formatDate(selectedContract.updatedAt)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {selectedContract.status === "pending_validation" && (
                        <>
                          <Button
                            onClick={() =>
                              handleValidateContract(selectedContract)
                            }
                          >
                            Valider/Rejeter
                          </Button>
                        </>
                      )}
                      {selectedContract.status === "active" && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setAmendmentData({
                                ...amendmentData,
                                contractId: selectedContract.id,
                                originalAmount: selectedContract.amount,
                              });
                              setShowAmendmentModal(true);
                            }}
                          >
                            Créer un avenant
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setTerminationData({
                                ...terminationData,
                                contractId: selectedContract.id,
                              });
                              setShowTerminationModal(true);
                            }}
                          >
                            Résilier
                          </Button>
                        </>
                      )}
                      <Button variant="outline">Ouvrir GED</Button>
                      <Button variant="outline">Ouvrir Historique</Button>
                    </div>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>

          {/* GC-4: Modale Valider/Rejeter */}
          <Dialog
            open={showValidationModal}
            onOpenChange={setShowValidationModal}
          >
            <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Valider / Rejeter le contrat</DialogTitle>
                <DialogDescription>
                  Examinez les détails du contrat et prenez une décision de
                  validation
                </DialogDescription>
              </DialogHeader>

              {selectedContract && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div>
                      N° : CT-2025-{selectedContract.id.slice(-4).toUpperCase()}
                    </div>
                    <div>Titre : {selectedContract.title}</div>
                    <div>Type : {selectedContract.type}</div>
                    <div>
                      Montant :{" "}
                      {formatAmount(
                        selectedContract.amount,
                        selectedContract.currency
                      )}
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Séparation des rôles : le créateur ne peut pas valider son
                      propre contrat
                    </AlertDescription>
                  </Alert>

                  <RadioGroup
                    value={validationDecision}
                    onValueChange={(value: any) => setValidationDecision(value)}
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

                  {validationDecision === "reject" && (
                    <div>
                      <Label>Motif (obligatoire)</Label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Indiquer le motif du rejet..."
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Commentaire (facultatif)</Label>
                    <Textarea
                      value={validationComment}
                      onChange={(e) => setValidationComment(e.target.value)}
                      placeholder="Commentaire additionnel..."
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowValidationModal(false)}
                >
                  Fermer
                </Button>
                <Button
                  onClick={handleSubmitValidation}
                  disabled={
                    !validationDecision ||
                    (validationDecision === "reject" && !rejectionReason)
                  }
                  variant={
                    validationDecision === "validate"
                      ? "default"
                      : "destructive"
                  }
                >
                  {validationDecision === "validate" ? "Valider" : "Rejeter"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Avenant */}
          <Dialog
            open={showAmendmentModal}
            onOpenChange={setShowAmendmentModal}
          >
            <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un avenant</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour créer un avenant au contrat
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Sélectionner le contrat *</Label>
                  <Select
                    value={amendmentData.contractId}
                    onValueChange={(value) =>
                      setAmendmentData({ ...amendmentData, contractId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un contrat" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts
                        .filter((c) => c.status === "active")
                        .map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.number} - {contract.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {amendmentData.contractId &&
                  (() => {
                    const selectedContractForAmendment = contracts.find(
                      (c) => c.id === amendmentData.contractId
                    );
                    return selectedContractForAmendment ? (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div>
                          Contrat : {selectedContractForAmendment.number}
                        </div>
                        <div>Titre : {selectedContractForAmendment.title}</div>
                        <div>
                          Montant actuel :{" "}
                          {formatAmount(
                            selectedContractForAmendment.amount,
                            selectedContractForAmendment.currency
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}

                <div>
                  <Label>Type d'avenant *</Label>
                  <Select
                    value={amendmentData.type}
                    onValueChange={(value) =>
                      setAmendmentData({ ...amendmentData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_revision">
                        Révision de prix
                      </SelectItem>
                      <SelectItem value="scope_change">
                        Modification du périmètre
                      </SelectItem>
                      <SelectItem value="duration_extension">
                        Extension de durée
                      </SelectItem>
                      <SelectItem value="indexation_change">
                        Modification d'indexation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Titre de l'avenant *</Label>
                  <Input
                    value={amendmentData.title}
                    onChange={(e) =>
                      setAmendmentData({
                        ...amendmentData,
                        title: e.target.value,
                      })
                    }
                    placeholder="Ex: Avenant n°1 - Révision tarifaire"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={amendmentData.description}
                    onChange={(e) =>
                      setAmendmentData({
                        ...amendmentData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Description détaillée de l'avenant..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date d'effet *</Label>
                    <Input
                      type="date"
                      value={amendmentData.effectiveDate}
                      onChange={(e) =>
                        setAmendmentData({
                          ...amendmentData,
                          effectiveDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  {amendmentData.type === "price_revision" && (
                    <div>
                      <Label>Nouveau montant *</Label>
                      <Input
                        type="number"
                        value={amendmentData.newAmount}
                        onChange={(e) =>
                          setAmendmentData({
                            ...amendmentData,
                            newAmount: e.target.value,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label>Impact sur le contrat</Label>
                  <Textarea
                    value={amendmentData.impactDescription}
                    onChange={(e) =>
                      setAmendmentData({
                        ...amendmentData,
                        impactDescription: e.target.value,
                      })
                    }
                    placeholder="Décrire l'impact de cet avenant sur le contrat..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAmendmentModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    const selectedContractForAmendment = contracts.find(
                      (c) => c.id === amendmentData.contractId
                    );
                    if (selectedContractForAmendment) {
                      const amendmentNumber = `AVN-${
                        selectedContractForAmendment.number
                      }-${String(Date.now()).slice(-3)}`;
                      createAmendmentMutation.mutate({
                        contractId: amendmentData.contractId,
                        number: amendmentNumber,
                        type: amendmentData.type,
                        title: amendmentData.title,
                        description: amendmentData.description,
                        status: "draft",
                        effectiveDate: amendmentData.effectiveDate,
                        originalAmount: selectedContractForAmendment.amount,
                        newAmount:
                          amendmentData.newAmount ||
                          selectedContractForAmendment.amount,
                        impactDescription: amendmentData.impactDescription,
                        requestedBy: "admin-1",
                      });
                    }
                  }}
                  disabled={
                    !amendmentData.contractId ||
                    !amendmentData.title ||
                    !amendmentData.effectiveDate ||
                    createAmendmentMutation.isPending
                  }
                >
                  {createAmendmentMutation.isPending
                    ? "Création..."
                    : "Créer l'avenant"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Résiliation */}
          <Dialog
            open={showTerminationModal}
            onOpenChange={setShowTerminationModal}
          >
            <DialogContent className="w-[95vw] max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Demande de résiliation</DialogTitle>
                <DialogDescription>
                  Créer une demande de résiliation pour ce contrat
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Cette action créera une demande de résiliation qui devra
                    être validée.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label>Sélectionner le contrat à résilier *</Label>
                  <Select
                    value={terminationData.contractId}
                    onValueChange={(value) =>
                      setTerminationData({
                        ...terminationData,
                        contractId: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un contrat" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts
                        .filter((c) => c.status === "active")
                        .map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.number} - {contract.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {terminationData.contractId &&
                  (() => {
                    const selectedContractForTermination = contracts.find(
                      (c) => c.id === terminationData.contractId
                    );
                    return selectedContractForTermination ? (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div>
                          Contrat : {selectedContractForTermination.number}
                        </div>
                        <div>
                          Titre : {selectedContractForTermination.title}
                        </div>
                        <div>Type : {selectedContractForTermination.type}</div>
                      </div>
                    ) : null;
                  })()}

                <div>
                  <Label>Date de résiliation souhaitée *</Label>
                  <Input
                    type="date"
                    value={terminationData.terminationDate}
                    onChange={(e) =>
                      setTerminationData({
                        ...terminationData,
                        terminationDate: e.target.value,
                      })
                    }
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <Label>Motif de résiliation *</Label>
                  <Textarea
                    value={terminationData.terminationReason}
                    onChange={(e) =>
                      setTerminationData({
                        ...terminationData,
                        terminationReason: e.target.value,
                      })
                    }
                    placeholder="Indiquer le motif de la résiliation..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowTerminationModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const selectedContractForTermination = contracts.find(
                      (c) => c.id === terminationData.contractId
                    );
                    if (selectedContractForTermination) {
                      createTerminationMutation.mutate({
                        type: "termination",
                        referenceId: terminationData.contractId,
                        reference: selectedContractForTermination.number,
                        subject: `Résiliation du contrat ${selectedContractForTermination.number}`,
                        requestedBy: "admin-1",
                        assignedTo: "validator-1",
                        reason: terminationData.terminationReason,
                        status: "pending",
                      });
                    }
                  }}
                  disabled={
                    !terminationData.contractId ||
                    !terminationData.terminationReason ||
                    !terminationData.terminationDate ||
                    createTerminationMutation.isPending
                  }
                >
                  {createTerminationMutation.isPending
                    ? "Création..."
                    : "Créer la demande"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de confirmation de suppression */}
          <ConfirmModal
            open={showDeleteModal}
            onOpenChange={setShowDeleteModal}
            title="Supprimer le contrat"
            description={`Êtes-vous sûr de vouloir supprimer le contrat "${contractToDelete?.number}" ? Cette action changera le statut du contrat en "supprimé".`}
            confirmText="Supprimer"
            cancelText="Annuler"
            variant="destructive"
            onConfirm={() => {
              console.log("Suppression du contrat:", contractToDelete);
              setShowDeleteModal(false);
              setContractToDelete(null);
            }}
          />

          {/* Modal de confirmation de changement de statut */}
          <ConfirmModal
            open={showStatusChangeModal}
            onOpenChange={setShowStatusChangeModal}
            title="Changer le statut du contrat"
            description={`Êtes-vous sûr de vouloir changer le statut du contrat de "${statusChangeData.oldStatus}" à "${statusChangeData.newStatus}" ?`}
            confirmText="Confirmer"
            cancelText="Annuler"
            variant="default"
            onConfirm={() => {
              console.log("Changement de statut:", statusChangeData);
              setShowStatusChangeModal(false);
              setStatusChangeData({
                contractId: "",
                newStatus: "",
                oldStatus: "",
              });
            }}
          />

          {/* Modal d'export avancé */}
          <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
            <DialogContent data-testid="export-modal">
              <DialogHeader>
                <DialogTitle>Exporter les contrats</DialogTitle>
                <DialogDescription>
                  Configurez les options d'export pour générer votre fichier
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="export-format">Format d'export</Label>
                  <Select defaultValue="excel">
                    <SelectTrigger id="export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                      <SelectItem value="json">JSON (.json)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-range">Période</Label>
                  <Select defaultValue="current">
                    <SelectTrigger id="export-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Filtres actuels</SelectItem>
                      <SelectItem value="all">Tous les contrats</SelectItem>
                      <SelectItem value="active">
                        Contrats actifs uniquement
                      </SelectItem>
                      <SelectItem value="custom">
                        Période personnalisée
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Colonnes à inclure</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="col-basic" defaultChecked />
                      <Label htmlFor="col-basic" className="cursor-pointer">
                        Informations de base
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="col-financial"
                        defaultChecked
                      />
                      <Label htmlFor="col-financial" className="cursor-pointer">
                        Données financières
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="col-dates" defaultChecked />
                      <Label htmlFor="col-dates" className="cursor-pointer">
                        Dates importantes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="col-kpi" />
                      <Label htmlFor="col-kpi" className="cursor-pointer">
                        Indicateurs KPI
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    console.log("Export des contrats");
                    setShowExportModal(false);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
