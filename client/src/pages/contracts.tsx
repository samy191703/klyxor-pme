import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, FileUp, Plus, Download, RefreshCw, Eye, Edit2, 
  AlertTriangle, CheckCircle, Clock, XCircle, Calendar,
  DollarSign, Building2, Globe, Hash, Info, Upload, X,
  ChevronRight, ChevronLeft, Save, Send, FileCheck
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Contract } from "@shared/schema";
import { AIHelpBubble } from "@/components/ai-help/ai-help-bubble";
import { useAIHelp } from "@/components/ai-help/context-provider";

export default function Contracts() {
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
  const [validationDecision, setValidationDecision] = useState<"validate" | "reject" | "">("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [validationComment, setValidationComment] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // KPIs calculation
  const kpis = {
    drafts: contracts.filter(c => c.status === "draft").length,
    toValidate: contracts.filter(c => c.status === "pending_validation").length,
    active: contracts.filter(c => c.status === "active").length,
    terminated: contracts.filter(c => c.status === "terminated").length,
    closed: contracts.filter(c => c.status === "closed").length,
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchTerm === "" ||
      contract.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    const matchesType = typeFilter === "all" || contract.type === typeFilter;
    const matchesBU = businessUnitFilter === "all" || contract.businessUnit === businessUnitFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesBU;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "pending_validation": return "warning";
      case "draft": return "secondary";
      case "terminated": return "destructive";
      case "closed": return "outline";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Actif";
      case "pending_validation": return "À valider";
      case "draft": return "Brouillon";
      case "terminated": return "Résilié";
      case "closed": return "Clôturé";
      default: return status;
    }
  };

  const formatAmount = (amount: string | number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('fr-FR').format(new Date(date));
  };

  const getDaysUntilExpiry = (endDate: Date | string | null) => {
    if (!endDate) return null;
    const days = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const businessUnits = [...new Set(contracts.map(c => c.businessUnit))];
  const contractTypes = ["Achat", "Vente", "Service", "Maintenance", "Licence", "Location"];

  const handleCreateContract = () => {
    setShowWizard(true);
    setWizardStep(1);
    setWizardData({});
  };

  const handleWizardNext = () => {
    if (wizardStep < 5) {
      setWizardStep(wizardStep + 1);
    } else {
      // Submit contract
      toast({
        title: "Contrat créé",
        description: "Le contrat a été créé avec le statut 'À valider'",
      });
      setShowWizard(false);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNav />
            <h1 className="text-lg font-semibold">Gestion des contrats</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="contracts-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Title with AI Help */}
            <div className="mb-6 relative">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 hidden lg:block">Gestion des contrats</h1>
              <AIHelpBubble
                title="Besoin d'aide avec les contrats ?"
                triggerClassName="absolute -top-2 -right-2 lg:top-0 lg:right-0"
                contextData={{
                  page: 'contracts',
                  totalContracts: contracts.length,
                  toValidate: kpis.toValidate,
                  activeContracts: kpis.active
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
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Contrats</h1>
                  </div>

                  {/* Tuiles KPI */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 lg:mb-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <FileText className="w-8 h-8 text-gray-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.drafts}</div>
                        <p className="text-sm text-gray-600 font-medium">Brouillons</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <Clock className="w-8 h-8 text-orange-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.toValidate}</div>
                        <p className="text-sm text-gray-600 font-medium">À valider</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.active}</div>
                        <p className="text-sm text-gray-600 font-medium">Actifs</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.terminated}</div>
                        <p className="text-sm text-gray-600 font-medium">Résiliés</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <FileCheck className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{kpis.closed}</div>
                        <p className="text-sm text-gray-600 font-medium">Clôturés</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Barre de filtres */}
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {/* Période */}
                        <Select value={periodFilter} onValueChange={setPeriodFilter}>
                          <SelectTrigger data-testid="select-period">
                            <SelectValue placeholder="Période" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les périodes</SelectItem>
                            <SelectItem value="creation">Création</SelectItem>
                            <SelectItem value="effect">Effet</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Statut */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Statut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="draft">Brouillon</SelectItem>
                            <SelectItem value="pending_validation">À valider</SelectItem>
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
                            {contractTypes.map(type => (
                              <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* BU/Entité */}
                        <Select value={businessUnitFilter} onValueChange={setBusinessUnitFilter}>
                          <SelectTrigger data-testid="select-bu">
                            <SelectValue placeholder="BU/Entité" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les BU</SelectItem>
                            {businessUnits.map(bu => (
                              <SelectItem key={bu} value={bu}>{bu}</SelectItem>
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

                        <Button onClick={handleCreateContract} className="col-span-2 md:col-span-1">
                          <Plus className="w-4 h-4 mr-2" />
                          Créer un contrat
                        </Button>

                        <Button variant="outline">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Actualiser
                        </Button>

                        <Button variant="default">
                          <Download className="w-4 h-4 mr-2" />
                          Exporter
                        </Button>
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
                          <Button variant="outline" onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setTypeFilter("all");
                            setBusinessUnitFilter("all");
                            setPeriodFilter("all");
                          }}>
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
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredContracts.map((contract) => {
                                const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
                                const hasIndexation = contract.indexationFrequency !== null;
                                
                                return (
                                  <TableRow 
                                    key={contract.id} 
                                    data-testid={`row-contract-${contract.id}`}
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleShowContractDetails(contract)}
                                  >
                                    <TableCell className="font-medium">
                                      <a href="#" className="text-blue-600 hover:underline">
                                        CT-2025-{contract.id.slice(-4).toUpperCase()}
                                      </a>
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium">{contract.title}</div>
                                        <div className="text-sm text-gray-500">{contract.type}</div>
                                      </div>
                                    </TableCell>
                                    <TableCell>{contract.type}</TableCell>
                                    <TableCell>
                                      <Badge variant={getStatusVariant(contract.status) as any}>
                                        {getStatusLabel(contract.status)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(contract.startDate)}</TableCell>
                                    <TableCell>{formatDate(contract.endDate)}</TableCell>
                                    <TableCell>{formatAmount(contract.amount, contract.currency)}</TableCell>
                                    <TableCell>
                                      {contract.variableAmount ? 
                                        formatAmount(contract.variableAmount, contract.currency) : 
                                        "-"
                                      }
                                    </TableCell>
                                    <TableCell>
                                      {hasIndexation ? (
                                        <Badge variant="secondary">Oui</Badge>
                                      ) : (
                                        <span className="text-gray-400">Non</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {daysUntilExpiry !== null && daysUntilExpiry <= 30 ? (
                                        <Badge variant={daysUntilExpiry <= 1 ? "destructive" : daysUntilExpiry <= 7 ? "warning" : "secondary"}>
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
                                    <TableCell>{formatDate(contract.updatedAt)}</TableCell>
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
                                        {contract.status === "pending_validation" && (
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
                            1-{Math.min(parseInt(itemsPerPage), filteredContracts.length)} sur {filteredContracts.length}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span>Afficher:</span>
                            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
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
                    <h1 className="text-3xl font-bold text-gray-900">Historique des contrats</h1>
                  </div>
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-gray-600">Historique complet des modifications et actions sur les contrats.</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              /* GC-2: Wizard de création */
              <div className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Nouveau contrat</h1>
                  <Progress value={(wizardStep / 5) * 100} className="mt-4" />
                  <div className="flex justify-between mt-2 text-sm text-gray-600">
                    <span className={wizardStep >= 1 ? "font-medium" : ""}>Informations générales</span>
                    <span className={wizardStep >= 2 ? "font-medium" : ""}>Période & montants</span>
                    <span className={wizardStep >= 3 ? "font-medium" : ""}>Indexation</span>
                    <span className={wizardStep >= 4 ? "font-medium" : ""}>Pièce jointe</span>
                    <span className={wizardStep >= 5 ? "font-medium" : ""}>Récapitulatif</span>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-6">
                    {/* Étape 1: Informations générales */}
                    {wizardStep === 1 && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Étape 1 — Informations générales</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>N° contrat *</Label>
                            <Input 
                              placeholder="CT-2025-XXXX" 
                              value={wizardData.number || ""}
                              onChange={(e) => setWizardData({...wizardData, number: e.target.value})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Masque + unicité contrôlée</p>
                          </div>
                          <div>
                            <Label>Titre/SPV *</Label>
                            <Input 
                              placeholder="Titre du contrat"
                              value={wizardData.title || ""}
                              onChange={(e) => setWizardData({...wizardData, title: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Type *</Label>
                            <Select 
                              value={wizardData.type || ""}
                              onValueChange={(value) => setWizardData({...wizardData, type: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un type" />
                              </SelectTrigger>
                              <SelectContent>
                                {contractTypes.map(type => (
                                  <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>BU/Entité *</Label>
                            <Select 
                              value={wizardData.bu || ""}
                              onValueChange={(value) => setWizardData({...wizardData, bu: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une BU" />
                              </SelectTrigger>
                              <SelectContent>
                                {businessUnits.map(bu => (
                                  <SelectItem key={bu} value={bu}>{bu}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Devise *</Label>
                            <Select 
                              value={wizardData.currency || "EUR"}
                              onValueChange={(value) => setWizardData({...wizardData, currency: value})}
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
                              onValueChange={(value) => setWizardData({...wizardData, language: value})}
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
                      </div>
                    )}

                    {/* Étape 2: Période & montants */}
                    {wizardStep === 2 && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Étape 2 — Période & montants</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Date début *</Label>
                            <Input 
                              type="date"
                              value={wizardData.startDate || ""}
                              onChange={(e) => setWizardData({...wizardData, startDate: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Date fin *</Label>
                            <Input 
                              type="date"
                              value={wizardData.endDate || ""}
                              onChange={(e) => setWizardData({...wizardData, endDate: e.target.value})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Doit être supérieure à la date début</p>
                          </div>
                          <div>
                            <Label>Montant fixe *</Label>
                            <Input 
                              type="number"
                              placeholder="0.00"
                              value={wizardData.fixedAmount || ""}
                              onChange={(e) => setWizardData({...wizardData, fixedAmount: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Montant variable</Label>
                            <Input 
                              type="number"
                              placeholder="0.00"
                              value={wizardData.variableAmount || ""}
                              onChange={(e) => setWizardData({...wizardData, variableAmount: e.target.value})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Optionnel, 0 accepté</p>
                          </div>
                          <div>
                            <Label>Périodicité de facturation</Label>
                            <Select 
                              value={wizardData.billingFrequency || ""}
                              onValueChange={(value) => setWizardData({...wizardData, billingFrequency: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Mensuelle</SelectItem>
                                <SelectItem value="quarterly">Trimestrielle</SelectItem>
                                <SelectItem value="semi-annual">Semestrielle</SelectItem>
                                <SelectItem value="annual">Annuelle</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Type de paiement</Label>
                            <Select 
                              value={wizardData.paymentType || ""}
                              onValueChange={(value) => setWizardData({...wizardData, paymentType: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="advance">Avance</SelectItem>
                                <SelectItem value="arrears">Terme échu</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Étape 3: Indexation */}
                    {wizardStep === 3 && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Étape 3 — Indexation (paramètres)</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Formule d'indexation</Label>
                            <Select 
                              value={wizardData.indexationFormula || "none"}
                              onValueChange={(value) => setWizardData({...wizardData, indexationFormula: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Pas d'indexation</SelectItem>
                                <SelectItem value="icc">ICC</SelectItem>
                                <SelectItem value="ilc">ILC</SelectItem>
                                <SelectItem value="irl">IRL</SelectItem>
                                <SelectItem value="custom">Personnalisée</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {wizardData.indexationFormula !== "none" && (
                            <>
                              <div>
                                <Label>Date d'indexation</Label>
                                <Input 
                                  type="date"
                                  value={wizardData.indexationDate || ""}
                                  onChange={(e) => setWizardData({...wizardData, indexationDate: e.target.value})}
                                />
                                <p className="text-xs text-gray-500 mt-1">Anniversaire</p>
                              </div>
                              <div>
                                <Label>Date indice d'origine</Label>
                                <Input 
                                  type="date"
                                  value={wizardData.originalIndexDate || ""}
                                  onChange={(e) => setWizardData({...wizardData, originalIndexDate: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>Date de révision d'indice</Label>
                                <Input 
                                  type="date"
                                  value={wizardData.indexRevisionDate || ""}
                                  onChange={(e) => setWizardData({...wizardData, indexRevisionDate: e.target.value})}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Étape 4: Pièce jointe obligatoire */}
                    {wizardStep === 4 && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Étape 4 — Pièce jointe obligatoire</h2>
                        
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
                          <Button variant="outline">
                            Parcourir
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">
                            Formats autorisés : PDF, DOCX, XLSX, ODT, JPG, PNG
                          </p>
                        </div>

                        {wizardData.attachment && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">{wizardData.attachment}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setWizardData({...wizardData, attachment: null})}
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
                        <h2 className="text-xl font-semibold">Étape 5 — Récapitulatif & soumission</h2>
                        
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
                            <div>Montant fixe : {wizardData.fixedAmount || "-"} {wizardData.currency}</div>
                            <div>Montant variable : {wizardData.variableAmount || "0"} {wizardData.currency}</div>
                          </div>
                        </div>

                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Statut initial après création :</strong> « À valider »
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex justify-between mt-6">
                      <div>
                        {wizardStep > 1 && (
                          <Button variant="outline" onClick={handleWizardPrevious}>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Précédent
                          </Button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={() => setShowWizard(false)}>
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
            <Sheet open={showContractDetails} onOpenChange={setShowContractDetails}>
              <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[600px] lg:max-w-[800px] overflow-y-auto">
                {selectedContract && (
                  <>
                    <SheetHeader>
                      <SheetTitle>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>CT-2025-{selectedContract.id.slice(-4).toUpperCase()}</span>
                            <Badge variant={getStatusVariant(selectedContract.status) as any}>
                              {getStatusLabel(selectedContract.status)}
                            </Badge>
                          </div>
                          <div className="text-sm font-normal">
                            {selectedContract.title} - {selectedContract.type}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm font-normal text-gray-600">
                            <div>Début : {formatDate(selectedContract.startDate)}</div>
                            <div>Fin : {formatDate(selectedContract.endDate)}</div>
                            <div>Montant : {formatAmount(selectedContract.amount, selectedContract.currency)}</div>
                          </div>
                        </div>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                      {/* Cartes récap' */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Prochaines échéances</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>J-30</span>
                                <span>{formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>J-7</span>
                                <span>{formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}</span>
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
                              <div>{selectedContract.indexationFrequency || "Pas d'indexation"}</div>
                              {selectedContract.indexationFrequency && (
                                <div className="text-gray-500">Prochaine : 01/01/2025</div>
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
                              <div>Créé le {formatDate(selectedContract.createdAt)}</div>
                              <div>Modifié le {formatDate(selectedContract.updatedAt)}</div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        {selectedContract.status === "pending_validation" && (
                          <>
                            <Button onClick={() => handleValidateContract(selectedContract)}>
                              Valider/Rejeter
                            </Button>
                          </>
                        )}
                        {selectedContract.status === "active" && (
                          <>
                            <Button variant="outline">
                              Mettre à jour montant
                            </Button>
                            <Button variant="destructive">
                              Résilier
                            </Button>
                          </>
                        )}
                        <Button variant="outline">
                          Ouvrir GED
                        </Button>
                        <Button variant="outline">
                          Ouvrir Historique
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>

            {/* GC-4: Modale Valider/Rejeter */}
            <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
              <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Valider / Rejeter le contrat</DialogTitle>
                </DialogHeader>
                
                {selectedContract && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div>N° : CT-2025-{selectedContract.id.slice(-4).toUpperCase()}</div>
                      <div>Titre : {selectedContract.title}</div>
                      <div>Type : {selectedContract.type}</div>
                      <div>Montant : {formatAmount(selectedContract.amount, selectedContract.currency)}</div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Séparation des rôles : le créateur ne peut pas valider son propre contrat
                      </AlertDescription>
                    </Alert>

                    <RadioGroup value={validationDecision} onValueChange={(value: any) => setValidationDecision(value)}>
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
                  <Button variant="outline" onClick={() => setShowValidationModal(false)}>
                    Fermer
                  </Button>
                  <Button 
                    onClick={handleSubmitValidation}
                    disabled={!validationDecision || (validationDecision === "reject" && !rejectionReason)}
                    variant={validationDecision === "validate" ? "default" : "destructive"}
                  >
                    {validationDecision === "validate" ? "Valider" : "Rejeter"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}