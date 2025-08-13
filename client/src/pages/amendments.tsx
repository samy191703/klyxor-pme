import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StatusBadge from "@/components/common/status-badge";
import { 
  Edit, Plus, Eye, Check, X, Calendar, FileText, 
  Upload, AlertCircle, Clock, Search, Filter, 
  Download, ChevronRight, ChevronLeft, History,
  FileUp, Trash2, User, Building, Tag, Hash,
  XCircle, CheckCircle, AlertTriangle, Info,
  ArrowRight
} from "lucide-react";

// Type definitions
interface Amendment {
  id: string;
  contractId: string;
  contractNumber: string;
  contractTitle: string;
  modificationType: 'duration' | 'amount' | 'clause';
  affectedFields: string;
  beforeValue: string;
  afterValue: string;
  effectiveDate: Date;
  status: 'draft' | 'to_validate' | 'validated' | 'rejected' | 'cancelled';
  assignedValidator: string | null;
  lastUpdate: Date;
  reason: string;
  requestedBy: string;
  validatedBy?: string | null;
  validatedAt?: Date | null;
  rejectionReason?: string | null;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    uploadedBy: string;
    uploadedAt: Date;
    size: number;
  }>;
  history?: Array<{
    id: string;
    action: string;
    date: Date;
    user: string;
    details?: string;
    traceId: string;
  }>;
}

export default function Amendments() {
  const [activeView, setActiveView] = useState<'list' | 'history'>('list');
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAmendment, setSelectedAmendment] = useState<Amendment | null>(null);
  const [showNewAmendmentDialog, setShowNewAmendmentDialog] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationDecision, setValidationDecision] = useState<'validate' | 'reject'>('validate');
  const [rejectionReason, setRejectionReason] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  // New amendment form data
  const [newAmendment, setNewAmendment] = useState({
    contractId: "",
    contractNumber: "",
    contractTitle: "",
    modificationType: "" as 'duration' | 'amount' | 'clause',
    affectedFields: [] as string[],
    beforeValues: {} as Record<string, string>,
    afterValues: {} as Record<string, string>,
    reason: "",
    effectiveDate: "",
    coveragePeriod: "",
    attachments: [] as File[]
  });

  // Mock data with complete specification compliance
  const amendments: Amendment[] = [
    {
      id: "AV-2024-001",
      contractId: "cnt-1",
      contractNumber: "CNT-2024-001",
      contractTitle: "Maintenance informatique",
      modificationType: 'amount',
      affectedFields: "Montant, Révision tarifaire",
      beforeValue: "250 000 €/an",
      afterValue: "275 000 €/an",
      effectiveDate: new Date("2024-04-01"),
      status: 'to_validate',
      assignedValidator: "Jean Martin",
      lastUpdate: new Date("2024-02-01"),
      reason: "Ajustement inflation et extension périmètre",
      requestedBy: "Marie Dupont",
      attachments: [
        {
          id: "att-1",
          name: "Avenant_signé_CNT-2024-001.pdf",
          type: "PDF",
          uploadedBy: "Marie Dupont",
          uploadedAt: new Date("2024-02-01"),
          size: 245678
        }
      ],
      history: [
        {
          id: "h-1",
          action: "Création",
          date: new Date("2024-02-01T10:00:00"),
          user: "Marie Dupont",
          details: "Avenant créé en brouillon",
          traceId: "TRC-2024-001-001"
        },
        {
          id: "h-2",
          action: "Soumission",
          date: new Date("2024-02-01T14:30:00"),
          user: "Marie Dupont",
          details: "Soumis à validation",
          traceId: "TRC-2024-001-002"
        }
      ]
    },
    {
      id: "AV-2024-002",
      contractId: "cnt-2",
      contractNumber: "CNT-2023-045",
      contractTitle: "Location bureaux",
      modificationType: 'duration',
      affectedFields: "Date de fin",
      beforeValue: "31/12/2024",
      afterValue: "31/12/2025",
      effectiveDate: new Date("2024-01-01"),
      status: 'validated',
      assignedValidator: "Sophie Bernard",
      lastUpdate: new Date("2024-01-15"),
      reason: "Prolongation bail locatif",
      requestedBy: "Pierre Durand",
      validatedBy: "Sophie Bernard",
      validatedAt: new Date("2024-01-16"),
      attachments: [
        {
          id: "att-2",
          name: "Avenant_bail_2024.pdf",
          type: "PDF",
          uploadedBy: "Pierre Durand",
          uploadedAt: new Date("2024-01-15"),
          size: 198234
        }
      ]
    },
    {
      id: "AV-2024-003",
      contractId: "cnt-3",
      contractNumber: "CNT-2024-008",
      contractTitle: "Services de nettoyage",
      modificationType: 'clause',
      affectedFields: "Clause 5.2, Annexe B",
      beforeValue: "Intervention hebdomadaire",
      afterValue: "Intervention bi-hebdomadaire",
      effectiveDate: new Date("2024-03-01"),
      status: 'draft',
      assignedValidator: null,
      lastUpdate: new Date("2024-02-10"),
      reason: "Adaptation fréquence d'intervention",
      requestedBy: "Marie Dupont"
    },
    {
      id: "AV-2024-004",
      contractId: "cnt-4",
      contractNumber: "CNT-2023-089",
      contractTitle: "Fournitures de bureau",
      modificationType: 'amount',
      affectedFields: "Montant",
      beforeValue: "50 000 €",
      afterValue: "45 000 €",
      effectiveDate: new Date("2024-02-01"),
      status: 'rejected',
      assignedValidator: "Jean Martin",
      lastUpdate: new Date("2024-02-05"),
      reason: "Réduction volume commandes",
      requestedBy: "Sophie Bernard",
      validatedBy: "Jean Martin",
      validatedAt: new Date("2024-02-05"),
      rejectionReason: "Documentation insuffisante - justificatifs manquants"
    },
    {
      id: "AV-2024-005",
      contractId: "cnt-5",
      contractNumber: "CNT-2023-102",
      contractTitle: "Transport logistique",
      modificationType: 'clause',
      affectedFields: "Conditions de livraison",
      beforeValue: "J+3",
      afterValue: "J+1",
      effectiveDate: new Date("2024-01-20"),
      status: 'cancelled',
      assignedValidator: null,
      lastUpdate: new Date("2024-01-18"),
      reason: "Amélioration délais livraison",
      requestedBy: "Pierre Durand"
    }
  ];

  // KPI calculations
  const kpiData = {
    drafts: amendments.filter(a => a.status === 'draft').length,
    toValidate: amendments.filter(a => a.status === 'to_validate').length,
    validated30Days: amendments.filter(a => 
      a.status === 'validated' && 
      a.validatedAt && 
      (new Date().getTime() - a.validatedAt.getTime()) / (1000 * 60 * 60 * 24) <= 30
    ).length,
    rejected: amendments.filter(a => a.status === 'rejected').length,
    cancelled: amendments.filter(a => a.status === 'cancelled').length
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "validated": return "success";
      case "to_validate": return "warning";
      case "draft": return "secondary";
      case "rejected": return "destructive";
      case "cancelled": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "validated": return "Validé";
      case "to_validate": return "À valider";
      case "draft": return "Brouillon";
      case "rejected": return "Rejeté";
      case "cancelled": return "Annulé";
      default: return status;
    }
  };

  const getModificationTypeLabel = (type: string) => {
    switch (type) {
      case "duration": return "Durée";
      case "amount": return "Montant";
      case "clause": return "Clause";
      default: return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR').format(date);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Filter amendments based on current filters
  const filteredAmendments = amendments.filter(amendment => {
    if (statusFilter !== 'all' && amendment.status !== statusFilter) return false;
    if (typeFilter !== 'all' && amendment.modificationType !== typeFilter) return false;
    if (searchQuery && !amendment.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !amendment.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !amendment.contractTitle.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    setNewAmendment(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setNewAmendment(prev => ({ 
      ...prev, 
      attachments: prev.attachments.filter((_, i) => i !== index) 
    }));
  };

  const handleValidation = () => {
    if (validationDecision === 'reject' && !rejectionReason) {
      setShowError("Le motif est obligatoire pour un rejet");
      return;
    }
    // Process validation
    setShowValidationModal(false);
    setValidationDecision('validate');
    setRejectionReason("");
  };

  const resetNewAmendmentForm = () => {
    setNewAmendment({
      contractId: "",
      contractNumber: "",
      contractTitle: "",
      modificationType: "" as 'duration' | 'amount' | 'clause',
      affectedFields: [],
      beforeValues: {},
      afterValues: {},
      reason: "",
      effectiveDate: "",
      coveragePeriod: "",
      attachments: []
    });
    setUploadedFiles([]);
    setCurrentStep(1);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNav />
            <h1 className="text-lg font-semibold">Avenants</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="amendments-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header - AV-1 */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Avenants</h1>
            </div>

            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'list' | 'history')}>
              <TabsList className="mb-6">
                <TabsTrigger value="list">Liste globale</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                {/* KPI Tiles - AV-1 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-6 h-6 text-gray-400" />
                        <span className="text-2xl font-bold text-gray-900">{kpiData.drafts}</span>
                      </div>
                      <p className="text-sm text-gray-600">Brouillons</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="w-6 h-6 text-warning" />
                        <span className="text-2xl font-bold text-gray-900">{kpiData.toValidate}</span>
                      </div>
                      <p className="text-sm text-gray-600">À valider</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="text-2xl font-bold text-gray-900">{kpiData.validated30Days}</span>
                      </div>
                      <p className="text-sm text-gray-600">Validés (30 j)</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <XCircle className="w-6 h-6 text-destructive" />
                        <span className="text-2xl font-bold text-gray-900">{kpiData.rejected}</span>
                      </div>
                      <p className="text-sm text-gray-600">Rejetés</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <X className="w-6 h-6 text-gray-400" />
                        <span className="text-2xl font-bold text-gray-900">{kpiData.cancelled}</span>
                      </div>
                      <p className="text-sm text-gray-600">Annulés</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Reminder Alert */}
                <Alert className="mb-6 border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-gray-700">
                    <strong>Rappel de règle :</strong> Aucun avenant n'est actif sans validation ; un avenant peut être annulé avant validation.
                    Les échéances d'avenant alimentent aussi le module Échéances (fin d'avenant).
                  </AlertDescription>
                </Alert>

                {/* Filters Bar - AV-1 */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label htmlFor="period-filter" className="text-sm font-medium mb-1">Période</Label>
                        <Select value={periodFilter} onValueChange={setPeriodFilter}>
                          <SelectTrigger id="period-filter">
                            <SelectValue placeholder="Sélectionner une période" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les périodes</SelectItem>
                            <SelectItem value="creation">Date de création</SelectItem>
                            <SelectItem value="effective">Date d'effet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="status-filter" className="text-sm font-medium mb-1">Statut</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger id="status-filter">
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="draft">Brouillon</SelectItem>
                            <SelectItem value="to_validate">À valider</SelectItem>
                            <SelectItem value="validated">Validé</SelectItem>
                            <SelectItem value="rejected">Rejeté</SelectItem>
                            <SelectItem value="cancelled">Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="type-filter" className="text-sm font-medium mb-1">Type de modification</Label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger id="type-filter">
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les types</SelectItem>
                            <SelectItem value="duration">Durée</SelectItem>
                            <SelectItem value="amount">Montant</SelectItem>
                            <SelectItem value="clause">Clause</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="search" className="text-sm font-medium mb-1">Recherche</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            id="search"
                            type="text"
                            placeholder="ID avenant, N° contrat, mot-clé..."
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
                      <Button 
                        onClick={() => setShowNewAmendmentDialog(true)}
                        data-testid="button-create-amendment"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer un avenant
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Amendments List Table - AV-1 */}
                {filteredAmendments.length === 0 && showEmptyState ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun avenant</h3>
                      <p className="text-gray-500">Aucun avenant ne correspond à vos filtres.</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => {
                          setStatusFilter('all');
                          setTypeFilter('all');
                          setSearchQuery('');
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
                              <TableHead>ID avenant</TableHead>
                              <TableHead>Contrat</TableHead>
                              <TableHead>Champs concernés</TableHead>
                              <TableHead>Avant / Après</TableHead>
                              <TableHead>Date d'effet</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Valideur assigné</TableHead>
                              <TableHead>Dernière MàJ</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAmendments.map((amendment) => (
                              <TableRow key={amendment.id} data-testid={`row-amendment-${amendment.id}`}>
                                <TableCell>
                                  <button 
                                    className="text-primary hover:underline font-medium"
                                    onClick={() => {
                                      setSelectedAmendment(amendment);
                                      setShowDetailPanel(true);
                                    }}
                                  >
                                    {amendment.id}
                                  </button>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{amendment.contractNumber}</div>
                                    <div className="text-sm text-gray-500">{amendment.contractTitle}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="mr-1">
                                    {getModificationTypeLabel(amendment.modificationType)}
                                  </Badge>
                                  <span className="text-sm">{amendment.affectedFields}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="text-gray-500">{amendment.beforeValue}</div>
                                    <ArrowRight className="w-3 h-3 inline mx-1 text-gray-400" />
                                    <div className="font-medium text-green-600">{amendment.afterValue}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{formatDate(amendment.effectiveDate)}</TableCell>
                                <TableCell>
                                  <StatusBadge
                                    variant={getStatusVariant(amendment.status)}
                                    text={getStatusLabel(amendment.status)}
                                  />
                                </TableCell>
                                <TableCell>{amendment.assignedValidator || '-'}</TableCell>
                                <TableCell>{formatDate(amendment.lastUpdate)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedAmendment(amendment);
                                        setShowDetailPanel(true);
                                      }}
                                      data-testid={`button-view-amendment-${amendment.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {amendment.status === 'to_validate' && (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-green-600 hover:text-green-700"
                                          onClick={() => {
                                            setSelectedAmendment(amendment);
                                            setShowValidationModal(true);
                                            setValidationDecision('validate');
                                          }}
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() => {
                                            setSelectedAmendment(amendment);
                                            setShowValidationModal(true);
                                            setValidationDecision('reject');
                                          }}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                    {(amendment.status === 'draft' || amendment.status === 'to_validate') && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-gray-600 hover:text-gray-700"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </Button>
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
                          Affichage de {filteredAmendments.length} résultat(s)
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
                {/* AV-5 - Historique des avenants */}
                <Card>
                  <CardHeader>
                    <CardTitle>Historique des avenants</CardTitle>
                    <CardDescription>Journal complet des décisions sur les avenants (lecture seule)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Input type="date" placeholder="Période" />
                      <Input placeholder="Contrat" />
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Type de modification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="duration">Durée</SelectItem>
                          <SelectItem value="amount">Montant</SelectItem>
                          <SelectItem value="clause">Clause</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Décision" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="validated">Validé</SelectItem>
                          <SelectItem value="rejected">Rejeté</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date/heure</TableHead>
                            <TableHead>ID avenant</TableHead>
                            <TableHead>Contrat</TableHead>
                            <TableHead>Champs concernés</TableHead>
                            <TableHead>Avant / Après</TableHead>
                            <TableHead>Décision</TableHead>
                            <TableHead>Motif (si rejet)</TableHead>
                            <TableHead>Trace-ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {amendments
                            .filter(a => a.status !== 'draft')
                            .map((amendment) => (
                              <TableRow key={`history-${amendment.id}`}>
                                <TableCell>{formatDateTime(amendment.lastUpdate)}</TableCell>
                                <TableCell>
                                  <button 
                                    className="text-primary hover:underline"
                                    onClick={() => {
                                      setSelectedAmendment(amendment);
                                      setShowDetailPanel(true);
                                    }}
                                  >
                                    {amendment.id}
                                  </button>
                                </TableCell>
                                <TableCell>{amendment.contractNumber}</TableCell>
                                <TableCell>{amendment.affectedFields}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <span className="text-gray-500">{amendment.beforeValue}</span>
                                    <ArrowRight className="w-3 h-3 inline mx-1" />
                                    <span className="font-medium">{amendment.afterValue}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge
                                    variant={getStatusVariant(amendment.status)}
                                    text={getStatusLabel(amendment.status)}
                                  />
                                </TableCell>
                                <TableCell className="text-sm">
                                  {amendment.rejectionReason || '-'}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {amendment.history?.[0]?.traceId || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* AV-6 - Error banners */}
            {showError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {showError}
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => setShowError(null)}
                  >
                    Réessayer
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </main>
      </div>

      {/* AV-2 - New Amendment Dialog (Assistant pas-à-pas) */}
      <Dialog open={showNewAmendmentDialog} onOpenChange={setShowNewAmendmentDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel avenant</DialogTitle>
            <Progress value={(currentStep / 4) * 100} className="mt-2" />
            <DialogDescription>Étape {currentStep} sur 4</DialogDescription>
          </DialogHeader>

          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium">Étape 1 - Sélection du contrat</h3>
              <div>
                <Label htmlFor="contract-search">Recherche contrat</Label>
                <Input 
                  id="contract-search"
                  placeholder="N° ou intitulé du contrat"
                  value={newAmendment.contractNumber}
                  onChange={(e) => setNewAmendment({...newAmendment, contractNumber: e.target.value})}
                />
              </div>
              {newAmendment.contractNumber && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Résumé du contrat</h4>
                    <div className="text-sm space-y-1">
                      <div>Statut: <Badge variant="secondary">Actif</Badge></div>
                      <div>Dates: 01/01/2024 - 31/12/2024</div>
                      <div>Montant: 250 000 €</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium">Étape 2 - Définition de l'avenant</h3>
              <div>
                <Label>Type de modification</Label>
                <RadioGroup 
                  value={newAmendment.modificationType}
                  onValueChange={(v) => setNewAmendment({...newAmendment, modificationType: v as any})}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="duration" id="duration" />
                    <Label htmlFor="duration">Durée</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="amount" id="amount" />
                    <Label htmlFor="amount">Montant</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="clause" id="clause" />
                    <Label htmlFor="clause">Clause autre</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valeur avant</Label>
                  <Input placeholder="Valeur actuelle" />
                </div>
                <div>
                  <Label>Valeur après</Label>
                  <Input placeholder="Nouvelle valeur" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="reason">Motif de l'avenant (obligatoire)</Label>
                <Textarea 
                  id="reason"
                  placeholder="Expliquez la raison de cette modification..."
                  value={newAmendment.reason}
                  onChange={(e) => setNewAmendment({...newAmendment, reason: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium">Étape 3 - Date d'effet & périmètre</h3>
              <div>
                <Label htmlFor="effective-date">Date d'effet</Label>
                <Input 
                  id="effective-date"
                  type="date"
                  value={newAmendment.effectiveDate}
                  onChange={(e) => setNewAmendment({...newAmendment, effectiveDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="coverage-period">Période couverte (si applicable)</Label>
                <Input 
                  id="coverage-period"
                  placeholder="Ex: Du 01/04/2024 au 31/12/2024"
                  value={newAmendment.coveragePeriod}
                  onChange={(e) => setNewAmendment({...newAmendment, coveragePeriod: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium">Étape 4 - Pièces jointes (recommandé : avenant signé)</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary hover:underline">Parcourir</span>
                      <Input 
                        id="file-upload"
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.docx,.xlsx,.jpg,.png"
                        onChange={handleFileUpload}
                      />
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">ou glisser-déposer</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Formats autorisés : PDF, DOCX, XLSX, JPG, PNG
                  </p>
                </div>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Récapitulatif</h4>
                  <div className="text-sm space-y-1">
                    <div>Contrat: {newAmendment.contractNumber || 'Non sélectionné'}</div>
                    <div>Type: {getModificationTypeLabel(newAmendment.modificationType) || 'Non défini'}</div>
                    <div>Date d'effet: {newAmendment.effectiveDate || 'Non définie'}</div>
                    <div>Pièces jointes: {uploadedFiles.length} fichier(s)</div>
                  </div>
                </CardContent>
              </Card>
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
                    setShowNewAmendmentDialog(false);
                    resetNewAmendmentForm();
                  }}
                >
                  Enregistrer en brouillon
                </Button>
                {currentStep < 4 ? (
                  <Button onClick={() => setCurrentStep(currentStep + 1)}>
                    Suivant
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      // Submit for validation
                      setShowNewAmendmentDialog(false);
                      resetNewAmendmentForm();
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

      {/* AV-3 - Amendment Detail Panel */}
      <Sheet open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <SheetContent className="w-[600px] overflow-y-auto">
          {selectedAmendment && (
            <>
              <SheetHeader>
                <SheetTitle>
                  <div className="flex items-center justify-between">
                    <span>{selectedAmendment.id}</span>
                    <StatusBadge
                      variant={getStatusVariant(selectedAmendment.status)}
                      text={getStatusLabel(selectedAmendment.status)}
                    />
                  </div>
                </SheetTitle>
                <SheetDescription>
                  <div className="text-sm">
                    <div>Contrat: {selectedAmendment.contractNumber} - {selectedAmendment.contractTitle}</div>
                    <div>Date d'effet: {formatDate(selectedAmendment.effectiveDate)}</div>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Comparatif Avant/Après */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Comparatif (Avant / Après)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Champs impactés:</span> {selectedAmendment.affectedFields}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-red-50 rounded">
                          <div className="text-xs text-red-600 mb-1">Avant</div>
                          <div className="text-sm">{selectedAmendment.beforeValue}</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <div className="text-xs text-green-600 mb-1">Après</div>
                          <div className="text-sm">{selectedAmendment.afterValue}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Workflow */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Workflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Valideur assigné:</span>
                        <span className="font-medium">{selectedAmendment.assignedValidator || 'Non assigné'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Demandeur:</span>
                        <span className="font-medium">{selectedAmendment.requestedBy}</span>
                      </div>
                      {selectedAmendment.validatedBy && (
                        <div className="flex justify-between">
                          <span>Validé par:</span>
                          <span className="font-medium">{selectedAmendment.validatedBy}</span>
                        </div>
                      )}
                      {selectedAmendment.rejectionReason && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Motif de rejet: {selectedAmendment.rejectionReason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Documents */}
                {selectedAmendment.attachments && selectedAmendment.attachments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedAmendment.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium">{attachment.name}</div>
                                <div className="text-xs text-gray-500">
                                  {attachment.type} • {formatFileSize(attachment.size)} • {attachment.uploadedBy}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Historisation */}
                {selectedAmendment.history && selectedAmendment.history.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Historisation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedAmendment.history.map((event) => (
                          <div key={event.id} className="flex gap-3">
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2"></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{event.action}</div>
                              <div className="text-xs text-gray-500">
                                {formatDateTime(event.date)} • {event.user}
                              </div>
                              {event.details && (
                                <div className="text-xs text-gray-600 mt-1">{event.details}</div>
                              )}
                              <div className="text-xs font-mono text-gray-400 mt-1">Trace-ID: {event.traceId}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedAmendment.status === 'to_validate' && (
                    <>
                      <Button 
                        className="flex-1"
                        onClick={() => {
                          setShowValidationModal(true);
                          setValidationDecision('validate');
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
                          setValidationDecision('reject');
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Rejeter
                      </Button>
                    </>
                  )}
                  {(selectedAmendment.status === 'draft' || selectedAmendment.status === 'to_validate') && (
                    <Button variant="outline" className="flex-1">
                      <XCircle className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Open contract details
                    }}
                  >
                    Voir la fiche contrat
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* AV-4 - Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {validationDecision === 'validate' ? 'Valider' : 'Rejeter'} l'avenant
            </DialogTitle>
          </DialogHeader>

          {selectedAmendment && (
            <>
              <div className="space-y-4">
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Résumé</h4>
                    <div className="text-sm space-y-1">
                      <div>Contrat: {selectedAmendment.contractNumber}</div>
                      <div>Champs modifiés: {selectedAmendment.affectedFields}</div>
                      <div>Avant / Après: {selectedAmendment.beforeValue} → {selectedAmendment.afterValue}</div>
                      <div>Date d'effet: {formatDate(selectedAmendment.effectiveDate)}</div>
                      {selectedAmendment.attachments && (
                        <div>Pièces jointes: {selectedAmendment.attachments.length} document(s)</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <Label>Décision</Label>
                  <RadioGroup 
                    value={validationDecision}
                    onValueChange={(v) => setValidationDecision(v as 'validate' | 'reject')}
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

                {validationDecision === 'reject' && (
                  <div>
                    <Label htmlFor="rejection-reason">
                      Motif (obligatoire si Rejet)
                    </Label>
                    <Textarea 
                      id="rejection-reason"
                      placeholder="Expliquez la raison du rejet..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className={!rejectionReason && showError ? 'border-red-500' : ''}
                    />
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {validationDecision === 'validate' 
                      ? "Après validation, la modification impacte le contrat principal et l'événement est historisé."
                      : "Après rejet, l'avenant reste en attente et peut être resoumis après modifications."
                    }
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowValidationModal(false)}>
                  Fermer
                </Button>
                <Button 
                  variant={validationDecision === 'validate' ? 'default' : 'destructive'}
                  onClick={handleValidation}
                >
                  {validationDecision === 'validate' ? 'Valider' : 'Rejeter'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}