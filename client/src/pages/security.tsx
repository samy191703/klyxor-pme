import { useState } from "react";
import SidebarWithSubmenu from "@/components/layout/sidebar-with-submenu";
import MobileNavWithSubmenu from "@/components/layout/mobile-nav-with-submenu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, Lock, AlertTriangle, User, Activity, Download, Info, 
  Users, FileText, Settings, Eye, Edit, Trash2, Copy, Clock,
  CheckCircle, XCircle, Search, Filter, RefreshCw, Plus, Mail,
  AlertCircle, Database, Key, UserCheck, UserX, ChevronRight,
  MoreVertical, Archive, FileDown, Calendar, Hash, Globe,
  MessageSquare, Bell, ExternalLink, Folder, LogOut, History, Save
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function Security() {
  const [activeTab, setActiveTab] = useState("users");
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showGDPRRequestModal, setShowGDPRRequestModal] = useState(false);
  const [selectedGDPRRequest, setSelectedGDPRRequest] = useState<any>(null);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("7days");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [gdprTypeFilter, setGdprTypeFilter] = useState("all");
  const [alertTypeFilter, setAlertTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { toast } = useToast();

  // Mock data
  const users = [
    {
      id: "user-1",
      name: "Marie Dupont",
      email: "marie.dupont@company.com",
      roles: ["Administrateur", "Valideur"],
      modules: ["Contrats", "Avenants", "Indexations", "Échéances", "Exports"],
      status: "active",
      lastAction: "Validation contrat CNT-2024-001",
      lastActionDate: new Date("2024-02-15T10:30:00"),
      createdBy: "System Admin",
      createdDate: new Date("2023-01-15"),
      lastLogin: new Date("2024-02-15T09:00:00"),
      perimeter: "Toutes entités"
    },
    {
      id: "user-2",
      name: "Pierre Durand",
      email: "pierre.durand@company.com",
      roles: ["Valideur"],
      modules: ["Contrats", "Avenants"],
      status: "active",
      lastAction: "Modification montant CNT-2024-008",
      lastActionDate: new Date("2024-02-14T14:15:00"),
      createdBy: "Marie Dupont",
      createdDate: new Date("2023-06-20"),
      lastLogin: new Date("2024-02-14T08:30:00"),
      perimeter: "BU France"
    },
    {
      id: "user-3",
      name: "Sophie Bernard",
      email: "sophie.bernard@company.com",
      roles: ["Opérateur"],
      modules: ["Contrats", "Documents"],
      status: "active",
      lastAction: "Ajout pièce jointe CNT-2024-003",
      lastActionDate: new Date("2024-02-13T16:45:00"),
      createdBy: "Marie Dupont",
      createdDate: new Date("2023-09-10"),
      lastLogin: new Date("2024-02-13T08:00:00"),
      perimeter: "BU International"
    },
    {
      id: "user-4",
      name: "Jean Martin",
      email: "jean.martin@company.com",
      roles: ["Administrateur"],
      modules: ["Tous modules"],
      status: "inactive",
      lastAction: "Paramétrage alertes",
      lastActionDate: new Date("2024-01-30T11:00:00"),
      createdBy: "System Admin",
      createdDate: new Date("2022-11-05"),
      lastLogin: new Date("2024-01-30T09:00:00"),
      perimeter: "Toutes entités"
    }
  ];

  const auditLogs = [
    {
      id: "log-1",
      timestamp: new Date("2024-02-15T11:00:00"),
      user: "Marie Dupont",
      action: "Validation",
      object: "Contrat",
      objectId: "CNT-2024-015",
      fields: "Statut",
      before: "À valider",
      after: "Actif",
      traceId: "TRC-2024-001",
      result: "success"
    },
    {
      id: "log-2",
      timestamp: new Date("2024-02-15T10:30:00"),
      user: "Pierre Durand",
      action: "Modification",
      object: "Avenant",
      objectId: "AVK-2024-008",
      fields: "Montant annuel",
      before: "100 000 €",
      after: "110 000 €",
      traceId: "TRC-2024-002",
      result: "success"
    },
    {
      id: "log-3",
      timestamp: new Date("2024-02-15T09:45:00"),
      user: "Sophie Bernard",
      action: "Création",
      object: "Indexation",
      objectId: "IDX-2024-003",
      fields: "Nouveau record",
      before: "-",
      after: "Créé",
      traceId: "TRC-2024-003",
      result: "success"
    },
    {
      id: "log-4",
      timestamp: new Date("2024-02-15T09:15:00"),
      user: "Marie Dupont",
      action: "Rejet",
      object: "Validation",
      objectId: "VAL-2024-022",
      fields: "Statut",
      before: "En attente",
      after: "Rejeté",
      traceId: "TRC-2024-004",
      result: "success"
    },
    {
      id: "log-5",
      timestamp: new Date("2024-02-14T17:00:00"),
      user: "System",
      action: "Suppression",
      object: "Document",
      objectId: "DOC-2024-101",
      fields: "Fichier",
      before: "contract_v1.pdf",
      after: "Supprimé",
      traceId: "TRC-2024-005",
      result: "success"
    }
  ];

  const sensitiveDataAccess = [
    {
      id: "access-1",
      date: new Date("2024-02-15T10:00:00"),
      user: "Marie Dupont",
      dataType: "PII",
      object: "Contrat CNT-2024-001",
      action: "Lecture",
      channel: "UI"
    },
    {
      id: "access-2",
      date: new Date("2024-02-15T09:30:00"),
      user: "Pierre Durand",
      dataType: "Financière",
      object: "Export rapport mensuel",
      action: "Export",
      channel: "Export"
    },
    {
      id: "access-3",
      date: new Date("2024-02-14T16:00:00"),
      user: "Sophie Bernard",
      dataType: "Document",
      object: "Avenant AVK-2024-005",
      action: "Téléchargement",
      channel: "UI"
    }
  ];

  const gdprRequests = [
    {
      id: "gdpr-1",
      reference: "GDPR-2024-001",
      requester: "client@example.com",
      type: "Export",
      scope: "Données contractuelles",
      deadline: new Date("2024-03-01"),
      status: "À traiter",
      operator: null,
      processedDate: null
    },
    {
      id: "gdpr-2",
      reference: "GDPR-2024-002",
      requester: "fournisseur@example.com",
      type: "Suppression",
      scope: "Contrats résilés > 5 ans",
      deadline: new Date("2024-02-28"),
      status: "En cours",
      operator: "Marie Dupont",
      processedDate: null
    },
    {
      id: "gdpr-3",
      reference: "GDPR-2024-003",
      requester: "partenaire@example.com",
      type: "Export",
      scope: "Historique complet",
      deadline: new Date("2024-02-20"),
      status: "Terminé",
      operator: "Jean Martin",
      processedDate: new Date("2024-02-10")
    }
  ];

  const securityAlerts = [
    {
      id: "alert-1",
      timestamp: new Date("2024-02-15T11:30:00"),
      type: "Accès non autorisé",
      severity: "critical",
      message: "Tentative d'accès refusée au module Exports",
      object: "Module Export",
      channel: "In-app",
      sendStatus: "sent",
      read: false
    },
    {
      id: "alert-2",
      timestamp: new Date("2024-02-15T10:00:00"),
      type: "Workflow > 24h",
      severity: "major",
      message: "Validation CNT-2024-022 en attente depuis 26h",
      object: "CNT-2024-022",
      channel: "Email",
      sendStatus: "sent",
      read: false
    },
    {
      id: "alert-3",
      timestamp: new Date("2024-02-14T15:30:00"),
      type: "Échéance critique",
      severity: "critical",
      message: "Contrat CNT-2024-005 expire dans 7 jours",
      object: "CNT-2024-005",
      channel: "Teams",
      sendStatus: "failed",
      read: false
    },
    {
      id: "alert-4",
      timestamp: new Date("2024-02-14T14:00:00"),
      type: "Rejet de validation",
      severity: "info",
      message: "Avenant AVK-2024-012 rejeté par le valideur",
      object: "AVK-2024-012",
      channel: "In-app",
      sendStatus: "sent",
      read: true
    }
  ];

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'major': return 'secondary';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleLogClick = (log: any) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const handleGDPRRequestClick = (request: any) => {
    setSelectedGDPRRequest(request);
    setShowGDPRRequestModal(true);
  };

  const handleSaveUserRoles = () => {
    toast({
      title: "Rôles enregistrés",
      description: "Les modifications ont été sauvegardées et journalisées",
    });
    setShowUserDetails(false);
  };

  const handleProcessGDPR = () => {
    toast({
      title: "Demande traitée",
      description: "La demande GDPR a été marquée comme traitée",
    });
    setShowGDPRRequestModal(false);
  };

  const handleMarkAlertAsRead = (alertId: string) => {
    toast({
      title: "Alerte marquée comme lue",
      description: "L'alerte a été mise à jour",
    });
  };

  const handleCopyTraceId = (traceId: string) => {
    navigator.clipboard.writeText(traceId);
    toast({
      title: "Copié",
      description: "L'identifiant de trace a été copié",
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarWithSubmenu />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNavWithSubmenu />
            <h1 className="text-lg font-semibold">Sécurité & Conformité</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="security-main">
          <div className="max-w-[1600px] mx-auto">
            {/* Page Header */}
            <div className="mb-4 lg:mb-6">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 hidden lg:block">Sécurité & Conformité</h1>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 w-full mb-6">
                <TabsTrigger value="users" className="text-xs sm:text-sm">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Rôles & accès</span>
                  <span className="sm:hidden">Rôles</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="text-xs sm:text-sm">
                  <Activity className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Journal d'audit</span>
                  <span className="sm:hidden">Audit</span>
                </TabsTrigger>
                <TabsTrigger value="sensitive" className="text-xs sm:text-sm">
                  <Database className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Données sensibles</span>
                  <span className="sm:hidden">Données</span>
                </TabsTrigger>
                <TabsTrigger value="gdpr" className="text-xs sm:text-sm">
                  <FileText className="w-4 h-4 mr-1" />
                  <span>RGPD</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm">
                  <Settings className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Paramètres</span>
                  <span className="sm:hidden">Params</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>Alertes</span>
                </TabsTrigger>
              </TabsList>

              {/* SC-1: Rôles & accès (RBAC) */}
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>Rôles & accès</CardTitle>
                    <Alert className="mt-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Les modules, données et actions visibles dépendent strictement du rôle. Toutes les modifications de droits sont tracées.
                      </AlertDescription>
                    </Alert>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les rôles</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                          <SelectItem value="validator">Valideur</SelectItem>
                          <SelectItem value="operator">Opérateur</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="inactive">Désactivé</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Rechercher (nom, email)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="col-span-1 sm:col-span-2 lg:col-span-2"
                      />

                      <Button variant="outline" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Créer utilisateur
                      </Button>
                    </div>

                    {/* Users table - responsive */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom & email</TableHead>
                            <TableHead>Rôles</TableHead>
                            <TableHead>Modules autorisés</TableHead>
                            <TableHead>Dernière action</TableHead>
                            <TableHead>Créé par / le</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{user.name}</p>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {user.roles.map((role) => (
                                    <Badge key={role} variant="secondary">{role}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-gray-600">
                                  {user.modules.slice(0, 2).join(", ")}
                                  {user.modules.length > 2 && ` +${user.modules.length - 2}`}
                                </p>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm">{user.lastAction}</p>
                                  <p className="text-xs text-gray-500">{formatDateTime(user.lastActionDate)}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm">{user.createdBy}</p>
                                  <p className="text-xs text-gray-500">{formatDate(user.createdDate)}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUserClick(user)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={user.status === 'active' ? 'text-orange-600' : 'text-green-600'}
                                  >
                                    {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile view */}
                    <div className="md:hidden space-y-3">
                      {users.map((user) => (
                        <Card key={user.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                              <Badge className={user.status === 'active' ? 'bg-green-500 text-white' : ''} variant="secondary">
                                {user.status === 'active' ? 'Actif' : 'Désactivé'}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map((role) => (
                                  <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                                ))}
                              </div>
                              <p className="text-xs text-gray-600">
                                Modules: {user.modules.slice(0, 2).join(", ")}
                                {user.modules.length > 2 && ` +${user.modules.length - 2}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                Dernière action: {formatDateTime(user.lastActionDate)}
                              </p>
                            </div>
                            <div className="flex justify-end gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUserClick(user)}
                              >
                                Détails
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Compliance note */}
                    <Alert className="mt-6">
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Toute action d'administration est <strong>auditée</strong>, horodatée et <strong>non modifiable</strong> (rétention légale).
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SC-3: Journal d'audit */}
              <TabsContent value="audit">
                <Card>
                  <CardHeader>
                    <CardTitle>Journal d'audit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                      <Select value={periodFilter} onValueChange={setPeriodFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Aujourd'hui</SelectItem>
                          <SelectItem value="7days">7 derniers jours</SelectItem>
                          <SelectItem value="30days">30 derniers jours</SelectItem>
                          <SelectItem value="custom">Personnalisé</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type d'action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="creation">Création</SelectItem>
                          <SelectItem value="modification">Modification</SelectItem>
                          <SelectItem value="validation">Validation</SelectItem>
                          <SelectItem value="rejection">Rejet</SelectItem>
                          <SelectItem value="deletion">Suppression</SelectItem>
                          <SelectItem value="settings">Paramétrage</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Trace-ID, N° contrat"
                        className="col-span-1 sm:col-span-2 lg:col-span-2"
                      />

                      <Button variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                      </Button>
                    </div>

                    {/* Audit logs table - responsive */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Horodatage</TableHead>
                            <TableHead>Utilisateur</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Objet & ID</TableHead>
                            <TableHead>Champs impactés</TableHead>
                            <TableHead>Avant → Après</TableHead>
                            <TableHead>Trace-ID</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatDateTime(log.timestamp)}
                              </TableCell>
                              <TableCell>{log.user}</TableCell>
                              <TableCell>
                                <Badge variant={log.action === 'Rejet' ? 'destructive' : 'secondary'}>
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm">{log.object}</p>
                                  <code className="text-xs bg-gray-100 px-1 rounded">{log.objectId}</code>
                                </div>
                              </TableCell>
                              <TableCell>{log.fields}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <span className="text-gray-500">{log.before}</span>
                                  <span className="mx-1">→</span>
                                  <span className="font-medium">{log.after}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{log.traceId}</code>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleLogClick(log)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyTraceId(log.traceId)}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Tablet/Mobile view */}
                    <div className="lg:hidden space-y-3">
                      {auditLogs.map((log) => (
                        <Card key={log.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <Badge variant={log.action === 'Rejet' ? 'destructive' : 'secondary'} className="mb-2">
                                  {log.action}
                                </Badge>
                                <p className="text-sm font-medium">{log.object} - {log.objectId}</p>
                                <p className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</p>
                              </div>
                              <Badge className={log.result === 'success' ? 'bg-green-500 text-white text-xs' : 'text-xs'} variant="secondary">
                                {log.result === 'success' ? 'Succès' : 'Échec'}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm">
                                <span className="text-gray-600">Utilisateur:</span> {log.user}
                              </p>
                              <p className="text-sm">
                                <span className="text-gray-600">Champs:</span> {log.fields}
                              </p>
                              <div className="text-sm">
                                <span className="text-gray-500">{log.before}</span>
                                <span className="mx-1">→</span>
                                <span className="font-medium">{log.after}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{log.traceId}</code>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleLogClick(log)}
                                  >
                                    Détails
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyTraceId(log.traceId)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Alert className="mt-6">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Les logs sont horodatés, <strong>non modifiables</strong>, consultables par l'administrateur.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SC-5: Registre des accès aux données sensibles */}
              <TabsContent value="sensitive">
                <Card>
                  <CardHeader>
                    <CardTitle>Accès aux données sensibles</CardTitle>
                    <Alert className="mt-4">
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Les accès aux données personnelles et financières sont <strong>restreints et tracés</strong>.
                      </AlertDescription>
                    </Alert>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                      <Select value={periodFilter} onValueChange={setPeriodFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Aujourd'hui</SelectItem>
                          <SelectItem value="7days">7 derniers jours</SelectItem>
                          <SelectItem value="30days">30 derniers jours</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Type de donnée" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="pii">PII</SelectItem>
                          <SelectItem value="financial">Financière</SelectItem>
                          <SelectItem value="document">Document</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="read">Lecture</SelectItem>
                          <SelectItem value="export">Export</SelectItem>
                          <SelectItem value="download">Téléchargement</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button variant="outline" className="col-span-1 sm:col-span-2">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter registre
                      </Button>
                    </div>

                    {/* Access logs table */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date/heure</TableHead>
                            <TableHead>Utilisateur</TableHead>
                            <TableHead>Type de donnée</TableHead>
                            <TableHead>Objet & ID</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Canal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sensitiveDataAccess.map((access) => (
                            <TableRow key={access.id}>
                              <TableCell>{formatDateTime(access.date)}</TableCell>
                              <TableCell>{access.user}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{access.dataType}</Badge>
                              </TableCell>
                              <TableCell>{access.object}</TableCell>
                              <TableCell>{access.action}</TableCell>
                              <TableCell>{access.channel}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile view */}
                    <div className="md:hidden space-y-3">
                      {sensitiveDataAccess.map((access) => (
                        <Card key={access.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <Badge variant="outline">{access.dataType}</Badge>
                              <span className="text-xs text-gray-500">{formatDateTime(access.date)}</span>
                            </div>
                            <p className="font-medium text-sm mb-2">{access.object}</p>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-600">Utilisateur:</span> {access.user}</p>
                              <p><span className="text-gray-600">Action:</span> {access.action}</p>
                              <p><span className="text-gray-600">Canal:</span> {access.channel}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SC-6: Demandes RGPD */}
              <TabsContent value="gdpr">
                <Card>
                  <CardHeader>
                    <CardTitle>Demandes RGPD</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                      <Select value={gdprTypeFilter} onValueChange={setGdprTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="export">Export</SelectItem>
                          <SelectItem value="deletion">Suppression</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="pending">À traiter</SelectItem>
                          <SelectItem value="processing">En cours</SelectItem>
                          <SelectItem value="completed">Terminé</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Demandeur"
                        className="col-span-1 sm:col-span-2"
                      />

                      <Button variant="outline" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Nouvelle demande
                      </Button>
                    </div>

                    {/* GDPR requests table */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Référence</TableHead>
                            <TableHead>Demandeur</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Portée</TableHead>
                            <TableHead>Date limite légale</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Traçabilité</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gdprRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                  {request.reference}
                                </code>
                              </TableCell>
                              <TableCell>{request.requester}</TableCell>
                              <TableCell>
                                <Badge variant={request.type === 'Export' ? 'secondary' : 'destructive'}>
                                  {request.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{request.scope}</TableCell>
                              <TableCell>{formatDate(request.deadline)}</TableCell>
                              <TableCell>
                                <Badge 
                                  className={
                                    request.status === 'Terminé' ? 'bg-green-500 text-white' :
                                    request.status === 'En cours' ? 'bg-yellow-500 text-white' : ''
                                  }
                                  variant="secondary"
                                >
                                  {request.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {request.operator ? (
                                  <div>
                                    <p className="text-sm">{request.operator}</p>
                                    {request.processedDate && (
                                      <p className="text-xs text-gray-500">{formatDate(request.processedDate)}</p>
                                    )}
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleGDPRRequestClick(request)}
                                >
                                  Ouvrir
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile view */}
                    <div className="md:hidden space-y-3">
                      {gdprRequests.map((request) => (
                        <Card key={request.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {request.reference}
                              </code>
                              <Badge 
                                className={
                                  request.status === 'Terminé' ? 'bg-green-500 text-white' :
                                  request.status === 'En cours' ? 'bg-yellow-500 text-white' : ''
                                }
                                variant="secondary"
                              >
                                {request.status}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{request.requester}</p>
                              <Badge variant={request.type === 'Export' ? 'secondary' : 'destructive'} className="text-xs">
                                {request.type}
                              </Badge>
                              <p className="text-xs text-gray-600">{request.scope}</p>
                              <p className="text-xs text-gray-500">
                                Date limite: {formatDate(request.deadline)}
                              </p>
                              {request.operator && (
                                <p className="text-xs text-gray-500">
                                  Traité par: {request.operator}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-3"
                              onClick={() => handleGDPRRequestClick(request)}
                            >
                              Ouvrir
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Alert className="mt-6">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Mode opératoire:</strong> export sécurisé des données personnelles ou suppression contrôlée, avec <strong>preuve d'exécution</strong> dans les logs.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SC-7: Paramètres de conformité */}
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Paramètres de conformité</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Section: Traçabilité & conservation */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Traçabilité & conservation</h3>
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
                          <div className="mb-2 sm:mb-0">
                            <p className="font-medium">Rétention des logs</p>
                            <p className="text-sm text-gray-600">Durée de conservation des journaux d'audit</p>
                          </div>
                          <Select defaultValue="1year">
                            <SelectTrigger className="w-full sm:w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6months">6 mois</SelectItem>
                              <SelectItem value="1year">1 an</SelectItem>
                              <SelectItem value="2years">2 ans</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Intégrité des logs</p>
                            <p className="text-sm text-gray-600">Les logs sont non modifiables</p>
                          </div>
                          <Badge className="bg-green-500 text-white" variant="secondary">Actif</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Accès aux logs</p>
                            <p className="text-sm text-gray-600">Consultables par l'administrateur uniquement</p>
                          </div>
                          <Badge className="bg-green-500 text-white" variant="secondary">Configuré</Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Section: Accès aux données sensibles */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Accès aux données sensibles</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Contrôle par profils/permissions</p>
                            <p className="text-sm text-gray-600">RBAC activé</p>
                          </div>
                          <Badge className="bg-green-500 text-white" variant="secondary">Actif</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Restrictions de lecture/téléchargement</p>
                            <p className="text-sm text-gray-600">Selon les rôles définis</p>
                          </div>
                          <Badge className="bg-green-500 text-white" variant="secondary">Configuré</Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Section: Notifications de conformité */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Notifications de conformité</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Checkbox id="critical-alerts" defaultChecked />
                            <div>
                              <Label htmlFor="critical-alerts" className="font-medium cursor-pointer">
                                Alertes critiques
                              </Label>
                              <p className="text-sm text-gray-600">Accès refusé, workflow bloqué</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Checkbox id="compliance-alerts" defaultChecked />
                            <div>
                              <Label htmlFor="compliance-alerts" className="font-medium cursor-pointer">
                                Alertes de conformité
                              </Label>
                              <p className="text-sm text-gray-600">Violations RBAC, tentatives d'accès non autorisé</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
                          <div className="mb-2 sm:mb-0">
                            <p className="font-medium">Rétention historique alertes</p>
                            <p className="text-sm text-gray-600">Conservation de l'historique</p>
                          </div>
                          <Select defaultValue="1year">
                            <SelectTrigger className="w-full sm:w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6months">6 mois</SelectItem>
                              <SelectItem value="1year">1 an</SelectItem>
                              <SelectItem value="2years">2 ans</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SC-8: Alertes de sécurité & conformité */}
              <TabsContent value="alerts">
                <Card>
                  <CardHeader>
                    <CardTitle>Alertes de sécurité & conformité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                      <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="unauthorized">Accès non autorisé</SelectItem>
                          <SelectItem value="workflow">Workflow &gt; 24h</SelectItem>
                          <SelectItem value="rejection">Rejet de validation</SelectItem>
                          <SelectItem value="deadline">Échéances critiques</SelectItem>
                          <SelectItem value="error">Échec d'envoi</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={severityFilter} onValueChange={setSeverityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Gravité" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="critical">Critique</SelectItem>
                          <SelectItem value="major">Majeure</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="unread">Non lue</SelectItem>
                          <SelectItem value="read">Lue</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={periodFilter} onValueChange={setPeriodFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Aujourd'hui</SelectItem>
                          <SelectItem value="7days">7 derniers jours</SelectItem>
                          <SelectItem value="30days">30 derniers jours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Alerts table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Horodatage</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Objet</TableHead>
                            <TableHead>Canal</TableHead>
                            <TableHead>Statut d'envoi</TableHead>
                            <TableHead>Lecture</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {securityAlerts.map((alert) => (
                            <TableRow key={alert.id} className={alert.read ? '' : 'bg-blue-50'}>
                              <TableCell className="whitespace-nowrap">
                                {formatDateTime(alert.timestamp)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getSeverityColor(alert.severity)}>
                                  {alert.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                              <TableCell>
                                <code className="text-xs bg-gray-100 px-1 rounded">{alert.object}</code>
                              </TableCell>
                              <TableCell>{alert.channel}</TableCell>
                              <TableCell>
                                <Badge 
                                  className={alert.sendStatus === 'sent' ? 'bg-green-500 text-white' : ''}
                                  variant={alert.sendStatus === 'sent' ? 'secondary' : 'destructive'}
                                >
                                  {alert.sendStatus === 'sent' ? 'Envoyé' : 'Échec'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {alert.read ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Clock className="w-4 h-4 text-gray-400" />
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {!alert.read && (
                                      <DropdownMenuItem onClick={() => handleMarkAlertAsRead(alert.id)}>
                                        Marquer comme lue
                                      </DropdownMenuItem>
                                    )}
                                    {alert.sendStatus === 'failed' && (
                                      <DropdownMenuItem>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Relancer l'envoi
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem>
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Ouvrir le contexte
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile/Tablet view */}
                    <div className="lg:hidden space-y-3">
                      {securityAlerts.map((alert) => (
                        <Card key={alert.id} className={alert.read ? '' : 'border-blue-200 bg-blue-50'}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <Badge variant={getSeverityColor(alert.severity)}>
                                {alert.type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(alert.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm mb-3">{alert.message}</p>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{alert.object}</code>
                              <Badge variant="outline" className="text-xs">{alert.channel}</Badge>
                              <Badge 
                                className={alert.sendStatus === 'sent' ? 'bg-green-500 text-white text-xs' : 'text-xs'}
                                variant={alert.sendStatus === 'sent' ? 'secondary' : 'destructive'}
                              >
                                {alert.sendStatus === 'sent' ? 'Envoyé' : 'Échec'}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              {!alert.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAlertAsRead(alert.id)}
                                >
                                  Marquer comme lue
                                </Button>
                              )}
                              <Button variant="ghost" size="sm">
                                Ouvrir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Alert className="mt-6">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Séparation des rôles:</strong> un <strong>valideur</strong> ne peut pas valider ses <strong>propres contrats</strong> (contrôle interne).
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* SC-2: User Details Sheet */}
      <Sheet open={showUserDetails} onOpenChange={setShowUserDetails}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détail utilisateur & affectation des rôles</SheetTitle>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-6 space-y-6">
              {/* User identity */}
              <div>
                <h3 className="font-semibold mb-3">Identité</h3>
                <div className="space-y-2">
                  <p><span className="text-gray-600">Nom:</span> {selectedUser.name}</p>
                  <p><span className="text-gray-600">Email:</span> {selectedUser.email}</p>
                  <p><span className="text-gray-600">Statut:</span> 
                    <Badge 
                      className={selectedUser.status === 'active' ? 'bg-green-500 text-white ml-2' : 'ml-2'}
                      variant="secondary"
                    >
                      {selectedUser.status === 'active' ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </p>
                </div>
              </div>

              <Separator />

              {/* Roles */}
              <div>
                <h3 className="font-semibold mb-3">Rôles attribués</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="role-admin" defaultChecked={selectedUser.roles.includes('Administrateur')} />
                    <Label htmlFor="role-admin">Administrateur</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="role-validator" defaultChecked={selectedUser.roles.includes('Valideur')} />
                    <Label htmlFor="role-validator">Valideur</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="role-operator" defaultChecked={selectedUser.roles.includes('Opérateur')} />
                    <Label htmlFor="role-operator">Opérateur</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Modules & actions */}
              <div>
                <h3 className="font-semibold mb-3">Modules & actions autorisés</h3>
                <div className="space-y-3">
                  {['Contrats', 'Avenants', 'Indexations', 'Échéances', 'Exports', 'Alertes', 'Paramètres'].map((module) => (
                    <div key={module} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">{module}</Label>
                        <Checkbox defaultChecked={selectedUser.modules.includes(module)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center space-x-1">
                          <Checkbox id={`${module}-read`} defaultChecked />
                          <Label htmlFor={`${module}-read`} className="text-xs">Lecture</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Checkbox id={`${module}-write`} />
                          <Label htmlFor={`${module}-write`} className="text-xs">Écriture</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Checkbox id={`${module}-validate`} />
                          <Label htmlFor={`${module}-validate`} className="text-xs">Validation</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Checkbox id={`${module}-delete`} />
                          <Label htmlFor={`${module}-delete`} className="text-xs">Suppression</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Restrictions */}
              <div>
                <h3 className="font-semibold mb-3">Restrictions & visibilité des données</h3>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Masquage des modules non autorisés et <strong>impossibilité de dépasser ses droits</strong> (même via URL).
                  </AlertDescription>
                </Alert>
              </div>

              <Separator />

              {/* Traceability */}
              <div>
                <h3 className="font-semibold mb-3">Traçabilité (lecture seule)</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">Dernière connexion:</span> {formatDateTime(selectedUser.lastLogin)}</p>
                  <p><span className="text-gray-600">Dernière action:</span> {selectedUser.lastAction}</p>
                  <p><span className="text-gray-600">Date action:</span> {formatDateTime(selectedUser.lastActionDate)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUserDetails(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveUserRoles}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* SC-4: Log Details Sheet */}
      <Sheet open={showLogDetails} onOpenChange={setShowLogDetails}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Détail du log</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Type d'action</p>
                <Badge variant={selectedLog.action === 'Rejet' ? 'destructive' : 'secondary'}>
                  {selectedLog.action}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Horodatage</p>
                <p className="font-medium">{formatDateTime(selectedLog.timestamp)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Utilisateur</p>
                <p className="font-medium">{selectedLog.user}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trace-ID</p>
                <div className="flex items-center gap-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{selectedLog.traceId}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyTraceId(selectedLog.traceId)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Objet</h4>
                <p className="text-sm text-gray-600">Type: {selectedLog.object}</p>
                <p className="text-sm text-gray-600">Identifiant: {selectedLog.objectId}</p>
                <Button variant="link" className="p-0 h-auto text-sm">
                  Voir l'objet <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Champs & valeurs</h4>
                <p className="text-sm text-gray-600 mb-2">Champs impactés: {selectedLog.fields}</p>
                <div className="space-y-2">
                  <div className="p-2 bg-red-50 rounded">
                    <p className="text-xs text-gray-600">Valeur avant</p>
                    <p className="text-sm">{selectedLog.before}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <p className="text-xs text-gray-600">Valeur après</p>
                    <p className="text-sm font-medium">{selectedLog.after}</p>
                  </div>
                </div>
              </div>
              {selectedLog.action === 'Rejet' && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Chaîne de validation</h4>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Motif de rejet obligatoire en cas de refus
                      </AlertDescription>
                    </Alert>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* GDPR Request Modal */}
      <Dialog open={showGDPRRequestModal} onOpenChange={setShowGDPRRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Traiter la demande RGPD</DialogTitle>
            <DialogDescription>
              {selectedGDPRRequest?.reference}
            </DialogDescription>
          </DialogHeader>
          {selectedGDPRRequest && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Demandeur</p>
                <p className="font-medium">{selectedGDPRRequest.requester}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type de demande</p>
                <Badge variant={selectedGDPRRequest.type === 'Export' ? 'secondary' : 'destructive'}>
                  {selectedGDPRRequest.type}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Portée</p>
                <p className="font-medium">{selectedGDPRRequest.scope}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date limite légale</p>
                <p className="font-medium">{formatDate(selectedGDPRRequest.deadline)}</p>
              </div>
              {selectedGDPRRequest.status === 'À traiter' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Cette action sera journalisée avec preuve d'exécution dans les logs.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGDPRRequestModal(false)}>
              Annuler
            </Button>
            {selectedGDPRRequest?.status === 'À traiter' && (
              <Button onClick={handleProcessGDPR}>
                {selectedGDPRRequest.type === 'Export' ? 'Générer l\'export' : 'Marquer comme traité'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}