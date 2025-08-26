import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import StatusBadge from "@/components/common/status-badge";
import { 
  Search, Bell, User, Filter, Download, Settings, RefreshCw,
  FileText, Edit, XCircle, TrendingUp, Calendar, AlertCircle,
  Clock, Shield, Database, Link, Timer, Mail, MessageSquare,
  CheckCircle, AlertTriangle, Info, ArrowUp, ArrowDown,
  FileDown, Archive, Activity, PieChart, History, Paperclip,
  ChevronRight, Eye, Check, X, Send, MoreVertical, Plus
} from "lucide-react";
import { useLocation } from "wouter";
import { AIHelpBubble } from "@/components/ai-help/ai-help-bubble";
import { useAIHelp } from "@/components/ai-help/context-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type definitions
interface KPIData {
  contractsToValidate: number;
  amendmentsToValidate: number;
  terminationsToValidate: number;
  indexationsToValidate: number;
  deadlinesIn30Days: number;
  criticalAlerts: number;
  integrationErrors: number;
  contractsWithoutAttachments: number;
  manualUpdates: number;
  trends: {
    contractsToValidate: number;
    amendmentsToValidate: number;
    terminationsToValidate: number;
    indexationsToValidate: number;
    deadlinesIn30Days: number;
    criticalAlerts: number;
    integrationErrors: number;
    contractsWithoutAttachments: number;
    manualUpdates: number;
  };
}

interface ValidationItem {
  id: string;
  type: 'contract' | 'amendment' | 'indexation' | 'termination' | 'amount';
  contractNumber: string;
  contractTitle: string;
  impactedFields?: string;
  requestedBy: string;
  assignedValidator: string;
  slaDue: Date;
  age: number;
  lastAction?: string;
  status: 'pending' | 'validated' | 'rejected';
}

interface DeadlineItem {
  id: string;
  contractNumber: string;
  contractTitle: string;
  type: 'contract_end' | 'anniversary' | 'amendment_end';
  date: Date;
  daysRemaining: number;
  alertChannel: 'email' | 'teams' | 'in-app';
}

interface Alert {
  id: string;
  timestamp: Date;
  type: 'deadline' | 'workflow' | 'rejection' | 'error' | 'integration';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  contractNumber?: string;
  sendStatus: 'sent' | 'failed' | 'pending';
  readStatus: boolean;
  channel: 'in-app' | 'email' | 'teams';
}

interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  fields?: string;
  before?: string;
  after?: string;
  traceId: string;
  contractNumber?: string;
}

interface Notification {
  id: string;
  type: 'alert' | 'validation' | 'deadline' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  severity: 'critical' | 'warning' | 'info';
}

export default function Dashboard() {
  const [location] = useLocation();
  const { setPage } = useAIHelp();
  const [periodFilter, setPeriodFilter] = useState("current_month");
  const [entityFilter, setEntityFilter] = useState("all");
  const [contractTypeFilter, setContractTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [validatorFilter, setValidatorFilter] = useState("all");
  const [alertChannelFilter, setAlertChannelFilter] = useState("all");
  const [globalSearch, setGlobalSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedValidationItem, setSelectedValidationItem] = useState<ValidationItem | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationDecision, setValidationDecision] = useState<'validate' | 'reject'>('validate');
  const [rejectionReason, setRejectionReason] = useState("");

  // Mock KPI data with trends
  const kpiData: KPIData = {
    contractsToValidate: 12,
    amendmentsToValidate: 5,
    terminationsToValidate: 3,
    indexationsToValidate: 8,
    deadlinesIn30Days: 15,
    criticalAlerts: 4,
    integrationErrors: 2,
    contractsWithoutAttachments: 7,
    manualUpdates: 3,
    trends: {
      contractsToValidate: 15,
      amendmentsToValidate: -10,
      terminationsToValidate: 0,
      indexationsToValidate: 20,
      deadlinesIn30Days: -5,
      criticalAlerts: 50,
      integrationErrors: 100,
      contractsWithoutAttachments: -20,
      manualUpdates: 0
    }
  };

  // Mock notifications
  const notifications: Notification[] = [
    {
      id: "1",
      type: 'alert',
      title: "Workflow en retard",
      message: "Le contrat CNT-2024-001 attend validation depuis plus de 24h",
      timestamp: new Date(Date.now() - 3600000),
      read: false,
      severity: 'critical'
    },
    {
      id: "2",
      type: 'deadline',
      title: "Échéance proche",
      message: "5 contrats arrivent à échéance dans les 7 prochains jours",
      timestamp: new Date(Date.now() - 7200000),
      read: false,
      severity: 'warning'
    },
    {
      id: "3",
      type: 'validation',
      title: "Nouvelle validation requise",
      message: "Un avenant nécessite votre validation",
      timestamp: new Date(Date.now() - 10800000),
      read: true,
      severity: 'info'
    }
  ];

  // klyxOR validation queue data
  const validationQueue: ValidationItem[] = [
    {
      id: "val-1",
      type: 'contract',
      contractNumber: "KLX-2024-001",
      contractTitle: "Fourniture électricité site Lyon Confluence",
      impactedFields: "Puissance, Tarif",
      requestedBy: "Marie Leclerc",
      assignedValidator: "Pierre Durand",
      slaDue: new Date(Date.now() + 3600000),
      age: 18,
      lastAction: "Soumis à validation",
      status: 'pending'
    },
    {
      id: "val-2",
      type: 'amendment',
      contractNumber: "KLX-2023-045",
      contractTitle: "Extension parc éolien +10MW",
      impactedFields: "Capacité production",
      requestedBy: "Thomas Dubois",
      assignedValidator: "Sophie Martin",
      slaDue: new Date(Date.now() + 7200000),
      age: 12,
      lastAction: "En cours de révision",
      status: 'pending'
    },
    {
      id: "val-3",
      type: 'indexation',
      contractNumber: "KLX-2023-089",
      contractTitle: "Trading gaz naturel - Hub PEG",
      impactedFields: "Prix indexé",
      requestedBy: "Système",
      assignedValidator: "Jean Duval",
      slaDue: new Date(Date.now() + 86400000),
      age: 2,
      status: 'pending'
    }
  ];

  // klyxOR deadlines data
  const upcomingDeadlines: DeadlineItem[] = [
    {
      id: "ddl-1",
      contractNumber: "KLX-2023-089",
      contractTitle: "Trading gaz naturel - Hub PEG",
      type: 'contract_end',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      daysRemaining: 7,
      alertChannel: 'email'
    },
    {
      id: "ddl-2",
      contractNumber: "KLX-2024-012",
      contractTitle: "Contrat PPA solaire 25MW",
      type: 'anniversary',
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      daysRemaining: 15,
      alertChannel: 'teams'
    },
    {
      id: "ddl-3",
      contractNumber: "KLX-2023-045",
      contractTitle: "Maintenance parc éolien",
      type: 'amendment_end',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      daysRemaining: 30,
      alertChannel: 'in-app'
    }
  ];

  // klyxOR alerts data
  const alertsFeed: Alert[] = [
    {
      id: "alert-1",
      timestamp: new Date(Date.now() - 1800000),
      type: 'workflow',
      severity: 'critical',
      message: "Validation contrat électricité en attente depuis 24h",
      contractNumber: "KLX-2024-001",
      sendStatus: 'sent',
      readStatus: false,
      channel: 'in-app'
    },
    {
      id: "alert-2",
      timestamp: new Date(Date.now() - 3600000),
      type: 'deadline',
      severity: 'warning',
      message: "Renouvellement contrat gaz dans 7 jours",
      contractNumber: "KLX-2023-089",
      sendStatus: 'sent',
      readStatus: true,
      channel: 'email'
    },
    {
      id: "alert-3",
      timestamp: new Date(Date.now() - 7200000),
      type: 'integration',
      severity: 'critical',
      message: "Erreur synchronisation système KLMS",
      sendStatus: 'failed',
      readStatus: false,
      channel: 'teams'
    }
  ];

  // Mock audit logs
  const auditLogs: AuditLog[] = [
    {
      id: "log-1",
      timestamp: new Date(Date.now() - 900000),
      user: "Marie Dupont",
      action: "Validation contrat",
      fields: "Statut",
      before: "À valider",
      after: "Actif",
      traceId: "TRC-2024-001",
      contractNumber: "CNT-2024-015"
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 1800000),
      user: "Pierre Durand",
      action: "Modification montant",
      fields: "Montant annuel",
      before: "100 000 €",
      after: "110 000 €",
      traceId: "TRC-2024-002",
      contractNumber: "CNT-2024-008"
    },
    {
      id: "log-3",
      timestamp: new Date(Date.now() - 3600000),
      user: "Sophie Bernard",
      action: "Ajout pièce jointe",
      fields: "Documents",
      after: "Avenant_2024.pdf",
      traceId: "TRC-2024-003",
      contractNumber: "CNT-2024-003"
    }
  ];

  // Mock contracts without attachments
  const contractsWithoutAttachments = [
    { id: "cnt-1", number: "CNT-2024-018", title: "Services cloud", requiredType: "Contrat signé", uploadAuthor: "Marie Dupont" },
    { id: "cnt-2", number: "CNT-2024-021", title: "Maintenance HVAC", requiredType: "Certificat assurance", uploadAuthor: "Pierre Durand" },
    { id: "cnt-3", number: "CNT-2024-025", title: "Prestations audit", requiredType: "Convention", uploadAuthor: "Sophie Bernard" }
  ];

  // Contract status distribution for pie chart
  const statusDistribution = [
    { status: 'Brouillon', count: 15, percentage: 12 },
    { status: 'À valider', count: 20, percentage: 16 },
    { status: 'Actif', count: 65, percentage: 52 },
    { status: 'Résilié', count: 15, percentage: 12 },
    { status: 'Clôturé', count: 10, percentage: 8 }
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
    return new Intl.DateTimeFormat('fr-FR').format(date);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUp className="w-3 h-3 text-red-500" />;
    if (trend < 0) return <ArrowDown className="w-3 h-3 text-green-500" />;
    return <span className="w-3 h-3 text-gray-400">−</span>;
  };

  const getDeadlineBadge = (days: number) => {
    if (days <= 1) return <Badge variant="destructive">J-{days}</Badge>;
    if (days <= 7) return <Badge variant="secondary" className="bg-orange-100 text-orange-700">J-{days}</Badge>;
    if (days <= 30) return <Badge variant="secondary">J-{days}</Badge>;
    return null;
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Custom Header with Search and Notifications */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu */}
            <MobileNav />
            
            {/* Global Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Recherche..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            {/* Notifications and Profile */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadNotifications}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                    <SheetDescription>
                      {unreadNotifications} non lues • Conservation 1 an
                    </SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                    <div className="space-y-2">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          className={`p-3 rounded-lg border ${notif.read ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {notif.severity === 'critical' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                {notif.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                {notif.severity === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                                <span className="font-medium text-sm">{notif.title}</span>
                              </div>
                              <p className="text-sm text-gray-600">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDateTime(notif.timestamp)}
                              </p>
                            </div>
                            {!notif.read && (
                              <Badge variant="secondary" className="text-xs">Nouveau</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" className="w-full">Tout voir</Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="hidden sm:inline text-sm">Admin</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Profil & rôle actif</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Shield className="w-4 h-4 mr-2" />
                    Rôle : Administrateur
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="dashboard-main">
          <div className="max-w-[1600px] mx-auto">
            {/* Page Title */}
            <div className="mb-4 lg:mb-6 relative">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Tableau de bord</h1>
              <AIHelpBubble
                contextData={{
                  page: 'dashboard',
                  contractsToValidate: kpiData.contractsToValidate,
                  deadlinesCount: kpiData.deadlinesIn30Days,
                  criticalAlerts: kpiData.criticalAlerts
                }}
              />
            </div>

            {/* Filters Bar */}
            <Card className="mb-4 lg:mb-6">
              <CardContent className="p-3 lg:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">Mois en cours</SelectItem>
                      <SelectItem value="30_days">30 jours</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Entité/BU" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="solutions_france">klyxOR Solutions France</SelectItem>
                      <SelectItem value="klyxor_green">klyxOR Green</SelectItem>
                      <SelectItem value="gem">klyxOR Global Energy Management</SelectItem>
                      <SelectItem value="klyxor_flex">klyxOR Flex</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={contractTypeFilter} onValueChange={setContractTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type de contrat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="electricity">Fourniture Électricité</SelectItem>
                      <SelectItem value="gas">Fourniture Gaz</SelectItem>
                      <SelectItem value="renewable">Production Renouvelable</SelectItem>
                      <SelectItem value="maintenance">Maintenance Infrastructure</SelectItem>
                      <SelectItem value="trading">Trading Énergie</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="État" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="to_validate">À valider</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="terminated">Résilié</SelectItem>
                      <SelectItem value="closed">Clôturé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={validatorFilter} onValueChange={setValidatorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Valideur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="jean_martin">Jean Martin</SelectItem>
                      <SelectItem value="sophie_bernard">Sophie Bernard</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={alertChannelFilter} onValueChange={setAlertChannelFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Canal d'alerte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="in-app">In-app</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="teams">Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-3 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Les contenus visibles respectent vos droits (RBAC)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Enregistrer les filtres
                    </Button>
                    <Button variant="ghost" size="sm">
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Grid (3x3) - DB-1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
              {/* KPI 1: Contrats à valider */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-[#0F2A43]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-8 h-8 text-[#0F2A43]" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.contractsToValidate)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.contractsToValidate)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#0F2A43]">{kpiData.contractsToValidate}</div>
                  <p className="text-sm text-gray-600">Contrats à valider</p>
                  <p className="text-xs text-gray-400 mt-1">Aucun contrat n'est actif sans validation</p>
                </CardContent>
              </Card>

              {/* KPI 2: Avenants à valider */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-[#C9A646]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Edit className="w-8 h-8 text-[#C9A646]" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.amendmentsToValidate)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.amendmentsToValidate)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#C9A646]">{kpiData.amendmentsToValidate}</div>
                  <p className="text-sm text-gray-600">Avenants à valider</p>
                  <p className="text-xs text-gray-400 mt-1">Seuls les avenants validés impactent le contrat</p>
                </CardContent>
              </Card>

              {/* KPI 3: Résiliations à valider */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <XCircle className="w-8 h-8 text-red-500" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.terminationsToValidate)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.terminationsToValidate)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{kpiData.terminationsToValidate}</div>
                  <p className="text-sm text-gray-600">Résiliations à valider</p>
                  <p className="text-xs text-gray-400 mt-1">Motif obligatoire + SLA</p>
                </CardContent>
              </Card>

              {/* KPI 4: Indexations à valider */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-[#0F2A43]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-[#0F2A43]" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.indexationsToValidate)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.indexationsToValidate)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#0F2A43]">{kpiData.indexationsToValidate}</div>
                  <p className="text-sm text-gray-600">Indexations à valider</p>
                  <p className="text-xs text-gray-400 mt-1">+ Revalorisations auto détectées</p>
                </CardContent>
              </Card>

              {/* KPI 5: Échéances ≤ 30 jours */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-amber-500" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.deadlinesIn30Days)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.deadlinesIn30Days)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{kpiData.deadlinesIn30Days}</div>
                  <p className="text-sm text-gray-600">Échéances ≤ 30 jours</p>
                  <p className="text-xs text-gray-400 mt-1">Fin contrat, anniversaires, fin avenant</p>
                </CardContent>
              </Card>

              {/* KPI 6: Alertes critiques non lues */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.criticalAlerts)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.criticalAlerts)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{kpiData.criticalAlerts}</div>
                  <p className="text-sm text-gray-600">Alertes critiques non lues</p>
                  <p className="text-xs text-gray-400 mt-1">Workflow &gt; 24h, refus, erreurs</p>
                </CardContent>
              </Card>

              {/* KPI 7: Erreurs d'intégration SAP */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Database className="w-8 h-8 text-orange-500" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.integrationErrors)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.integrationErrors)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{kpiData.integrationErrors}</div>
                  <p className="text-sm text-gray-600">Erreurs d'intégration (SAP)</p>
                  <p className="text-xs text-gray-400 mt-1">Statuts non poussés</p>
                </CardContent>
              </Card>

              {/* KPI 8: Contrats sans PJ */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Paperclip className="w-8 h-8 text-gray-500" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.contractsWithoutAttachments)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.contractsWithoutAttachments)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{kpiData.contractsWithoutAttachments}</div>
                  <p className="text-sm text-gray-600">Contrats "à valider" sans PJ</p>
                  <p className="text-xs text-gray-400 mt-1">Blocage conformité - PJ obligatoire</p>
                </CardContent>
              </Card>

              {/* KPI 9: Mises à jour manuelles */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <RefreshCw className="w-8 h-8 text-indigo-500" />
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpiData.trends.manualUpdates)}
                      <span className="text-xs text-gray-500">{Math.abs(kpiData.trends.manualUpdates)}%</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{kpiData.manualUpdates}</div>
                  <p className="text-sm text-gray-600">Mises à jour manuelles en attente</p>
                  <p className="text-xs text-gray-400 mt-1">Modif. montants exceptionnelles</p>
                </CardContent>
              </Card>
            </div>

            {/* Widgets Grid (2 columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* W1 - File de validation unifiée */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>W1 — File de validation (toutes natures)</CardTitle>
                  <CardDescription>
                    Aucune modification bloquante n'est appliquée sans validation ; rejet motivé obligatoire
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-3 lg:mx-0">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Contrat</TableHead>
                          <TableHead>Champs impactés</TableHead>
                          <TableHead>Demandeur</TableHead>
                          <TableHead>Valideur assigné</TableHead>
                          <TableHead>Échéance SLA</TableHead>
                          <TableHead>Âge</TableHead>
                          <TableHead>Dernière action</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationQueue.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant="outline">
                                {item.type === 'contract' && 'Contrat'}
                                {item.type === 'amendment' && 'Avenant'}
                                {item.type === 'indexation' && 'Indexation'}
                                {item.type === 'termination' && 'Résiliation'}
                                {item.type === 'amount' && 'Montant'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.contractNumber}</div>
                                <div className="text-xs text-gray-500">{item.contractTitle}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{item.impactedFields}</TableCell>
                            <TableCell>{item.requestedBy}</TableCell>
                            <TableCell>{item.assignedValidator}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Timer className="w-3 h-3 text-amber-500" />
                                <span className="text-sm">{formatDateTime(item.slaDue)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{item.age}h</TableCell>
                            <TableCell className="text-sm">{item.lastAction}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedValidationItem(item);
                                    setShowValidationModal(true);
                                    setValidationDecision('validate');
                                  }}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedValidationItem(item);
                                    setShowValidationModal(true);
                                    setValidationDecision('reject');
                                  }}
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Voir détails
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Send className="w-4 h-4 mr-2" />
                                      Transférer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* W2 - Échéances à venir */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>W2 — Échéances à venir (30 j)</CardTitle>
                      <CardDescription>Fin de contrat, anniversaires, fin d'avenant</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <FileDown className="w-4 h-4 mr-2" />
                      Exporter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingDeadlines.map((deadline) => (
                      <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{deadline.contractNumber}</span>
                            {getDeadlineBadge(deadline.daysRemaining)}
                          </div>
                          <p className="text-sm text-gray-600">{deadline.contractTitle}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {deadline.type === 'contract_end' && 'Fin de contrat'}
                              {deadline.type === 'anniversary' && 'Anniversaire'}
                              {deadline.type === 'amendment_end' && "Fin d'avenant"}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              {deadline.alertChannel === 'email' && <Mail className="w-3 h-3" />}
                              {deadline.alertChannel === 'teams' && <MessageSquare className="w-3 h-3" />}
                              {deadline.alertChannel === 'in-app' && <Bell className="w-3 h-3" />}
                              {deadline.alertChannel}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatDate(deadline.date)}</div>
                          <Button variant="ghost" size="sm" className="mt-1">
                            Ouvrir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Mini Calendar */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Vue calendrier</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                        <div key={i} className="text-center text-gray-500 py-1">{day}</div>
                      ))}
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                        <div 
                          key={day} 
                          className={`text-center py-1 rounded ${
                            day === 7 || day === 15 || day === 30 
                              ? 'bg-amber-100 font-medium' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* W3 - Indexations synthèse */}
              <Card>
                <CardHeader>
                  <CardTitle>W3 — Indexations : synthèse</CardTitle>
                  <CardDescription>Détection automatique, indices dernière valeur connue</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <div className="text-2xl font-bold text-amber-600">8</div>
                      <div className="text-xs text-gray-600">À traiter ce mois</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">12</div>
                      <div className="text-xs text-gray-600">Validées (30 j)</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">2</div>
                      <div className="text-xs text-gray-600">Suspendues</div>
                    </div>
                  </div>

                  {/* Derniers indices */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Derniers indices récupérés</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">ICC</span>
                        <span className="font-medium">112.45</span>
                        <span className="text-xs text-gray-400">01/02/2024</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">SYNTEC</span>
                        <span className="font-medium">305.20</span>
                        <span className="text-xs text-gray-400">01/02/2024</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">ILC</span>
                        <span className="font-medium">128.67</span>
                        <span className="text-xs text-gray-400">15/01/2024</span>
                      </div>
                    </div>
                  </div>

                  {/* Rapports */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Rapports d'indexation récents</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Rapport_Q1_2024.pdf</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Export_Janvier.xlsx</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-4">
                    Accéder aux indexations
                  </Button>
                </CardContent>
              </Card>

              {/* W4 - Flux d'alertes */}
              <Card>
                <CardHeader>
                  <CardTitle>W4 — Flux d'alertes</CardTitle>
                  <CardDescription>Timeline des événements clés</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {alertsFeed.map((alert) => (
                        <div key={alert.id} className="border-l-2 border-gray-200 pl-4 pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {alert.severity === 'critical' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                {alert.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                {alert.severity === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                                <span className="text-xs text-gray-500">{formatDateTime(alert.timestamp)}</span>
                              </div>
                              <p className="text-sm font-medium">{alert.message}</p>
                              {alert.contractNumber && (
                                <p className="text-xs text-gray-500 mt-1">Contrat : {alert.contractNumber}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <Badge 
                                  variant={alert.sendStatus === 'failed' ? 'destructive' : 'secondary'} 
                                  className={alert.sendStatus === 'sent' ? 'bg-green-100 text-green-700 text-xs' : 'text-xs'}>
                                  {alert.channel}
                                </Badge>
                                {!alert.readStatus && (
                                  <Badge variant="outline" className="text-xs">Non lu</Badge>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Check className="w-4 h-4 mr-2" />
                                  Marquer comme lu
                                </DropdownMenuItem>
                                {alert.sendStatus === 'failed' && (
                                  <DropdownMenuItem>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Relancer l'envoi
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ouvrir le contexte
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* W5 - Répartition par état */}
              <Card>
                <CardHeader>
                  <CardTitle>W5 — Répartition par état</CardTitle>
                  <CardDescription>Cliquez sur un segment pour filtrer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-4">
                    {/* Simple Donut Chart Representation */}
                    <div className="relative w-48 h-48">
                      <svg className="w-48 h-48 transform -rotate-90">
                        <circle cx="96" cy="96" r="64" fill="none" stroke="#e5e7eb" strokeWidth="32" />
                        <circle cx="96" cy="96" r="64" fill="none" stroke="#3b82f6" strokeWidth="32" 
                          strokeDasharray={`${statusDistribution[2].percentage * 4.02} 402`} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold">125</div>
                          <div className="text-sm text-gray-500">Total</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {statusDistribution.map((item) => (
                      <button 
                        key={item.status}
                        className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                        onClick={() => setStatusFilter(item.status.toLowerCase())}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            item.status === 'Actif' ? 'bg-blue-500' :
                            item.status === 'À valider' ? 'bg-amber-500' :
                            item.status === 'Brouillon' ? 'bg-gray-400' :
                            item.status === 'Résilié' ? 'bg-red-500' :
                            'bg-purple-500'
                          }`} />
                          <span className="text-sm">{item.status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.count}</span>
                          <span className="text-xs text-gray-500">({item.percentage}%)</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* W6 - Dernières actions (24h) */}
              <Card>
                <CardHeader>
                  <CardTitle>W6 — Dernières actions (24 h)</CardTitle>
                  <CardDescription>Fil d'historisation non modifiable</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="border-b pb-3">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium">{log.user}</span>
                            </div>
                            <span className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{log.action}</p>
                          {log.fields && (
                            <div className="text-xs bg-gray-50 p-2 rounded">
                              <div>Champs : {log.fields}</div>
                              {log.before && <div>Avant : {log.before}</div>}
                              {log.after && <div>Après : {log.after}</div>}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-mono text-gray-400">Trace-ID: {log.traceId}</span>
                            {log.contractNumber && (
                              <Button variant="ghost" size="sm" className="text-xs">
                                {log.contractNumber}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* W7 - Conformité documentaire */}
              <Card>
                <CardHeader>
                  <CardTitle>W7 — Conformité documentaire</CardTitle>
                  <CardDescription>Contrats "à valider" sans PJ obligatoire</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Une PJ est obligatoire pour valider ces contrats
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    {contractsWithoutAttachments.map((contract) => (
                      <div key={contract.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-sm">{contract.number}</div>
                            <div className="text-sm text-gray-600">{contract.title}</div>
                          </div>
                          <Badge variant="destructive" className="text-xs">PJ manquante</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div>
                            <span>Type requis : </span>
                            <span className="font-medium">{contract.requiredType}</span>
                          </div>
                          <div>
                            <span>À uploader par : </span>
                            <span className="font-medium">{contract.uploadAuthor}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Plus className="w-3 h-3 mr-1" />
                            Ajouter PJ
                          </Button>
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500">
                    Formats autorisés : PDF, DOCX, JPG • Max 10 MB
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer with shortcuts */}
            <div className="mt-6 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Raccourcis :</span>
                  <Button variant="outline" size="sm">
                    <FileDown className="w-4 h-4 mr-2" />
                    Exports
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Paramétrages
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Rappel RBAC : Visibilité selon vos droits
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {validationDecision === 'validate' ? 'Valider' : 'Rejeter'} l'élément
            </DialogTitle>
            <DialogDescription>
              Les décisions sont tracées et ne peuvent être modifiées
            </DialogDescription>
          </DialogHeader>

          {selectedValidationItem && (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Résumé</h4>
                  <div className="text-sm space-y-1">
                    <div>Type : {selectedValidationItem.type}</div>
                    <div>Contrat : {selectedValidationItem.contractNumber}</div>
                    <div>Champs impactés : {selectedValidationItem.impactedFields}</div>
                    <div>Demandeur : {selectedValidationItem.requestedBy}</div>
                  </div>
                </div>

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
                      Motif du rejet (obligatoire)
                    </Label>
                    <Textarea 
                      id="rejection-reason"
                      placeholder="Expliquez la raison du rejet..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Toutes les décisions sont journalisées et non modifiables
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowValidationModal(false)}>
                  Annuler
                </Button>
                <Button 
                  variant={validationDecision === 'validate' ? 'default' : 'destructive'}
                  onClick={() => {
                    if (validationDecision === 'reject' && !rejectionReason) {
                      return;
                    }
                    setShowValidationModal(false);
                    setValidationDecision('validate');
                    setRejectionReason("");
                  }}
                  disabled={validationDecision === 'reject' && !rejectionReason}
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