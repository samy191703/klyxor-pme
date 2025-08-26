import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import SidebarWithSubmenu from "@/components/layout/sidebar-with-submenu";
import MobileNavWithSubmenu from "@/components/layout/mobile-nav-with-submenu";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, Download, Eye, Check, X, Calculator, AlertTriangle,
  Calendar, DollarSign, FileText, Info, RefreshCw, Clock, Settings,
  CheckCircle, XCircle, Database, FileDown, ZoomIn, Maximize2,
  Bell, Route, Hash, Building2, BarChart, Archive, Filter, Search,
  Activity, Link, Save, Edit, Trash2, Plus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Indexation } from "@shared/schema";

export default function Indexations() {
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [formulaFilter, setFormulaFilter] = useState<string>("all");
  const [indexFilter, setIndexFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [buFilter, setBuFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  
  // Detail panel
  const [showIndexationDetails, setShowIndexationDetails] = useState(false);
  const [selectedIndexation, setSelectedIndexation] = useState<any>(null);
  
  // Modals
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationDecision, setValidationDecision] = useState<"validate" | "reject" | "">("");
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Report viewer
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: indexations = [], isLoading } = useQuery<Indexation[]>({
    queryKey: ["/api/indexations"],
  });

  // KPIs calculation
  const kpis = {
    toCalculateToday: indexations.filter(i => i.status === "to_calculate" && isToday(i.indexationDate)).length,
    toValidate: indexations.filter(i => i.status === "pending").length,
    validated30Days: indexations.filter(i => i.status === "validated" && isWithin30Days(i.validatedAt)).length,
    inError: indexations.filter(i => i.status === "error" || i.status === "waiting_index").length,
  };

  const filteredIndexations = indexations.filter(indexation => {
    const matchesSearch = searchTerm === "" ||
      indexation.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      indexation.contractTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || indexation.status === statusFilter;
    const matchesFrequency = frequencyFilter === "all" || indexation.frequency === frequencyFilter;
    const matchesFormula = formulaFilter === "all" || indexation.formula === formulaFilter;
    const matchesIndex = indexFilter === "all" || indexation.indexKey === indexFilter;
    const matchesSource = sourceFilter === "all" || indexation.source === sourceFilter;
    const matchesBu = buFilter === "all" || indexation.businessUnit === buFilter;
    const matchesResponsible = responsibleFilter === "all" || indexation.responsible === responsibleFilter;
    
    return matchesSearch && matchesStatus && matchesFrequency && matchesFormula && 
           matchesIndex && matchesSource && matchesBu && matchesResponsible;
  });

  function isToday(date: Date | string | null | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
  }

  function isWithin30Days(date: Date | string | null | undefined): boolean {
    if (!date) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(date) >= thirtyDaysAgo;
  }

  const formatAmount = (amount: string | number | undefined, currency = 'EUR') => {
    if (!amount) return "-";
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('fr-FR').format(new Date(date));
  };

  const formatPercentage = (value: string | number | undefined) => {
    if (!value) return "-";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "validated": return "success";
      case "pending": return "warning";
      case "to_calculate": return "secondary";
      case "rejected": return "destructive";
      case "error": return "destructive";
      case "waiting_index": return "outline";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "validated": return "Validé — appliqué";
      case "pending": return "Calculé — en attente de validation";
      case "to_calculate": return "À calculer";
      case "rejected": return "Rejeté";
      case "error": return "Erreur de calcul";
      case "waiting_index": return "En attente d'indice";
      default: return status;
    }
  };

  const getDeltaVariant = (percentage: string | number | undefined) => {
    if (!percentage) return "secondary";
    const value = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
    if (value > 5) return "destructive";
    if (value > 2) return "warning";
    return "secondary";
  };

  const handleShowDetails = (indexation: any) => {
    setSelectedIndexation(indexation);
    setShowIndexationDetails(true);
  };

  const handleRecalculate = (indexation: any) => {
    setSelectedIndexation(indexation);
    setShowRecalculateModal(true);
  };

  const handleValidate = (indexation: any) => {
    setSelectedIndexation(indexation);
    setShowValidationModal(true);
    setValidationDecision("");
    setRejectionReason("");
  };

  const handleSubmitRecalculation = () => {
    toast({
      title: "Recalcul lancé",
      description: "L'indexation a été recalculée avec les dernières valeurs d'indices",
    });
    setShowRecalculateModal(false);
    queryClient.invalidateQueries({ queryKey: ["/api/indexations"] });
  };

  const handleSubmitValidation = () => {
    if (validationDecision === "validate") {
      toast({
        title: "Indexation validée",
        description: "Le montant a été appliqué au contrat et le rapport généré",
      });
    } else if (validationDecision === "reject" && rejectionReason) {
      toast({
        title: "Indexation rejetée",
        description: "Le motif a été enregistré et l'opération journalisée",
      });
    }
    setShowValidationModal(false);
    queryClient.invalidateQueries({ queryKey: ["/api/indexations"] });
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowReportViewer(true);
  };

  // Mock data for demonstration
  const frequencies = ["Annuelle", "Trimestrielle", "Semestrielle", "Mensuelle"];
  const formulas = ["ICC", "ILC", "IRL", "BT01", "FM0A", "Personnalisée"];
  const sources = ["INSEE", "Eurostat", "Banque de France"];
  const businessUnits = ["BU France", "BU International", "BU Services"];
  const responsibles = ["Marie Dupont", "Jean Martin", "Sophie Bernard"];

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarWithSubmenu />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNavWithSubmenu />
            <h1 className="text-lg font-semibold">Indexations & rapports</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="indexations-main">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="list">Indexations</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
                <TabsTrigger value="reports">Rapports</TabsTrigger>
                <TabsTrigger value="settings">Paramétrage</TabsTrigger>
              </TabsList>

              {/* IX-1: Liste globale */}
              <TabsContent value="list" className="space-y-6">
                {/* Titre */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Indexations</h1>
                </div>

                {/* Tuiles KPI */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Calculator className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{kpis.toCalculateToday}</div>
                      <p className="text-sm text-gray-600 font-medium">À calculer aujourd'hui</p>
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
                      <div className="text-3xl font-bold text-gray-900">{kpis.validated30Days}</div>
                      <p className="text-sm text-gray-600 font-medium">Validées (30 j)</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{kpis.inError}</div>
                      <p className="text-sm text-gray-600 font-medium">En erreur</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Barre de filtres */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Période d'indexation */}
                      <Input
                        type="date"
                        placeholder="Période d'indexation"
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        data-testid="input-period"
                      />

                      {/* Statut */}
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="to_calculate">À calculer</SelectItem>
                          <SelectItem value="pending">Calculé — en attente de validation</SelectItem>
                          <SelectItem value="validated">Validé — appliqué</SelectItem>
                          <SelectItem value="rejected">Rejeté</SelectItem>
                          <SelectItem value="error">Erreur de calcul</SelectItem>
                          <SelectItem value="waiting_index">En attente d'indice</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Fréquence */}
                      <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                        <SelectTrigger data-testid="select-frequency">
                          <SelectValue placeholder="Fréquence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les fréquences</SelectItem>
                          {frequencies.map(freq => (
                            <SelectItem key={freq} value={freq.toLowerCase()}>{freq}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Formule d'indexation */}
                      <Select value={formulaFilter} onValueChange={setFormulaFilter}>
                        <SelectTrigger data-testid="select-formula">
                          <SelectValue placeholder="Formule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les formules</SelectItem>
                          {formulas.map(formula => (
                            <SelectItem key={formula} value={formula.toLowerCase()}>{formula}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Indice */}
                      <Select value={indexFilter} onValueChange={setIndexFilter}>
                        <SelectTrigger data-testid="select-index">
                          <SelectValue placeholder="Indice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les indices</SelectItem>
                          {formulas.map(index => (
                            <SelectItem key={index} value={index.toLowerCase()}>{index}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Source */}
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger data-testid="select-source">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les sources</SelectItem>
                          {sources.map(source => (
                            <SelectItem key={source} value={source.toLowerCase()}>{source}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* BU/Entité */}
                      <Select value={buFilter} onValueChange={setBuFilter}>
                        <SelectTrigger data-testid="select-bu">
                          <SelectValue placeholder="BU/Entité" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les BU</SelectItem>
                          {businessUnits.map(bu => (
                            <SelectItem key={bu} value={bu.toLowerCase()}>{bu}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Responsable */}
                      <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                        <SelectTrigger data-testid="select-responsible">
                          <SelectValue placeholder="Responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les responsables</SelectItem>
                          {responsibles.map(resp => (
                            <SelectItem key={resp} value={resp.toLowerCase()}>{resp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Recherche */}
                      <Input
                        placeholder="N°, titre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="col-span-2 md:col-span-4"
                        data-testid="input-search"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Encart d'aide */}
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Les calculs utilisent des indices définitifs. En cas d'indisponibilité ou d'échec d'API, 
                    l'indexation reste à l'état "En attente d'indice".
                  </AlertDescription>
                </Alert>

                {/* Liste (tableau) */}
                <Card>
                  <CardContent className="p-0">
                    {filteredIndexations.length === 0 ? (
                      /* IX-9: État vide */
                      <div className="flex flex-col items-center justify-center py-12">
                        <TrendingUp className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-lg text-gray-600 mb-2">
                          Aucune indexation pour la période sélectionnée
                        </p>
                        <Button variant="outline" onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setFrequencyFilter("all");
                          setFormulaFilter("all");
                          setIndexFilter("all");
                          setSourceFilter("all");
                          setBuFilter("all");
                          setResponsibleFilter("all");
                          setPeriodFilter("");
                        }}>
                          Réinitialiser les filtres
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Contrat</TableHead>
                              <TableHead>Date d'indexation</TableHead>
                              <TableHead>Fréquence</TableHead>
                              <TableHead>Formule</TableHead>
                              <TableHead>Indice</TableHead>
                              <TableHead>Date indice origine/révision</TableHead>
                              <TableHead>Montant précédent</TableHead>
                              <TableHead>Montant proposé</TableHead>
                              <TableHead>Δ %</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Valideur assigné</TableHead>
                              <TableHead>Dernière MàJ</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredIndexations.map((indexation) => (
                              <TableRow 
                                key={indexation.id} 
                                data-testid={`row-indexation-${indexation.id}`}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleShowDetails(indexation)}
                              >
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      <a href="#" className="text-blue-600 hover:underline">
                                        {indexation.contractNumber}
                                      </a>
                                    </div>
                                    <div className="text-sm text-gray-500">{indexation.contractTitle}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{formatDate(indexation.indexationDate)}</TableCell>
                                <TableCell>{indexation.frequency}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{indexation.formula}</Badge>
                                </TableCell>
                                <TableCell>{indexation.indexKey}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div>{formatDate(indexation.originalIndexDate)}</div>
                                    <div className="text-gray-500">{formatDate(indexation.revisionIndexDate)}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{formatAmount(indexation.previousAmount)}</TableCell>
                                <TableCell>{formatAmount(indexation.proposedAmount)}</TableCell>
                                <TableCell>
                                  <Badge variant={getDeltaVariant(indexation.deltaPercentage) as any}>
                                    {formatPercentage(indexation.deltaPercentage)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusVariant(indexation.status) as any}>
                                    {getStatusLabel(indexation.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell>{indexation.assignedValidator || "-"}</TableCell>
                                <TableCell>{formatDate(indexation.updatedAt)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end space-x-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleShowDetails(indexation);
                                      }}
                                      data-testid={`button-view-${indexation.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRecalculate(indexation);
                                      }}
                                      data-testid={`button-recalculate-${indexation.id}`}
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </Button>
                                    {indexation.status === "pending" && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleValidate(indexation);
                                        }}
                                        className="text-green-600 hover:text-green-700"
                                        data-testid={`button-validate-${indexation.id}`}
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Pagination */}
                    {filteredIndexations.length > 0 && (
                      <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
                        <div>
                          1-{Math.min(parseInt(itemsPerPage), filteredIndexations.length)} sur {filteredIndexations.length}
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
              </TabsContent>

              {/* IX-5: Historique des indexations */}
              <TabsContent value="history" className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Historique des indexations</h1>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Journal des indexations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Input type="date" placeholder="Période début" />
                        <Input type="date" placeholder="Période fin" />
                        <Input placeholder="Contrat" />
                        <Input placeholder="Clé d'indice" />
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Source" />
                          </SelectTrigger>
                          <SelectContent>
                            {sources.map(source => (
                              <SelectItem key={source} value={source.toLowerCase()}>{source}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Résultat" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="validated">Validé</SelectItem>
                            <SelectItem value="rejected">Rejeté</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Type d'événement" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="calculation">Calcul</SelectItem>
                            <SelectItem value="recalculation">Recalcul</SelectItem>
                            <SelectItem value="validation">Validation</SelectItem>
                            <SelectItem value="application">Application</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="ID/contrat" />
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date/heure</TableHead>
                              <TableHead>Contrat</TableHead>
                              <TableHead>Indice N-1 / N</TableHead>
                              <TableHead>Montant précédent</TableHead>
                              <TableHead>Montant proposé</TableHead>
                              <TableHead>Décision</TableHead>
                              <TableHead>Δ %</TableHead>
                              <TableHead>Auteur</TableHead>
                              <TableHead>Trace-ID</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* History entries would go here */}
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                                Aucune entrée dans l'historique
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-between items-center">
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Exporter (Excel/CSV)
                        </Button>
                        <div className="text-sm text-gray-600">
                          Intégrité : entrées horodatées, non modifiables
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* IX-6: Rapports d'indexation */}
              <TabsContent value="reports" className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Rapports d'indexation</h1>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Liste des rapports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Input type="date" placeholder="Période début" />
                        <Input type="date" placeholder="Période fin" />
                        <Input placeholder="Contrat" />
                        <Input placeholder="Clé d'indice" />
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Source" />
                          </SelectTrigger>
                          <SelectContent>
                            {sources.map(source => (
                              <SelectItem key={source} value={source.toLowerCase()}>{source}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Statut indexation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="validated">Validée</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Recherche" className="col-span-2" />
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date du rapport</TableHead>
                              <TableHead>Contrat</TableHead>
                              <TableHead>Période</TableHead>
                              <TableHead>Indices utilisés</TableHead>
                              <TableHead>Montant précédent/nouveau</TableHead>
                              <TableHead>Δ % / Δ €</TableHead>
                              <TableHead>Liens export</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>{formatDate(new Date())}</TableCell>
                              <TableCell>CNT-2024-001</TableCell>
                              <TableCell>2023 → 2024</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>ICC: 125.3 → 128.7</div>
                                  <div className="text-gray-500">INSEE</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{formatAmount(100000)} → {formatAmount(102712)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>+2.71%</div>
                                  <div className="text-gray-500">+2 712 €</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="ghost" size="sm">
                                    <FileDown className="w-4 h-4 mr-1" />
                                    PDF
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <FileDown className="w-4 h-4 mr-1" />
                                    Excel
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewReport({})}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>

                      <div className="text-sm text-gray-600">
                        Chaque rapport est généré automatiquement après validation et rattaché au contrat
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* IX-8: Paramétrage des indexations */}
              <TabsContent value="settings" className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Paramétrage des indexations</h1>
                </div>

                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Accès Admin uniquement</strong> - Ces paramètres affectent tous les contrats
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  {/* Section Formules */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Formules d'indexation</span>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Nouvelle formule
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Libellé</TableHead>
                            <TableHead>Expression</TableHead>
                            <TableHead>Variables</TableHead>
                            <TableHead>Dernière modification</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>ICC Standard</TableCell>
                            <TableCell className="font-mono text-sm">
                              (Montant N-1) × (Indice N / Indice N-1)
                            </TableCell>
                            <TableCell>Montants, Indices N/N-1</TableCell>
                            <TableCell>{formatDate(new Date())}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Section Fréquences & périmètres */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Fréquences & périmètres</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Définition par contrat de la fréquence et des lignes budgétaires concernées
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contrat</TableHead>
                            <TableHead>Fréquence</TableHead>
                            <TableHead>Périmètre</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>CNT-2024-001</TableCell>
                            <TableCell>Annuelle</TableCell>
                            <TableCell>Fixe + Variable</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Section Indices & sources */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Indices & sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Mapping contrats ↔ clés d'indices, configuration des sources officielles
                      </p>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Source INSEE</Label>
                            <Input value="https://api.insee.fr/v2/" readOnly />
                          </div>
                          <div>
                            <Label>Source Eurostat</Label>
                            <Input value="https://ec.europa.eu/eurostat/api/" readOnly />
                          </div>
                        </div>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Utilisation des valeurs définitives avec historisation automatique
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section Routage de validation */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Routage de validation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Affectation par défaut</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {responsibles.map(resp => (
                                  <SelectItem key={resp} value={resp.toLowerCase()}>{resp}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Remplaçant</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {responsibles.map(resp => (
                                  <SelectItem key={resp} value={resp.toLowerCase()}>{resp}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="auto-reminder" defaultChecked />
                          <Label htmlFor="auto-reminder">
                            Relances automatiques après 24h
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section Notifications */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Notifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Seuil d'alerte (Δ montant)</Label>
                          <div className="flex items-center space-x-2">
                            <Input type="number" placeholder="5" className="w-20" />
                            <span>%</span>
                          </div>
                        </div>
                        <div>
                          <Label>Canaux de notification</Label>
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="notif-app" defaultChecked />
                              <Label htmlFor="notif-app">In-app</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="notif-email" defaultChecked />
                              <Label htmlFor="notif-email">Email</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="notif-teams" />
                              <Label htmlFor="notif-teams">Teams</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer les modifications
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Toutes les modifications sont journalisées
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* IX-2: Détail d'une indexation (Sheet) */}
            <Sheet open={showIndexationDetails} onOpenChange={setShowIndexationDetails}>
              <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[600px] lg:max-w-[700px] overflow-y-auto">
                {selectedIndexation && (
                  <>
                    <SheetHeader>
                      <SheetTitle>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>{selectedIndexation.contractNumber}</span>
                            <Badge variant={getStatusVariant(selectedIndexation.status) as any}>
                              {getStatusLabel(selectedIndexation.status)}
                            </Badge>
                          </div>
                          <div className="text-sm font-normal">
                            {selectedIndexation.contractTitle}
                          </div>
                          <div className="text-sm font-normal text-gray-600">
                            Date d'indexation : {formatDate(selectedIndexation.indexationDate)}
                          </div>
                        </div>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                      {/* Paramètres contractuels */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Paramètres contractuels</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fréquence :</span>
                            <span>{selectedIndexation.frequency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Formule d'indexation :</span>
                            <span>{selectedIndexation.formula}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Périmètre :</span>
                            <span>Fixe + Variable</span>
                          </div>
                        </div>
                      </div>

                      {/* Indices utilisés */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Indices utilisés</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Clé d'indice :</span>
                            <span>{selectedIndexation.indexKey}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Source :</span>
                            <span>{selectedIndexation.source}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dernière valeur (définitive) :</span>
                            <span>128.7</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Date de publication :</span>
                            <span>{formatDate(new Date())}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Indice d'origine :</span>
                            <span>{formatDate(selectedIndexation.originalIndexDate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Indice révisé :</span>
                            <span>{formatDate(selectedIndexation.revisionIndexDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Calcul */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Calcul</h3>
                        <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                          (Montant N-1) × (Indice N / Indice N-1)
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Montant précédent :</span>
                            <span>{formatAmount(selectedIndexation.previousAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Montant calculé :</span>
                            <span className="font-medium">{formatAmount(selectedIndexation.proposedAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Δ absolu :</span>
                            <span>
                              {formatAmount(
                                (selectedIndexation.proposedAmount || 0) - (selectedIndexation.previousAmount || 0)
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Δ % :</span>
                            <Badge variant={getDeltaVariant(selectedIndexation.deltaPercentage) as any}>
                              {formatPercentage(selectedIndexation.deltaPercentage)}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Règle d'arrondi :</span>
                            <span>2 décimales</span>
                          </div>
                        </div>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Aucune application sans décision de validation.
                          </AlertDescription>
                        </Alert>
                      </div>

                      {/* Workflow */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Workflow</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">À valider par :</span>
                            <span>{selectedIndexation.assignedValidator || "Non assigné"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">SLA :</span>
                            <span>48h</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Relances auto &gt; 24h activées</span>
                          </div>
                        </div>
                      </div>

                      {/* Historisation */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Historisation</h3>
                        <div className="space-y-2">
                          <div className="flex items-start space-x-2 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                            <div className="flex-1">
                              <div className="font-medium">Calcul initial</div>
                              <div className="text-gray-500">{formatDate(new Date())} - Système</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <Button onClick={() => handleRecalculate(selectedIndexation)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Recalculer
                        </Button>
                        {selectedIndexation.status === "pending" && (
                          <Button onClick={() => handleValidate(selectedIndexation)}>
                            Valider / Rejeter
                          </Button>
                        )}
                        <Button variant="outline">
                          Ouvrir l'historique complet
                        </Button>
                        {selectedIndexation.status === "validated" && (
                          <Button variant="outline">
                            <FileText className="w-4 h-4 mr-2" />
                            Ouvrir le rapport
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>

            {/* IX-3: Modale Recalculer */}
            <Dialog open={showRecalculateModal} onOpenChange={setShowRecalculateModal}>
              <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Recalculer l'indexation</DialogTitle>
                </DialogHeader>
                
                {selectedIndexation && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div>Contrat : {selectedIndexation.contractNumber}</div>
                      <div>Date d'indexation : {formatDate(selectedIndexation.indexationDate)}</div>
                      <div>Formule : {selectedIndexation.formula}</div>
                      <div>Clé d'indice : {selectedIndexation.indexKey}</div>
                      <div>Valeur utilisée actuellement : 125.3</div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Source des indices</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dernière valeur connue (définitive) :</span>
                          <span>128.7</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date de publication :</span>
                          <span>{formatDate(new Date())}</span>
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Le recalcul utilise automatiquement la dernière valeur d'indice disponible et définitive.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRecalculateModal(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmitRecalculation}>
                    Lancer le recalcul
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* IX-4: Modale Valider/Rejeter */}
            <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
              <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Valider / Rejeter l'indexation</DialogTitle>
                </DialogHeader>
                
                {selectedIndexation && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>Montant précédent :</span>
                        <span>{formatAmount(selectedIndexation.previousAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Indices N-1 / N :</span>
                        <span>125.3 / 128.7 (INSEE)</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Montant calculé :</span>
                        <span>{formatAmount(selectedIndexation.proposedAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Δ % / Δ € :</span>
                        <span>
                          {formatPercentage(selectedIndexation.deltaPercentage)} / 
                          {formatAmount((selectedIndexation.proposedAmount || 0) - (selectedIndexation.previousAmount || 0))}
                        </span>
                      </div>
                    </div>

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
                        <Label>Motif (obligatoire en cas de rejet)</Label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Indiquer le motif du rejet..."
                          className="mt-1"
                        />
                      </div>
                    )}

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Après validation, le montant est appliqué au contrat et l'opération est historisée.
                      </AlertDescription>
                    </Alert>
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

            {/* IX-7: Visualisation rapport (Dialog) */}
            <Dialog open={showReportViewer} onOpenChange={setShowReportViewer}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Rapport d'indexation</span>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <FileDown className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                      <Button variant="ghost" size="sm">
                        <FileDown className="w-4 h-4 mr-1" />
                        Excel
                      </Button>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="mt-4">
                  <div className="bg-gray-100 p-8 rounded min-h-[400px] flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium">Rapport d'indexation</p>
                        <p className="text-sm text-gray-600 mt-2">
                          Contrat: CNT-2024-001<br />
                          Période: 2023 → 2024<br />
                          Formule appliquée: ICC<br />
                          Montants: {formatAmount(100000)} → {formatAmount(102712)}<br />
                          Δ: +2.71% / +2 712 €
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Le rapport est également disponible en Excel
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowReportViewer(false)}>
                    Fermer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* IX-9: Bannières d'erreur */}
            {false && (
              <div className="space-y-4 mt-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Indice indisponible :</strong> La valeur définitive de l'indice n'est pas encore publiée ; 
                    la ligne reste "En attente d'indice".
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erreur de calcul :</strong> Calcul suspendu — vérifiez la formule et/ou les valeurs d'indice.
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erreur d'API :</strong> Échec de récupération des indices — incident loggué, 
                    relance automatique / alerte admin.
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Échec de validation :</strong> Décision non enregistrée — 
                    la ligne reste "Calculé — en attente de validation".
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Rappels visibles */}
            <div className="mt-6 text-xs text-gray-500 space-y-1">
              <p>• Automatisation + validation : détection à la date d'indexation, calcul automatique, application seulement après validation</p>
              <p>• Sources officielles : récupération automatique, valeurs définitives, historisation des indices</p>
              <p>• RBAC partout : listes, détails, actions et rapports selon rôle</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}