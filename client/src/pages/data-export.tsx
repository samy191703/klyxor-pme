import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/common/status-badge";
import { 
  Download, Plus, Eye, Filter, Search, Settings, Clock,
  AlertCircle, Info, CheckCircle, AlertTriangle, FileText,
  Database, Shield, Copy, RefreshCw, X, ChevronRight,
  Calendar, Building, DollarSign, FileSpreadsheet, FilePlus,
  Loader2, CheckSquare, Square, File, History, Lock,
  User, Archive, HardDrive, Activity, Globe
} from "lucide-react";

// Type definitions
interface ExportJob {
  id: string;
  name: string;
  domain: string;
  format: 'xlsx' | 'csv';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
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

interface FilterRule {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'between' | 'greater_than' | 'less_than';
  value: string | string[];
  logicalOperator?: 'AND' | 'OR';
}

interface DataColumn {
  id: string;
  name: string;
  field: string;
  included: boolean;
  required?: boolean;
}

export default function DataExport() {
  const [currentStep, setCurrentStep] = useState<'selection' | 'refinement' | 'preview' | 'generation' | 'history'>('selection');
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<FilterRule[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<DataColumn[]>([]);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ExportJob | null>(null);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'history' | 'settings'>('export');

  // Mock data domains
  const dataDomains = [
    { id: 'contracts', name: 'Contrats', icon: FileText, count: 1250 },
    { id: 'amounts', name: 'Montants', icon: DollarSign, count: 3456 },
    { id: 'lifecycle', name: 'États / cycle de vie', icon: Activity, count: 890 },
    { id: 'indexations', name: 'Indexations', icon: Database, count: 567 },
    { id: 'payments', name: 'Paiements', icon: Globe, count: 2341 },
    { id: 'other', name: 'Autres', icon: Archive, count: 123 }
  ];

  // Mock columns based on domain
  const domainColumns: Record<string, DataColumn[]> = {
    contracts: [
      { id: '1', name: 'Numéro de contrat', field: 'contractNumber', included: true, required: true },
      { id: '2', name: 'Intitulé', field: 'title', included: true },
      { id: '3', name: 'Date de début', field: 'startDate', included: true },
      { id: '4', name: 'Date de fin', field: 'endDate', included: true },
      { id: '5', name: 'Montant', field: 'amount', included: true },
      { id: '6', name: 'Statut', field: 'status', included: true },
      { id: '7', name: 'Fournisseur', field: 'supplier', included: false },
      { id: '8', name: 'BU/Entité', field: 'businessUnit', included: false },
      { id: '9', name: 'Valideur', field: 'validator', included: false },
      { id: '10', name: 'Date de création', field: 'createdAt', included: false }
    ]
  };

  // Mock export history
  const exportHistory: ExportJob[] = [
    {
      id: 'EXP-2024-001',
      name: 'Export_Contrats_Q1_2024',
      domain: 'contracts',
      format: 'xlsx',
      status: 'completed',
      progress: 100,
      requestedAt: new Date('2024-02-01T10:00:00'),
      completedAt: new Date('2024-02-01T10:02:00'),
      requestedBy: 'Marie Dupont',
      filters: 'Période: Q1 2024, Statut: Actif',
      columns: ['contractNumber', 'title', 'amount', 'status'],
      rowCount: 450,
      fileSize: '2.3 MB',
      traceId: 'TRC-EXP-2024-001'
    },
    {
      id: 'EXP-2024-002',
      name: 'Export_Indexations_Janvier',
      domain: 'indexations',
      format: 'csv',
      status: 'completed',
      progress: 100,
      requestedAt: new Date('2024-01-15T14:30:00'),
      completedAt: new Date('2024-01-15T14:31:00'),
      requestedBy: 'Pierre Durand',
      filters: 'Période: Janvier 2024',
      columns: ['indexId', 'contractNumber', 'oldValue', 'newValue'],
      rowCount: 89,
      fileSize: '156 KB',
      traceId: 'TRC-EXP-2024-002'
    },
    {
      id: 'EXP-2024-003',
      name: 'Export_Paiements_2024',
      domain: 'payments',
      format: 'xlsx',
      status: 'failed',
      progress: 45,
      requestedAt: new Date('2024-02-10T09:00:00'),
      requestedBy: 'Sophie Bernard',
      filters: 'Année: 2024',
      columns: ['paymentId', 'amount', 'date', 'status'],
      errorMessage: 'Timeout base de données',
      traceId: 'TRC-EXP-2024-003'
    }
  ];

  // Mock preview data
  const generatePreviewData = () => {
    return [
      { contractNumber: 'CNT-2024-001', title: 'Maintenance informatique', amount: '250 000 €', status: 'Actif' },
      { contractNumber: 'CNT-2024-002', title: 'Location bureaux', amount: '180 000 €', status: 'Actif' },
      { contractNumber: 'CNT-2024-003', title: 'Services de nettoyage', amount: '45 000 €', status: 'Actif' },
      { contractNumber: 'CNT-2024-004', title: 'Fournitures de bureau', amount: '25 000 €', status: 'Résilié' },
      { contractNumber: 'CNT-2024-005', title: 'Transport logistique', amount: '120 000 €', status: 'En cours' }
    ];
  };

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    setSelectedColumns(domainColumns[domain] || []);
  };

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, included: !col.included } : col
      )
    );
  };

  const handleAddFilter = () => {
    setAdvancedFilters(prev => [...prev, {
      id: `filter-${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      logicalOperator: prev.length > 0 ? 'AND' : undefined
    }]);
  };

  const handleRemoveFilter = (filterId: string) => {
    setAdvancedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const handleStartExport = () => {
    const newJob: ExportJob = {
      id: `EXP-2024-${Date.now()}`,
      name: `Export_${selectedDomain}_${new Date().toISOString().split('T')[0]}`,
      domain: selectedDomain,
      format: selectedFormat,
      status: 'in_progress',
      progress: 0,
      requestedAt: new Date(),
      requestedBy: 'Utilisateur actuel',
      filters: `Période: ${dateRange.from} - ${dateRange.to}`,
      columns: selectedColumns.filter(c => c.included).map(c => c.field),
      traceId: `TRC-EXP-${Date.now()}`
    };
    setCurrentJob(newJob);
    setCurrentStep('generation');
    
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(interval);
        setCurrentJob(prev => prev ? {
          ...prev,
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          rowCount: 450,
          fileSize: '2.3 MB'
        } : null);
      } else {
        setCurrentJob(prev => prev ? { ...prev, progress } : null);
      }
    }, 500);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "in_progress": return "warning";
      case "pending": return "secondary";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Terminé";
      case "in_progress": return "En cours";
      case "pending": return "En attente";
      case "failed": return "Échec";
      default: return status;
    }
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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6" data-testid="data-export-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Extraction des données</h1>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'export' | 'history' | 'settings')}>
              <TabsList className="mb-6">
                <TabsTrigger value="export">Nouvelle extraction</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
                <TabsTrigger value="settings">Paramétrage</TabsTrigger>
              </TabsList>

              <TabsContent value="export">
                {/* Information Alert */}
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Seules les données accessibles selon vos droits seront extraites.
                  </AlertDescription>
                </Alert>

                {/* EX-1 - Selection Step */}
                {currentStep === 'selection' && (
                  <div className="space-y-6">
                    {/* Domain Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Domaine de données</CardTitle>
                        <CardDescription>Sélectionnez le type de données à extraire</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {dataDomains.map((domain) => {
                            const Icon = domain.icon;
                            return (
                              <button
                                key={domain.id}
                                onClick={() => handleDomainSelect(domain.id)}
                                className={`p-4 border rounded-lg hover:shadow-md transition-all ${
                                  selectedDomain === domain.id 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-gray-200'
                                }`}
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

                    {/* Period Selection */}
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
                              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="date-to">Au</Label>
                            <Input 
                              id="date-to"
                              type="date"
                              value={dateRange.to}
                              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Filters */}
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
                              {['Achat', 'Vente', 'Service', 'Location'].map((type) => (
                                <Button
                                  key={type}
                                  variant={selectedFilters.includes(type) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFilters(prev => 
                                      prev.includes(type) 
                                        ? prev.filter(f => f !== type)
                                        : [...prev, type]
                                    );
                                  }}
                                >
                                  {type}
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <Label>Statut</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {['Brouillon', 'À valider', 'Actif', 'Résilié', 'Clôturé'].map((status) => (
                                <Button
                                  key={status}
                                  variant={selectedFilters.includes(status) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFilters(prev => 
                                      prev.includes(status) 
                                        ? prev.filter(f => f !== status)
                                        : [...prev, status]
                                    );
                                  }}
                                >
                                  {status}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Output Format */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Format de sortie</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as 'xlsx' | 'csv')}>
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

                    {/* Compliance & Security */}
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

                    {/* Actions */}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => {
                        setSelectedDomain("");
                        setSelectedFilters([]);
                        setDateRange({ from: "", to: "" });
                      }}>
                        Réinitialiser
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep('refinement')}
                        disabled={!selectedDomain}
                      >
                        Continuer
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* EX-2 - Refinement Step */}
                {currentStep === 'refinement' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Affiner l'extraction</h2>

                    {/* Advanced Filters Builder */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Constructeur de filtres avancés</CardTitle>
                        <CardDescription>Ajoutez des conditions pour filtrer les données</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {advancedFilters.map((filter, index) => (
                            <div key={filter.id}>
                              {index > 0 && (
                                <Select 
                                  value={filter.logicalOperator}
                                  onValueChange={(v) => {
                                    setAdvancedFilters(prev => 
                                      prev.map(f => f.id === filter.id ? { ...f, logicalOperator: v as 'AND' | 'OR' } : f)
                                    );
                                  }}
                                >
                                  <SelectTrigger className="w-24 mb-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AND">ET</SelectItem>
                                    <SelectItem value="OR">OU</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              <div className="flex gap-2">
                                <Select>
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Champ" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="contractNumber">Numéro de contrat</SelectItem>
                                    <SelectItem value="amount">Montant</SelectItem>
                                    <SelectItem value="status">Statut</SelectItem>
                                    <SelectItem value="supplier">Fournisseur</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select>
                                  <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Opérateur" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="equals">=</SelectItem>
                                    <SelectItem value="contains">Contient</SelectItem>
                                    <SelectItem value="between">Entre</SelectItem>
                                    <SelectItem value="greater_than">&gt;</SelectItem>
                                    <SelectItem value="less_than">&lt;</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input className="flex-1" placeholder="Valeur" />
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRemoveFilter(filter.id)}
                                >
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

                    {/* Column Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Colonnes à inclure</CardTitle>
                        <CardDescription>
                          Sélectionnez les champs à exporter (pré-cochées par défaut)
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
                              <Label 
                                htmlFor={column.id} 
                                className={`flex-1 ${column.required ? 'font-medium' : ''}`}
                              >
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

                    {/* Format Reminder */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Format sélectionné :</span>
                      <Badge variant="outline">
                        {selectedFormat === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep('selection')}>
                        Retour
                      </Button>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setPreviewData(generatePreviewData());
                            setCurrentStep('preview');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Aperçu (50 premières lignes)
                        </Button>
                        <Button onClick={handleStartExport}>
                          Lancer l'export
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* EX-3 - Preview Step */}
                {currentStep === 'preview' && (
                  <div className="space-y-6">
                    {/* Preview Header */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">Aperçu</Badge>
                            <span className="text-sm text-gray-600">
                              Filtres actifs : {advancedFilters.length || 'Aucun'}
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            ~{previewData.length * 90} lignes estimées
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Preview Table */}
                    {previewData.length > 0 ? (
                      <Card>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {selectedColumns
                                    .filter(col => col.included)
                                    .map(col => (
                                      <TableHead key={col.id}>{col.name}</TableHead>
                                    ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewData.slice(0, 5).map((row, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{row.contractNumber}</TableCell>
                                    <TableCell>{row.title}</TableCell>
                                    <TableCell>{row.amount}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{row.status}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
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
                            Aucun enregistrement ne correspond à vos filtres.
                            Un fichier vide (entêtes uniquement) sera tout de même généré si vous exportez.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep('refinement')}>
                        Modifier les filtres
                      </Button>
                      <Button onClick={handleStartExport}>
                        Lancer l'export
                      </Button>
                    </div>
                  </div>
                )}

                {/* EX-4 - Generation Step */}
                {currentStep === 'generation' && currentJob && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Génération de votre export...</h2>

                    {/* Job Card */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{currentJob.name}</CardTitle>
                          <Badge variant={getStatusVariant(currentJob.status)}>
                            {getStatusLabel(currentJob.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Format :</span>
                              <span className="ml-2 font-medium">
                                {currentJob.format === 'xlsx' ? 'Excel' : 'CSV'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Horodatage :</span>
                              <span className="ml-2 font-medium">
                                {formatDateTime(currentJob.requestedAt)}
                              </span>
                            </div>
                          </div>

                          {currentJob.status === 'in_progress' && (
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

                          {currentJob.status === 'completed' && (
                            <Alert className="border-green-200 bg-green-50">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertDescription>
                                Export terminé avec succès !
                                {currentJob.rowCount && ` ${currentJob.rowCount} lignes exportées.`}
                                {currentJob.fileSize && ` Taille : ${currentJob.fileSize}`}
                              </AlertDescription>
                            </Alert>
                          )}

                          {currentJob.status === 'failed' && (
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

                    {/* Export Content Summary */}
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
                            <span className="ml-2">{dateRange.from} - {dateRange.to}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Filtres :</span>
                            <span className="ml-2">{currentJob.filters}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Nombre de colonnes :</span>
                            <span className="ml-2">{currentJob.columns.length}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-between">
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab('history')}
                      >
                        Voir l'historique
                      </Button>
                      <div className="flex gap-2">
                        {currentJob.status === 'failed' && (
                          <Button variant="outline" onClick={handleStartExport}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Relancer
                          </Button>
                        )}
                        {currentJob.status === 'completed' && (
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

              <TabsContent value="history">
                {/* EX-5 - Export History */}
                <div className="space-y-6">
                  {/* Filters */}
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
                          </SelectContent>
                        </Select>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input placeholder="Rechercher par nom..." className="pl-10" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* History Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Historique des exports</CardTitle>
                      <CardDescription>
                        Vous pouvez re-télécharger les fichiers déjà générés
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date/heure</TableHead>
                              <TableHead>Domaine</TableHead>
                              <TableHead>Filtres</TableHead>
                              <TableHead>Format</TableHead>
                              <TableHead>Taille</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Demandeur</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {exportHistory.map((job) => (
                              <TableRow key={job.id}>
                                <TableCell>{formatDateTime(job.requestedAt)}</TableCell>
                                <TableCell>{job.domain}</TableCell>
                                <TableCell className="max-w-xs truncate">{job.filters}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {job.format === 'xlsx' ? 'Excel' : 'CSV'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{job.fileSize || '-'}</TableCell>
                                <TableCell>
                                  <StatusBadge
                                    variant={getStatusVariant(job.status)}
                                    text={getStatusLabel(job.status)}
                                  />
                                </TableCell>
                                <TableCell>{job.requestedBy}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {job.status === 'completed' && (
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
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                          <Lock className="w-4 h-4" />
                          L'accès aux exports et leur contenu restent soumis à vos droits ; 
                          toutes les actions sont journalisées.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                {/* EX-8 - Settings */}
                <div className="space-y-6">
                  <Alert className="border-amber-200 bg-amber-50">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <strong>Section lecture seule</strong> - Configuration réservée aux administrateurs
                    </AlertDescription>
                  </Alert>

                  {/* Extraction Rules */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Règles d'extraction</CardTitle>
                      <CardDescription>Lecture pour tous, édition Admin uniquement</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            Extraction limitée aux données visibles par l'utilisateur selon ses droits RBAC
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            Formats disponibles : Excel (.xlsx) et CSV (.csv)
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            Limite maximale : 100 000 lignes par export
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            Rétention des exports : 30 jours
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Governance & Compliance */}
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
                            Les utilisateurs ne peuvent extraire que les données auxquelles ils ont accès 
                            selon leur profil et leurs permissions.
                          </p>
                        </div>
                        
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Audit des actions d'export
                          </h4>
                          <p className="text-sm text-gray-600">
                            Toutes les actions d'export sont horodatées et tracées : auteur, date/heure, 
                            résultat, paramètres utilisés. Rétention conforme aux exigences légales.
                          </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Conformité RGPD
                          </h4>
                          <p className="text-sm text-gray-600">
                            Les exports respectent les principes du RGPD : minimisation des données, 
                            limitation de la finalité, et droit à l'effacement sur demande.
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
                </div>
              </TabsContent>
            </Tabs>

            {/* EX-7 - Error States */}
            {showEmptyState && (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun export</h3>
                  <p className="text-gray-500">Aucun export pour la période sélectionnée.</p>
                </CardContent>
              </Card>
            )}

            {showError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {showError}
                  {showError.includes("technique") && (
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowError(null)}
                      >
                        Réessayer
                      </Button>
                      <Button 
                        variant="link" 
                        size="sm"
                        className="ml-2"
                      >
                        Contacter l'admin
                      </Button>
                    </div>
                  )}
                  {showError.includes("Accès") && (
                    <div className="mt-1 text-sm">
                      Certaines colonnes/lignes sont masquées selon vos droits.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </main>
      </div>

      {/* EX-6 - Export Detail Panel */}
      <Sheet open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <SheetContent className="w-[600px] overflow-y-auto">
          {selectedExport && (
            <>
              <SheetHeader>
                <SheetTitle>
                  <div className="flex items-center justify-between">
                    <span>{selectedExport.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(selectedExport.status)}>
                        {getStatusLabel(selectedExport.status)}
                      </Badge>
                      <Badge variant="outline">
                        {selectedExport.format === 'xlsx' ? 'Excel' : 'CSV'}
                      </Badge>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Applied Parameters */}
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
                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                          {selectedExport.filters}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Colonnes sélectionnées :</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedExport.columns.map(col => (
                            <Badge key={col} variant="secondary" className="text-xs">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Traceability */}
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
                        <span className="font-medium">
                          {selectedExport.status === 'completed' ? 'Succès' : 'Échec'}
                        </span>
                      </div>
                      {selectedExport.errorMessage && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {selectedExport.errorMessage}
                          </AlertDescription>
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

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedExport.status === 'completed' && (
                    <Button className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      // Copy parameters to new export
                      setCurrentStep('refinement');
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
    </div>
  );
}