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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/common/status-badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, Check, X, Share, Clock, AlertTriangle, CheckCircle, 
  XCircle, Download, RefreshCw, Settings, FileText, Paperclip,
  User, Calendar, ArrowRight, History, AlertCircle, Info
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ValidationRequest } from "@shared/schema";

export default function Validation() {
  const [activeTab, setActiveTab] = useState("list");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("me");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "">("");
  const [rejectReason, setRejectReason] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [internalComment, setInternalComment] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery<ValidationRequest[]>({
    queryKey: ["/api/validation-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/validation-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/validation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      toast({
        title: "Validation approuvée",
        description: "La demande a été approuvée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'approbation.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest("POST", `/api/validation-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/validation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      setShowDetailsPanel(false);
      setSelectedRequest(null);
      toast({
        title: "Validation rejetée",
        description: "La demande a été rejetée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du rejet.",
        variant: "destructive",
      });
    },
  });

  // Données mockées enrichies
  const mockValidationHistory = [
    {
      id: "val-hist-1",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      requestId: "val-101",
      type: "contract",
      module: "Contrats",
      contractNumber: "CNT-2024-001",
      requester: "Sophie Martin",
      validator: "Pierre Durand",
      decision: "approved",
      reason: "",
      processingTime: "2h 15min",
      traceId: "TRC-2024-0145"
    },
    {
      id: "val-hist-2",
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      requestId: "val-102",
      type: "indexation",
      module: "Indexations",
      contractNumber: "CNT-2024-002",
      requester: "Marie Laurent",
      validator: "Jean Dubois",
      decision: "rejected",
      reason: "Justificatifs manquants",
      processingTime: "45min",
      traceId: "TRC-2024-0144"
    }
  ];

  // Calcul des KPIs
  const kpis = {
    pending: requests.filter(r => r.status === "pending").length,
    overdue: requests.filter(r => r.age > 1).length,
    rejected7d: 3, // Mock
    approved7d: 12, // Mock
  };

  const filteredRequests = requests.filter(request => {
    const matchesType = typeFilter === "all" || request.type === typeFilter;
    const matchesModule = moduleFilter === "all" || 
      (moduleFilter === "contracts" && request.type === "contract") ||
      (moduleFilter === "indexations" && request.type === "indexation") ||
      (moduleFilter === "amendments" && request.type === "amendment") ||
      (moduleFilter === "terminations" && request.type === "termination");
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      request.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesModule && matchesStatus && matchesSearch;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "contract": return "Création contrat";
      case "indexation": return "Indexation";
      case "amendment": return "Avenant";
      case "termination": return "Résiliation";
      case "manual_amount": return "Mise à jour manuelle du montant";
      default: return type;
    }
  };

  const getModuleLabel = (type: string) => {
    switch (type) {
      case "contract": return "Contrats";
      case "indexation": return "Indexations";
      case "amendment": return "Avenants";
      case "termination": return "Résiliations";
      default: return "Autres";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending": return "warning";
      case "approved": return "success";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  const getSLARemaining = (createdAt: Date, age: number) => {
    const hours = 24 - (age * 24);
    if (hours <= 0) return { text: "Expiré", variant: "destructive" };
    if (hours <= 6) return { text: `${hours}h`, variant: "warning" };
    return { text: `${hours}h`, variant: "secondary" };
  };

  const handleShowDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsPanel(true);
    setDecision("");
    setRejectReason("");
    setTransferTo("");
    setInternalComment("");
  };

  const handleDecision = () => {
    if (decision === "approve") {
      approveMutation.mutate(selectedRequest.id);
      setShowDetailsPanel(false);
    } else if (decision === "reject" && rejectReason) {
      rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason });
      setShowDetailsPanel(false);
    } else if (transferTo) {
      toast({
        title: "Demande transférée",
        description: `La demande a été transférée à ${transferTo}`,
      });
      setShowDetailsPanel(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatDateShort = (date: Date | string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNav />
            <h1 className="text-lg font-semibold">Workflows de validation</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="validation-main">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="list">À valider</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
                <TabsTrigger value="settings">Paramétrage</TabsTrigger>
              </TabsList>

              {/* WF-1: Boîte "À valider" (liste globale) */}
              <TabsContent value="list" className="space-y-6">
                {/* Titre de page */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">À valider</h1>
                </div>

                {/* Tuiles KPI */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{kpis.pending}</div>
                      <p className="text-sm text-gray-600 font-medium">En attente</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="w-8 h-8 text-orange-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{kpis.overdue}</div>
                      <p className="text-sm text-gray-600 font-medium">&gt; 24 h</p>
                      <p className="text-xs text-gray-500">retard</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{kpis.rejected7d}</div>
                      <p className="text-sm text-gray-600 font-medium">Rejetés (7 j)</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900">{kpis.approved7d}</div>
                      <p className="text-sm text-gray-600 font-medium">Validés (7 j)</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Barre de filtres */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {/* Type de demande */}
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Type de demande" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="contract">Création contrat</SelectItem>
                          <SelectItem value="amendment">Avenant</SelectItem>
                          <SelectItem value="indexation">Indexation</SelectItem>
                          <SelectItem value="termination">Résiliation</SelectItem>
                          <SelectItem value="manual_amount">Mise à jour manuelle du montant</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Module */}
                      <Select value={moduleFilter} onValueChange={setModuleFilter}>
                        <SelectTrigger data-testid="select-module">
                          <SelectValue placeholder="Module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les modules</SelectItem>
                          <SelectItem value="contracts">Contrats</SelectItem>
                          <SelectItem value="indexations">Indexations</SelectItem>
                          <SelectItem value="amendments">Avenants</SelectItem>
                          <SelectItem value="terminations">Résiliations</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Assigné à */}
                      <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                        <SelectTrigger data-testid="select-assignee">
                          <SelectValue placeholder="Assigné à" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="me">Moi</SelectItem>
                          <SelectItem value="team">Équipe</SelectItem>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="person">Pierre Durand</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Statut */}
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="approved">Validé</SelectItem>
                          <SelectItem value="rejected">Rejeté</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Recherche */}
                      <Input
                        placeholder="N° contrat, titre, ID demande..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="col-span-2"
                        data-testid="input-search"
                      />

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

                {/* Encart d'aide - séparation des rôles */}
                {typeFilter === "contract" && (
                  <Alert className="mb-6">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Séparation des rôles pour les validations de contrats :</strong> le créateur ne peut pas être son propre valideur.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Liste (tableau) */}
                <Card>
                  <CardContent className="p-0">
                    {filteredRequests.length === 0 ? (
                      /* WF-5: État vide */
                      <div className="flex flex-col items-center justify-center py-12">
                        <FileText className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-lg text-gray-600 mb-2">
                          Aucune demande à valider selon vos filtres
                        </p>
                        <Button variant="outline" onClick={() => {
                          setTypeFilter("all");
                          setModuleFilter("all");
                          setStatusFilter("pending");
                          setSearchTerm("");
                        }}>
                          Réinitialiser les filtres
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID demande</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Contrat</TableHead>
                              <TableHead>Soumis par</TableHead>
                              <TableHead>Soumis le</TableHead>
                              <TableHead>SLA restant</TableHead>
                              <TableHead>État</TableHead>
                              <TableHead>Étiquettes</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRequests.map((request) => {
                              const sla = getSLARemaining(request.createdAt, request.age);
                              return (
                                <TableRow 
                                  key={request.id} 
                                  data-testid={`row-validation-${request.id}`}
                                  className="cursor-pointer hover:bg-gray-50"
                                  onClick={() => handleShowDetails(request)}
                                >
                                  <TableCell>
                                    <a href="#" className="text-blue-600 hover:underline">
                                      {request.id}
                                    </a>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {getTypeLabel(request.type)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{request.reference}</div>
                                      <div className="text-sm text-gray-500">{request.subject}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{request.requestedBy}</TableCell>
                                  <TableCell>{formatDateShort(request.createdAt)}</TableCell>
                                  <TableCell>
                                    <Badge variant={sla.variant as any}>
                                      {sla.text}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getStatusVariant(request.status) as any}>
                                      {request.status === "pending" ? "En attente" : 
                                       request.status === "approved" ? "Validé" : "Rejeté"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {request.age > 1 && (
                                      <Badge variant="destructive" className="text-xs">
                                        &gt; 24 h
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end space-x-1">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleShowDetails(request);
                                        }}
                                        data-testid={`button-view-${request.id}`}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      {request.status === "pending" && (
                                        <>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              approveMutation.mutate(request.id);
                                            }}
                                            className="text-green-600 hover:text-green-700"
                                            data-testid={`button-approve-${request.id}`}
                                          >
                                            <Check className="w-4 h-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedRequest(request);
                                              handleShowDetails(request);
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                            data-testid={`button-reject-${request.id}`}
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700"
                                            data-testid={`button-transfer-${request.id}`}
                                          >
                                            <Share className="w-4 h-4" />
                                          </Button>
                                        </>
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
                    {filteredRequests.length > 0 && (
                      <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
                        <div>
                          1-{Math.min(parseInt(itemsPerPage), filteredRequests.length)} sur {filteredRequests.length}
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
                  La liste affiche uniquement les demandes visibles selon votre rôle et périmètre.
                </p>
              </TabsContent>

              {/* WF-3: Historique des validations */}
              <TabsContent value="history" className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Historique des validations</h1>
                </div>

                {/* Filtres */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Input type="date" placeholder="Date début" />
                      <Input type="date" placeholder="Date fin" />
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Type de demande" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="contract">Contrat</SelectItem>
                          <SelectItem value="indexation">Indexation</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Valideur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="pierre">Pierre Durand</SelectItem>
                          <SelectItem value="jean">Jean Dubois</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Résultat" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="approved">Validé</SelectItem>
                          <SelectItem value="rejected">Rejeté</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="default">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Les entrées sont horodatées et non modifiables.
                  </AlertDescription>
                </Alert>

                {/* Liste historique */}
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date/heure</TableHead>
                          <TableHead>ID demande</TableHead>
                          <TableHead>Type/Module</TableHead>
                          <TableHead>Contrat</TableHead>
                          <TableHead>Demandeur</TableHead>
                          <TableHead>Valideur</TableHead>
                          <TableHead>Décision</TableHead>
                          <TableHead>Motif (si rejet)</TableHead>
                          <TableHead>Durée de traitement</TableHead>
                          <TableHead>Trace-ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockValidationHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDate(item.date)}</TableCell>
                            <TableCell>
                              <a href="#" className="text-blue-600 hover:underline">
                                {item.requestId}
                              </a>
                            </TableCell>
                            <TableCell>{item.type}/{item.module}</TableCell>
                            <TableCell>
                              <a href="#" className="text-blue-600 hover:underline">
                                {item.contractNumber}
                              </a>
                            </TableCell>
                            <TableCell>{item.requester}</TableCell>
                            <TableCell>{item.validator}</TableCell>
                            <TableCell>
                              <Badge variant={item.decision === "approved" ? "secondary" : "destructive"}>
                                {item.decision === "approved" ? "Validé" : "Rejeté"}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.reason || "-"}</TableCell>
                            <TableCell>{item.processingTime}</TableCell>
                            <TableCell className="text-xs text-gray-500">{item.traceId}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <p className="text-xs text-gray-500 mt-4">
                  Visibilité filtrée par rôle/périmètre.
                </p>
              </TabsContent>

              {/* WF-4: Paramétrage du workflow */}
              <TabsContent value="settings" className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Paramétrage Workflow</h1>
                </div>

                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Accès Admin uniquement. Toute modification de règles est tracée.
                  </AlertDescription>
                </Alert>

                {/* Routage par type d'événement */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Routage par type d'événement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type de demande</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="creation">Création</SelectItem>
                            <SelectItem value="amendment">Avenant</SelectItem>
                            <SelectItem value="indexation">Indexation</SelectItem>
                            <SelectItem value="termination">Résiliation</SelectItem>
                            <SelectItem value="manual">Montant manuel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>BU/Entité</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="it">IT Services</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Seuil montant</Label>
                        <Input type="number" placeholder="Ex: 10000" />
                      </div>
                      <div>
                        <Label>Valideur assigné</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="senior">Valideur Senior</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="director">Directeur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button>Ajouter une règle</Button>
                  </CardContent>
                </Card>

                {/* SLA & relances */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>SLA & relances</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Délai cible (heures)</Label>
                        <Input type="number" defaultValue="24" />
                      </div>
                      <div>
                        <Label>Fréquence de relance</Label>
                        <Select defaultValue="24h">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="12h">Toutes les 12h</SelectItem>
                            <SelectItem value="24h">Toutes les 24h</SelectItem>
                            <SelectItem value="48h">Toutes les 48h</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="auto-reminder" defaultChecked />
                      <Label htmlFor="auto-reminder">
                        Activer les relances automatiques &gt; 24h
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Canaux actifs</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="in-app" defaultChecked />
                          <Label htmlFor="in-app">In-app</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="email" defaultChecked />
                          <Label htmlFor="email">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="teams" defaultChecked />
                          <Label htmlFor="teams">Teams</Label>
                        </div>
                      </div>
                    </div>
                    <Button>Enregistrer le paramétrage</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* WF-2: Panneau latéral - Détail d'une demande */}
            <Sheet open={showDetailsPanel} onOpenChange={setShowDetailsPanel}>
              <SheetContent className="w-[600px] overflow-y-auto">
                {selectedRequest && (
                  <>
                    <SheetHeader>
                      <SheetTitle>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>{getTypeLabel(selectedRequest.type)}</span>
                            <Badge variant={getStatusVariant(selectedRequest.status) as any}>
                              {selectedRequest.status === "pending" ? "En attente" : 
                               selectedRequest.status === "approved" ? "Validé" : "Rejeté"}
                            </Badge>
                          </div>
                          <div className="text-sm font-normal">
                            <a href="#" className="text-blue-600 hover:underline">
                              {selectedRequest.reference} - {selectedRequest.subject}
                            </a>
                          </div>
                          <div className="text-sm font-normal text-gray-600">
                            SLA restant: {getSLARemaining(selectedRequest.createdAt, selectedRequest.age).text}
                          </div>
                        </div>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                      {/* Résumé de la modification */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Résumé de la modification</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Avant</p>
                              <div className="bg-white p-2 rounded border">
                                <p className="text-sm">Montant: 50 000 €</p>
                                <p className="text-sm">Durée: 12 mois</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Après</p>
                              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                <p className="text-sm font-medium text-blue-900">Montant: 65 000 €</p>
                                <p className="text-sm font-medium text-blue-900">Durée: 24 mois</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-sm text-gray-600">Justification fournie:</p>
                            <p className="text-sm mt-1">Extension du périmètre suite à l'ajout de nouveaux services.</p>
                          </div>
                        </div>
                      </div>

                      {/* Pièces jointes */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Pièces jointes</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">Avenant_contrat.pdf</span>
                            </div>
                            <span className="text-xs text-gray-500">15/01/2024</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">Justificatifs.xlsx</span>
                            </div>
                            <span className="text-xs text-gray-500">15/01/2024</span>
                          </div>
                        </div>
                      </div>

                      {/* Traçabilité de la demande */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Traçabilité de la demande</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Créée:</span>
                            <span>{formatDate(selectedRequest.createdAt)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Affectée:</span>
                            <span>{formatDate(new Date())}</span>
                          </div>
                          {selectedRequest.age > 1 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Relance &gt; 24h:</span>
                              <span className="text-orange-600">{formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000))}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trace-ID:</span>
                            <span className="font-mono text-xs">TRC-2024-{Math.floor(Math.random() * 10000)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Règles & contrôles */}
                      {selectedRequest.type === "contract" && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Contrats:</strong> Rappel de la séparation des rôles (créateur ≠ valideur).
                            <br />
                            <strong>Toutes demandes:</strong> Motif obligatoire en cas de rejet.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Zone de décision */}
                      {selectedRequest.status === "pending" && (
                        <div className="space-y-4 border-t pt-4">
                          <h3 className="font-medium text-gray-900">Décision</h3>
                          
                          <RadioGroup value={decision} onValueChange={(value: any) => setDecision(value)}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="approve" id="approve" />
                              <Label htmlFor="approve" className="text-green-600">Approuver</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="reject" id="reject" />
                              <Label htmlFor="reject" className="text-red-600">Rejeter</Label>
                            </div>
                          </RadioGroup>

                          {decision === "reject" && (
                            <div>
                              <Label>Motif (obligatoire)</Label>
                              <Textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Indiquer le motif du rejet..."
                                className="mt-1"
                              />
                            </div>
                          )}

                          <div>
                            <Label>Transférer à (optionnel)</Label>
                            <Select value={transferTo} onValueChange={setTransferTo}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Sélectionner une personne" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pierre">Pierre Durand</SelectItem>
                                <SelectItem value="marie">Marie Martin</SelectItem>
                                <SelectItem value="jean">Jean Dubois</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Commentaire interne (optionnel)</Label>
                            <Textarea
                              value={internalComment}
                              onChange={(e) => setInternalComment(e.target.value)}
                              placeholder="Commentaire interne..."
                              className="mt-1"
                            />
                          </div>

                          <div className="flex space-x-2">
                            <Button
                              onClick={handleDecision}
                              disabled={
                                (!decision && !transferTo) || 
                                (decision === "reject" && !rejectReason)
                              }
                              variant={decision === "approve" ? "default" : decision === "reject" ? "destructive" : "outline"}
                            >
                              {decision === "approve" ? "Approuver" : 
                               decision === "reject" ? "Rejeter" :
                               transferTo ? "Transférer" : "Valider"}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => setShowDetailsPanel(false)}
                            >
                              Fermer
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Liens rapides */}
                      <div className="space-y-2 pt-4 border-t">
                        <Button variant="outline" className="w-full">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Ouvrir la fiche contrat
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </main>
      </div>
    </div>
  );
}
