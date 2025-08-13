import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Calendar, Clock, Download, Eye, Bell, AlertTriangle, 
  RotateCcw, Save, Mail, MessageSquare, CheckCircle,
  AlertCircle
} from "lucide-react";
import type { Deadline } from "@shared/schema";

export default function Deadlines() {
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<any>(null);
  const [exportColumns, setExportColumns] = useState({
    contract: true,
    type: true,
    date: true,
    jMinus: true,
    businessUnit: true,
    responsible: true,
    status: true,
    alertChannel: true,
    lastSent: true
  });
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");

  const { data: deadlines = [], isLoading } = useQuery<Deadline[]>({
    queryKey: ["/api/deadlines"],
  });

  // Calcul des KPIs
  const kpis = {
    j30: deadlines.filter(d => d.daysRemaining <= 30 && d.daysRemaining > 7).length,
    j7: deadlines.filter(d => d.daysRemaining <= 7 && d.daysRemaining > 1).length,
    j1: deadlines.filter(d => d.daysRemaining <= 1 && d.daysRemaining >= 0).length,
    late: deadlines.filter(d => d.daysRemaining < 0).length,
  };

  const filteredDeadlines = deadlines.filter(deadline => {
    const matchesSearch = deadline.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPeriod = 
      periodFilter === "all" || 
      (periodFilter === "j30" && deadline.daysRemaining <= 30 && deadline.daysRemaining > 7) ||
      (periodFilter === "j7" && deadline.daysRemaining <= 7 && deadline.daysRemaining > 1) ||
      (periodFilter === "j1" && deadline.daysRemaining <= 1 && deadline.daysRemaining >= 0) ||
      (periodFilter === "late" && deadline.daysRemaining < 0);
    const matchesType = typeFilter === "all" || deadline.type === typeFilter;
    const matchesBU = businessUnitFilter === "all" || deadline.businessUnit === businessUnitFilter;
    
    return matchesSearch && matchesPeriod && matchesType && matchesBU;
  });

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date | string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getDaysVariant = (days: number) => {
    if (days < 0) return "destructive";
    if (days <= 1) return "destructive";
    if (days <= 7) return "warning";
    if (days <= 30) return "secondary";
    return "outline";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "end_contract": return "Fin de contrat";
      case "anniversary": return "Date anniversaire";
      case "amendment": return "Fin d'avenant";
      default: return type;
    }
  };

  const handleShowDetails = (deadline: any) => {
    setSelectedDeadline(deadline);
    setShowDetailsPanel(true);
  };

  const handleExport = () => {
    console.log("Export avec colonnes:", exportColumns, "Format:", exportFormat);
    setShowExportModal(false);
  };

  const resetFilters = () => {
    setPeriodFilter("all");
    setTypeFilter("all");
    setBusinessUnitFilter("all");
    setResponsibleFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNav />
            <h1 className="text-lg font-semibold">Échéances</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="deadlines-main">
          <div className="max-w-7xl mx-auto">
            {/* EC-1: Titre de page */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Échéances</h1>
            </div>

            {/* EC-1: Tuiles KPI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{kpis.j30}</div>
                  <p className="text-sm text-gray-600 font-medium">À 30 j</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{kpis.j7}</div>
                  <p className="text-sm text-gray-600 font-medium">À 7 j</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{kpis.j1}</div>
                  <p className="text-sm text-gray-600 font-medium">À 1 j</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="w-8 h-8 text-purple-500" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{kpis.late}</div>
                  <p className="text-sm text-gray-600 font-medium">En retard</p>
                </CardContent>
              </Card>
            </div>

            {/* EC-1: Barre de filtres */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {/* Période */}
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-period">
                        <SelectValue placeholder="Période" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les périodes</SelectItem>
                        <SelectItem value="j30">À 30 jours</SelectItem>
                        <SelectItem value="j7">À 7 jours</SelectItem>
                        <SelectItem value="j1">À 1 jour</SelectItem>
                        <SelectItem value="late">En retard</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Type d'échéance */}
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[200px]" data-testid="select-type">
                        <SelectValue placeholder="Type d'échéance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="end_contract">Fin de contrat</SelectItem>
                        <SelectItem value="anniversary">Date anniversaire</SelectItem>
                        <SelectItem value="amendment">Fin d'avenant</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* BU/Entité */}
                    <Select value={businessUnitFilter} onValueChange={setBusinessUnitFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-bu">
                        <SelectValue placeholder="BU / Entité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les BU</SelectItem>
                        <SelectItem value="IT Services">IT Services</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Responsable */}
                    <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-responsible">
                        <SelectValue placeholder="Responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les responsables</SelectItem>
                        <SelectItem value="Marie Martin">Marie Martin</SelectItem>
                        <SelectItem value="Pierre Durand">Pierre Durand</SelectItem>
                        <SelectItem value="Sophie Laurent">Sophie Laurent</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Statut */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]" data-testid="select-status">
                        <SelectValue placeholder="Statut du contrat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="terminated">Résilié</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Recherche texte */}
                    <Input
                      placeholder="Recherche texte..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 min-w-[200px]"
                      data-testid="input-search-deadlines"
                    />

                    {/* Boutons d'action */}
                    <Button variant="outline" onClick={resetFilters}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Réinitialiser
                    </Button>
                    
                    <Button variant="outline">
                      <Save className="w-4 h-4 mr-2" />
                      Sauver la vue
                    </Button>

                    <Button 
                      variant="default" 
                      onClick={() => setShowExportModal(true)}
                      data-testid="button-export"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exporter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bandeau d'information */}
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Une notification est générée <strong>30 jours avant</strong> l'échéance (valeur paramétrable).
              </AlertDescription>
            </Alert>

            {/* EC-1: Liste (tableau) */}
            <Card>
              <CardContent className="p-0">
                {filteredDeadlines.length === 0 ? (
                  /* EC-4: État vide */
                  <div className="flex flex-col items-center justify-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-lg text-gray-600 mb-2">
                      Aucune échéance dans l'intervalle
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Ajustez vos filtres pour voir les échéances
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={resetFilters}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Réinitialiser les filtres
                      </Button>
                      <Button variant="link">
                        Paramétrer le délai d'alerte dans les préférences
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contrat</TableHead>
                          <TableHead>Type d'échéance</TableHead>
                          <TableHead>Date d'échéance</TableHead>
                          <TableHead>J-</TableHead>
                          <TableHead>BU / Entité</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead>Statut du contrat</TableHead>
                          <TableHead>Canal d'alerte</TableHead>
                          <TableHead>Dernier envoi</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDeadlines.map((deadline) => (
                          <TableRow 
                            key={deadline.id} 
                            data-testid={`row-deadline-${deadline.id}`}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleShowDetails(deadline)}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{deadline.contractNumber}</div>
                                <div className="text-sm text-gray-500">Services informatiques</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getTypeLabel(deadline.type)}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(deadline.date)}</TableCell>
                            <TableCell>
                              <Badge variant={getDaysVariant(deadline.daysRemaining)}>
                                {deadline.daysRemaining < 0 ? (
                                  `Retard ${Math.abs(deadline.daysRemaining)}j`
                                ) : (
                                  `J-${deadline.daysRemaining}`
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>{deadline.businessUnit}</TableCell>
                            <TableCell>Marie Martin</TableCell>
                            <TableCell>
                              <Badge variant="success">Actif</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                {deadline.notificationSent && (
                                  <>
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <MessageSquare className="w-4 h-4 text-gray-500" />
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {deadline.notificationSent ? (
                                <span className="text-sm text-gray-600">
                                  {formatDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000))}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowDetails(deadline);
                                  }}
                                  data-testid={`button-view-${deadline.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {deadline.notificationSent && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    data-testid={`button-mark-read-${deadline.id}`}
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
                
                {/* Pied de liste */}
                {filteredDeadlines.length > 0 && (
                  <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
                    <div>
                      1-{Math.min(25, filteredDeadlines.length)} sur {filteredDeadlines.length}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Afficher:</span>
                      <Select defaultValue="25">
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

            {/* EC-2: Panneau latéral - Détail d'une échéance */}
            <Sheet open={showDetailsPanel} onOpenChange={setShowDetailsPanel}>
              <SheetContent className="w-[500px]">
                {selectedDeadline && (
                  <>
                    <SheetHeader>
                      <SheetTitle>
                        <div className="flex items-center justify-between">
                          <span>{getTypeLabel(selectedDeadline.type)}</span>
                          <Badge variant={getDaysVariant(selectedDeadline.daysRemaining)}>
                            J-{selectedDeadline.daysRemaining}
                          </Badge>
                        </div>
                        <div className="text-sm font-normal text-gray-600 mt-2">
                          Date d'échéance: {formatDate(selectedDeadline.date)}
                        </div>
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="mt-6 space-y-6">
                      {/* Bloc "Contrat lié" */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Contrat lié</h3>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Numéro:</span>
                            <span className="text-sm font-medium">{selectedDeadline.contractNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Intitulé:</span>
                            <span className="text-sm font-medium">Services informatiques</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Statut:</span>
                            <Badge variant="success" className="text-xs">Actif</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Période:</span>
                            <span className="text-sm">01/01/2024 - 31/12/2024</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">BU/Entité:</span>
                            <span className="text-sm">{selectedDeadline.businessUnit}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Responsable:</span>
                            <span className="text-sm">Marie Martin</span>
                          </div>
                        </div>
                      </div>

                      {/* Bloc "Alertes & rappels" */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Alertes & rappels</h3>
                        <div className="space-y-2">
                          {selectedDeadline.notificationSent ? (
                            <>
                              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                <div className="flex items-center space-x-2">
                                  <Mail className="w-4 h-4 text-green-600" />
                                  <span className="text-sm">Email envoyé</span>
                                </div>
                                <span className="text-xs text-gray-600">
                                  {formatDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                <div className="flex items-center space-x-2">
                                  <MessageSquare className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm">Teams notifié</span>
                                </div>
                                <span className="text-xs text-gray-600">
                                  {formatDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                                <div className="flex items-center space-x-2">
                                  <Bell className="w-4 h-4 text-purple-600" />
                                  <span className="text-sm">In-app généré</span>
                                </div>
                                <span className="text-xs text-gray-600">
                                  {formatDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000))}
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">Aucune notification envoyée</p>
                          )}
                        </div>
                      </div>

                      {/* Bloc "Historique (échéance)" */}
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Historique (échéance)</h3>
                        <div className="text-sm text-gray-600">
                          <p>Création: {formatDateTime(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))}</p>
                          <p>Dernier recalcul J-: {formatDateTime(new Date())}</p>
                        </div>
                      </div>

                      {/* Liens rapides */}
                      <div className="space-y-2 pt-4 border-t">
                        <Button variant="outline" className="w-full">
                          Voir le contrat
                        </Button>
                        <Button variant="outline" className="w-full">
                          Voir toutes les alertes du contrat
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>

            {/* EC-3: Modale "Exporter les échéances" */}
            <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Exporter les échéances</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Rappel des filtres actifs */}
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="font-medium mb-2">Filtres actifs:</p>
                    <p>Période: {periodFilter === "all" ? "Toutes" : periodFilter}</p>
                    <p>Type: {typeFilter === "all" ? "Tous" : getTypeLabel(typeFilter)}</p>
                    <p>BU: {businessUnitFilter === "all" ? "Toutes" : businessUnitFilter}</p>
                  </div>

                  {/* Sélection de colonnes */}
                  <div className="space-y-2">
                    <Label className="font-medium">Sélection de colonnes:</Label>
                    <div className="space-y-2">
                      {Object.entries({
                        contract: "Contrat",
                        type: "Type",
                        date: "Date d'échéance",
                        jMinus: "J-",
                        businessUnit: "BU/Entité",
                        responsible: "Responsable",
                        status: "Statut",
                        alertChannel: "Canal d'alerte",
                        lastSent: "Dernier envoi"
                      }).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={exportColumns[key as keyof typeof exportColumns]}
                            onCheckedChange={(checked) =>
                              setExportColumns({ ...exportColumns, [key]: checked as boolean })
                            }
                          />
                          <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Format de sortie */}
                  <div className="space-y-2">
                    <Label className="font-medium">Format de sortie:</Label>
                    <Select value={exportFormat} onValueChange={(value: "xlsx" | "csv") => setExportFormat(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nom de fichier */}
                  <div className="space-y-2">
                    <Label>Nom de fichier:</Label>
                    <Input
                      value={`echeances_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.${exportFormat}`}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      L'export contient uniquement les données visibles selon vos droits.
                    </AlertDescription>
                  </Alert>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowExportModal(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleExport}>
                    Générer l'export
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