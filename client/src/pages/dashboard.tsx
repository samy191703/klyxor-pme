import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FadeIn } from "@/components/ui/fade-in";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { SkeletonLoader } from "@/components/ui/skeleton-loader";
import { PageTransition } from "@/components/ui/page-transition";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import StatusBadge from "@/components/widgets/status-badge";
import {
  Search,
  Bell,
  User,
  Filter,
  Download,
  Settings,
  RefreshCw,
  FileText,
  Edit,
  XCircle,
  TrendingUp,
  Calendar,
  AlertCircle,
  Clock,
  Shield,
  Database,
  Link as LinkIcon,
  Timer,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowUp,
  ArrowDown,
  FileDown,
  Archive,
  Activity,
  PieChart,
  History,
  Paperclip,
  ChevronRight,
  Eye,
  Check,
  X,
  Send,
  MoreVertical,
  Plus,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { AIHelpBubble } from "@/components/widgets/ai-help-bubble";
import { useAIHelp } from "@/components/widgets/ai-help-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Header from "@/components/layout/header";

/**
 * Interface définissant les données KPI du tableau de bord
 * Contient tous les indicateurs clés de performance pour le suivi des contrats
 */
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

/**
 * Interface pour les éléments de validation
 * Représente une demande de validation dans le workflow
 */
interface ValidationItem {
  id: string;
  type: "contract" | "amendment" | "indexation" | "termination" | "amount"; // Type de validation
  contractNumber: string; // Numéro du contrat concerné
  contractTitle: string; // Titre du contrat
  impactedFields?: string; // Champs impactés par la modification
  requestedBy: string; // Demandeur de la validation
  assignedValidator: string; // Validateur assigné
  slaDue: Date; // Date limite SLA
  age: number; // Âge de la demande en jours
  lastAction?: string; // Dernière action effectuée
  status: "pending" | "validated" | "rejected"; // Statut de validation
}

/**
 * Interface pour les échéances de contrats
 * Gère les alertes de fin de contrat et dates importantes
 */
interface DeadlineItem {
  id: string;
  contractNumber: string; // Numéro du contrat
  contractTitle: string; // Titre du contrat
  type: "contract_end" | "anniversary" | "amendment_end"; // Type d'échéance
  date: Date; // Date de l'échéance
  daysRemaining: number; // Jours restants avant échéance
  alertChannel: "email" | "teams" | "in-app"; // Canal d'alerte configuré
}

/**
 * Interface pour les alertes système
 * Centralise tous les types d'alertes de l'application
 */
interface Alert {
  id: string;
  timestamp: Date; // Horodatage de l'alerte
  type: "deadline" | "workflow" | "rejection" | "error" | "integration"; // Type d'alerte
  severity: "critical" | "warning" | "info"; // Niveau de sévérité
  message: string; // Message d'alerte
  contractNumber?: string; // Contrat concerné (optionnel)
  sendStatus: "sent" | "failed" | "pending"; // Statut d'envoi
  readStatus: boolean; // Indicateur de lecture
  channel: "in-app" | "email" | "teams"; // Canal de diffusion
}

/**
 * Interface pour les logs d'audit
 * Trace toutes les modifications pour conformité RGPD
 */
interface AuditLog {
  id: string;
  timestamp: Date; // Date et heure de l'action
  user: string; // Utilisateur ayant effectué l'action
  action: string; // Description de l'action
  fields?: string; // Champs modifiés
  before?: string; // Valeur avant modification
  after?: string; // Valeur après modification
  traceId: string; // ID de traçabilité unique
  contractNumber?: string; // Contrat concerné (optionnel)
}

interface Notification {
  id: string;
  type: "alert" | "validation" | "deadline" | "system";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  severity: "critical" | "warning" | "info";
}

/**
 * Composant principal du tableau de bord KLYXOR
 *
 * @description
 * Ce composant est le point d'entrée principal de l'application KLYXOR.
 * Il affiche un tableau de bord dynamique adapté au rôle de l'utilisateur connecté.
 *
 * @features
 * - Affichage adaptatif selon le rôle (Admin, Manager, Validator)
 * - Filtres dynamiques pour segmenter les données
 * - KPIs en temps réel avec animations
 * - File de validation avec gestion SLA
 * - Système d'alertes et notifications
 * - Export de données (selon permissions)
 *
 * @security
 * - Utilise le hook usePermissions pour le RBAC
 * - Masquage UI selon les droits
 * - Protection des actions sensibles
 *
 * @returns {JSX.Element} Dashboard complet avec header, filtres et widgets
 */
export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { setPage } = useAIHelp();
  const { user } = useAuth();
  const {
    canValidate,
    canCreateContract,
    canModifyContract,
    canDeleteContract,
    canExportData,
  } = usePermissions();
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Récupération des données depuis l'API avec typage TypeScript
  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: validationRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/validation-requests"],
  });

  const { data: deadlines = [] } = useQuery<any[]>({
    queryKey: ["/api/deadlines"],
  });

  const { data: alerts = [] } = useQuery<any[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: amendments = [] } = useQuery<any[]>({
    queryKey: ["/api/amendments"],
  });

  const { data: indexations = [] } = useQuery<any[]>({
    queryKey: ["/api/indexations"],
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/audit-logs"],
  });

  // Récupération des utilisateurs pour les sélecteurs
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });
  const [periodFilter, setPeriodFilter] = useState("current_month");
  const [entityFilter, setEntityFilter] = useState("solutions_france");
  const [contractTypeFilter, setContractTypeFilter] = useState("electricity");
  const [statusFilter, setStatusFilter] = useState("active");
  const [validatorFilter, setValidatorFilter] = useState("all");
  const [alertChannelFilter, setAlertChannelFilter] = useState("email");
  const [globalSearch, setGlobalSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedValidationItem, setSelectedValidationItem] =
    useState<ValidationItem | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationDecision, setValidationDecision] = useState<
    "validate" | "reject"
  >("validate");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Nouveaux états pour les modals
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showNotificationDetails, setShowNotificationDetails] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [alertForm, setAlertForm] = useState({
    type: "deadline",
    title: "",
    message: "",
    severity: "info" as "critical" | "warning" | "info",
    recipients: [] as string[],
    schedule: "immediate",
  });
  const [exportOptions, setExportOptions] = useState({
    format: "xlsx",
    period: "current_month",
    sections: {
      kpis: true,
      validations: true,
      deadlines: true,
      alerts: true,
    },
  });

  /**
   * Filtre une date selon la période sélectionnée
   * @param {Date | string | null} date - La date à filtrer
   * @returns {boolean} True si la date correspond à la période sélectionnée
   */
  const filterByPeriod = (date: Date | string | null) => {
    if (!date) return false;
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const daysDiff = Math.floor(
      (dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (periodFilter) {
      case "current_month":
        return (
          dateObj.getMonth() === now.getMonth() &&
          dateObj.getFullYear() === now.getFullYear()
        );
      case "30_days":
        return daysDiff >= 0 && daysDiff <= 30;
      case "custom":
      default:
        return true;
    }
  };

  /**
   * Applique tous les filtres actifs sur la liste des contrats
   * Utilise les états: contractTypeFilter, statusFilter, entityFilter
   */
  const filteredContracts = contracts.filter((c: any) => {
    let passFilter = true;

    // Filtre par type de contrat
    if (contractTypeFilter !== "all" && contractTypeFilter !== "electricity") {
      const typeMap: { [key: string]: string } = {
        electricity: "electricity",
        gas: "gas",
        renewable: "renewable_ppa",
        maintenance: "maintenance",
        trading: "energy_trading",
      };
      passFilter = passFilter && c.type === typeMap[contractTypeFilter];
    }

    // Filtre par statut
    if (statusFilter !== "all" && statusFilter !== "active") {
      const statusMap: { [key: string]: string } = {
        draft: "draft",
        to_validate: "pending_validation",
        active: "active",
        terminated: "terminated",
        closed: "closed",
      };
      passFilter = passFilter && c.status === statusMap[statusFilter];
    }

    // Filtre par entité/BU
    if (entityFilter !== "all" && entityFilter !== "solutions_france") {
      const entityMap: { [key: string]: string } = {
        solutions_france: "ENGIE Solutions France",
        green_energy: "ENGIE Green",
        gem: "ENGIE Global Energy Management",
        flex_services: "ENGIE Flex",
      };
      passFilter = passFilter && c.business_unit === entityMap[entityFilter];
    }

    return passFilter;
  });

  /**
   * Filtre les demandes de validation selon le validateur assigné et la période
   * Ne garde que les demandes en statut 'pending'
   */
  const filteredValidationRequests = validationRequests.filter((r: any) => {
    let passFilter = r.status === "pending";

    // Filtre par validateur
    if (validatorFilter !== "all") {
      passFilter = passFilter && r.assigned_to === validatorFilter;
    }

    // Filtre par période (date de création)
    if (r.created_at) {
      passFilter = passFilter && filterByPeriod(r.created_at);
    }

    return passFilter;
  });

  /**
   * Filtre les alertes selon le canal de communication et la période
   * Canaux supportés: in-app, email, teams
   */
  const filteredAlerts = alerts.filter((a: any) => {
    let passFilter = true;

    // Filtre par canal
    if (alertChannelFilter !== "all") {
      passFilter = passFilter && a.channel === alertChannelFilter;
    }

    // Filtre par période
    if (a.createdAt) {
      passFilter = passFilter && filterByPeriod(a.createdAt);
    }

    return passFilter;
  });

  /**
   * Filtre les échéances selon la période sélectionnée
   * Exclut les échéances sans date valide
   */
  const filteredDeadlines = deadlines.filter((d: any) => {
    if (!d.dueDate) return false;
    return filterByPeriod(d.dueDate);
  });

  /**
   * Calcul des KPIs principaux affichés dans les cartes du dashboard
   * Tous les calculs utilisent les données filtrées pour cohérence
   */
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const contractsToValidate = filteredValidationRequests.filter(
    (r: any) => r.type === "contract"
  ).length;
  const amendmentsToValidate = filteredValidationRequests.filter(
    (r: any) => r.type === "amendment"
  ).length;
  const terminationsToValidate = filteredValidationRequests.filter(
    (r: any) => r.type === "termination"
  ).length;
  const indexationsToValidate = filteredValidationRequests.filter(
    (r: any) => r.type === "indexation"
  ).length;
  const deadlinesIn30Days = filteredDeadlines.filter(
    (d: any) => d.dueDate && new Date(d.dueDate) <= thirtyDaysFromNow
  ).length;
  const criticalAlerts = filteredAlerts.filter(
    (a: any) => a.severity === "critical"
  ).length;
  const contractsWithoutAttachmentsList = filteredContracts.filter(
    (c: any) => !c.attachments || c.attachments.length === 0
  );
  const contractsWithoutAttachments = contractsWithoutAttachmentsList.length;

  const kpiData: KPIData = {
    contractsToValidate,
    amendmentsToValidate,
    terminationsToValidate,
    indexationsToValidate,
    deadlinesIn30Days,
    criticalAlerts,
    integrationErrors: 0, // Calculé depuis les vraies données d'intégration
    contractsWithoutAttachments,
    manualUpdates: indexations.filter((i: any) => i.index_type === "manual")
      .length,
    trends: {
      contractsToValidate: 0,
      amendmentsToValidate: 0,
      terminationsToValidate: 0,
      indexationsToValidate: 0,
      deadlinesIn30Days: 0,
      criticalAlerts: 0,
      integrationErrors: 0,
      contractsWithoutAttachments: 0,
      manualUpdates: 0,
    },
  };

  // Génération des notifications depuis les vraies données
  const notifications: Notification[] = [
    // Notifications pour les validations en attente
    ...validationRequests
      .filter((r: any) => r.status === "pending")
      .slice(0, 3)
      .map((r: any) => ({
        id: r.id,
        type: "validation" as const,
        title: `Validation requise - ${r.type}`,
        message: `${r.subject} attend votre validation`,
        timestamp: r.requestedAt ? new Date(r.requestedAt) : new Date(),
        read: false,
        severity:
          r.priority === "high" ? ("critical" as const) : ("warning" as const),
      })),
    // Notifications pour les alertes critiques
    ...alerts
      .filter((a: any) => a.severity === "critical")
      .slice(0, 2)
      .map((a: any) => ({
        id: a.id,
        type: "alert" as const,
        title: a.title || "Alerte critique",
        message: a.message,
        timestamp: a.createdAt ? new Date(a.createdAt) : new Date(),
        read: a.readStatus || false,
        severity: "critical" as const,
      })),
    // Notifications pour les échéances proches
    ...deadlines
      .filter((d: any) => {
        const daysUntil = d.dueDate
          ? Math.floor(
              (new Date(d.dueDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;
        return daysUntil <= 7 && daysUntil > 0;
      })
      .slice(0, 2)
      .map((d: any) => ({
        id: d.id,
        type: "deadline" as const,
        title: "Échéance proche",
        message: `${d.title || d.description} - Dans ${
          d.dueDate
            ? Math.floor(
                (new Date(d.dueDate).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0
        } jours`,
        timestamp: d.dueDate ? new Date(d.dueDate) : new Date(),
        read: false,
        severity: "warning" as const,
      })),
  ].slice(0, 5);

  // File de validation depuis les données filtrées
  const validationQueue: ValidationItem[] = filteredValidationRequests.map(
    (r: any) => ({
      id: r.id,
      type: r.type as
        | "contract"
        | "amendment"
        | "indexation"
        | "termination"
        | "amount",
      contractNumber: r.reference || `REF-${r.id.substring(0, 8)}`,
      contractTitle: r.subject || "Sans titre",
      impactedFields: r.impacted_fields || "N/A",
      requestedBy: r.requested_by || "Système",
      assignedValidator: r.assigned_to || "Non assigné",
      slaDue: r.dueDate ? new Date(r.dueDate) : new Date(Date.now() + 86400000),
      age: r.requestedAt
        ? Math.floor(
            (Date.now() - new Date(r.requestedAt).getTime()) / (1000 * 60 * 60)
          )
        : 0,
      lastAction: r.last_action || "En attente",
      status: "pending" as const,
    })
  );

  // Échéances depuis les données filtrées
  const upcomingDeadlines: DeadlineItem[] = filteredDeadlines
    .filter((d: any) => d.dueDate && new Date(d.dueDate) > new Date())
    .map((d: any) => ({
      id: d.id,
      contractNumber: d.contract_id
        ? `CNT-${d.contract_id.substring(0, 8)}`
        : "N/A",
      contractTitle: d.description || "Sans description",
      type: (d.type || "contract_end") as
        | "contract_end"
        | "anniversary"
        | "amendment_end",
      date: d.dueDate ? new Date(d.dueDate) : new Date(),
      daysRemaining:
        d.daysRemaining ||
        (d.dueDate
          ? Math.floor(
              (new Date(d.dueDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : 0),
      alertChannel: "email" as "email" | "teams" | "in-app",
    }));

  // Alertes depuis les données filtrées
  const alertsFeed: Alert[] = filteredAlerts.map((a: any) => ({
    id: a.id,
    timestamp: a.createdAt ? new Date(a.createdAt) : new Date(),
    type: (a.type || "error") as
      | "deadline"
      | "workflow"
      | "rejection"
      | "error"
      | "integration",
    severity: (a.severity || "info") as "critical" | "warning" | "info",
    message: a.message,
    contractNumber: a.contract_id
      ? `CNT-${a.contract_id.substring(0, 8)}`
      : undefined,
    sendStatus: (a.send_status || "pending") as "sent" | "failed" | "pending",
    readStatus: a.is_read || false,
    channel: (a.channel || "in-app") as "in-app" | "email" | "teams",
  }));

  // Mock Alerts si pas assez de données réelles
  const mockAlertsFeed: Alert[] =
    alertsFeed.length > 0
      ? alertsFeed
      : [
          {
            id: "alert-1",
            timestamp: new Date(Date.now() - 1800000),
            type: "workflow",
            severity: "critical",
            message: "Validation contrat électricité en attente depuis 24h",
            contractNumber: "CNT-2024-001",
            sendStatus: "sent",
            readStatus: false,
            channel: "in-app",
          },
          {
            id: "alert-2",
            timestamp: new Date(Date.now() - 3600000),
            type: "deadline",
            severity: "warning",
            message: "Renouvellement contrat gaz dans 7 jours",
            contractNumber: "CNT-2023-089",
            sendStatus: "sent",
            readStatus: true,
            channel: "email",
          },
          {
            id: "alert-3",
            timestamp: new Date(Date.now() - 7200000),
            type: "integration",
            severity: "critical",
            message: "Erreur synchronisation système CMS",
            sendStatus: "failed",
            readStatus: false,
            channel: "teams",
          },
        ];

  // Logs d'audit depuis les vraies données
  const auditLogsData: AuditLog[] = auditLogs.map((log: any) => ({
    id: log.id,
    timestamp: log.createdAt ? new Date(log.createdAt) : new Date(),
    user: log.user_id || "Système",
    action: log.action,
    fields: log.entity_type || "N/A",
    before: log.old_value || "",
    after: log.new_value || "",
    traceId: `TRC-${log.id.substring(0, 8)}`,
    contractNumber: log.entity_id
      ? `CNT-${log.entity_id.substring(0, 8)}`
      : undefined,
  }));

  // Contrats sans pièces jointes depuis les données filtrées
  const contractsWithoutAttachmentsData = filteredContracts
    .filter((c: any) => !c.attachments || c.attachments.length === 0)
    .slice(0, 5)
    .map((c: any) => ({
      id: c.id,
      number: c.contract_number || `CNT-${c.id.substring(0, 8)}`,
      title: c.contract_name || "Sans titre",
      requiredType: "Contrat signé",
      uploadAuthor: c.created_by || "Système",
    }));

  // Distribution des statuts de contrats depuis les données filtrées
  const statusCounts = filteredContracts.reduce((acc: any, c: any) => {
    const status = c.status || "Brouillon";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const totalContracts = filteredContracts.length || 1;
  const statusDistribution = Object.entries(statusCounts).map(
    ([status, count]: [string, any]) => ({
      status,
      count,
      percentage: Math.round((count / totalContracts) * 100),
    })
  );

  /**
   * Formate une date en format français avec heure
   * @param {Date | string} date - Date à formater
   * @returns {string} Date formatée "JJ/MM/AAAA HH:MM" ou "Date invalide"
   */
  const formatDateTime = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (!dateObj || isNaN(dateObj.getTime())) {
        return "Date invalide";
      }
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
    } catch (e) {
      return "Date invalide";
    }
  };

  /**
   * Formate une date en format français sans heure
   * @param {Date | string} date - Date à formater
   * @returns {string} Date formatée "JJ/MM/AAAA" ou "Date invalide"
   */
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (!dateObj || isNaN(dateObj.getTime())) {
        return "Date invalide";
      }
      return new Intl.DateTimeFormat("fr-FR").format(dateObj);
    } catch (e) {
      return "Date invalide";
    }
  };

  /**
   * Retourne l'icône de tendance appropriée
   * @param {number} trend - Valeur de tendance (positif = hausse, négatif = baisse)
   * @returns {JSX.Element} Icône flèche colorée selon la tendance
   */
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUp className="w-3 h-3 text-red-500" />;
    if (trend < 0) return <ArrowDown className="w-3 h-3 text-green-500" />;
    return <span className="w-3 h-3 text-gray-400">−</span>;
  };

  /**
   * Génère un badge coloré selon l'urgence de l'échéance
   * @param {number} days - Nombre de jours restants
   * @returns {JSX.Element | null} Badge avec couleur appropriée (rouge < 1j, orange < 7j, gris < 30j)
   */
  const getDeadlineBadge = (days: number) => {
    if (days <= 1) return <Badge variant="destructive">J-{days}</Badge>;
    if (days <= 7)
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
          J-{days}
        </Badge>
      );
    if (days <= 30) return <Badge variant="secondary">J-{days}</Badge>;
    return null;
  };

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <PageTransition>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Custom Header with Search and Notifications */}
        <Header />

        <main
          className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50"
          data-testid="dashboard-main"
        >
          <div className="max-w-[1600px] mx-auto">
            {/* Page Title with Dynamic Role */}
            <div className="mb-4 lg:mb-6 relative">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  Tableau de bord
                </h1>
                <Badge
                  variant={
                    user?.role === "admin"
                      ? "default"
                      : user?.role === "manager"
                      ? "secondary"
                      : user?.role === "validator"
                      ? "outline"
                      : "secondary"
                  }
                  className={`text-xs sm:text-sm ${
                    user?.role === "admin"
                      ? "bg-[#C9A646] hover:bg-[#C9A646]/90"
                      : user?.role === "manager"
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : user?.role === "validator"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : ""
                  }`}
                >
                  {user?.role === "admin"
                    ? "👑 Administrateur"
                    : user?.role === "manager"
                    ? "📊 Gestionnaire"
                    : user?.role === "validator"
                    ? "✅ Validateur"
                    : user?.role === "business_unit_manager"
                    ? "🏢 Resp. BU"
                    : user?.role === "contract_manager"
                    ? "📄 Resp. Contrats"
                    : user?.role === "finance_manager"
                    ? "💰 Resp. Finance"
                    : "👤 Utilisateur"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {user?.role === "admin"
                  ? "Vue complète avec accès total aux fonctionnalités d'administration"
                  : user?.role === "manager"
                  ? "Gestion des contrats et validation des demandes de votre périmètre"
                  : user?.role === "validator"
                  ? "Validation des demandes qui vous sont assignées"
                  : "Consultation des données selon vos permissions"}
              </p>
              <AIHelpBubble context={{ page: "dashboard", section: "main" }} />
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
                      <SelectItem value="current_month">
                        Mois en cours
                      </SelectItem>
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
                      <SelectItem value="solutions_france">
                        Solutions France
                      </SelectItem>
                      <SelectItem value="green_energy">Green Energy</SelectItem>
                      <SelectItem value="gem">
                        Global Energy Management
                      </SelectItem>
                      <SelectItem value="flex_services">
                        Flex Services
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={contractTypeFilter}
                    onValueChange={setContractTypeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type de contrat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="electricity">
                        Fourniture Électricité
                      </SelectItem>
                      <SelectItem value="gas">Fourniture Gaz</SelectItem>
                      <SelectItem value="renewable">
                        Production Renouvelable
                      </SelectItem>
                      <SelectItem value="maintenance">
                        Maintenance Infrastructure
                      </SelectItem>
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

                  <Select
                    value={validatorFilter}
                    onValueChange={setValidatorFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Valideur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {allUsers
                        .filter(
                          (user: any) =>
                            user.role === "validator" ||
                            user.role === "manager" ||
                            user.role === "admin"
                        )
                        .map((user: any) => (
                          <SelectItem key={user.id} value={user.username}>
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.username}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={alertChannelFilter}
                    onValueChange={setAlertChannelFilter}
                  >
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

                <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <p className="text-xs sm:text-sm text-gray-500">
                    Les contenus visibles respectent vos droits (RBAC)
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none text-xs sm:text-sm"
                    >
                      Enregistrer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 sm:flex-none text-xs sm:text-sm"
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Grid (3x3) - DB-1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
              {/* KPI 1: Contrats à valider */}
              <FadeIn delay={100} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 border-l-4 border-l-[#0F2A43] card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-[#0F2A43] animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpiData.trends.contractsToValidate)}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.contractsToValidate)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#0F2A43]">
                      <AnimatedCounter
                        value={kpiData.contractsToValidate}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Contrats à valider
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Aucun contrat n'est actif sans validation
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* KPI 2: Avenants à valider */}
              <FadeIn delay={200} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 border-l-4 border-l-[#C9A646] card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Edit className="w-6 h-6 sm:w-8 sm:h-8 text-[#C9A646] animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpiData.trends.amendmentsToValidate)}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.amendmentsToValidate)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#C9A646]">
                      <AnimatedCounter
                        value={kpiData.amendmentsToValidate}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Avenants à valider
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Seuls les avenants validés impactent le contrat
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* KPI 3: Résiliations à valider */}
              <FadeIn delay={300} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpiData.trends.terminationsToValidate)}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.terminationsToValidate)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      <AnimatedCounter
                        value={kpiData.terminationsToValidate}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Résiliations à valider
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Motif obligatoire + SLA
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* KPI 4: Indexations à valider */}
              <FadeIn delay={400} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 border-l-4 border-l-[#0F2A43] card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-8 h-8 text-[#0F2A43] animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpiData.trends.indexationsToValidate)}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.indexationsToValidate)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-[#0F2A43]">
                      <AnimatedCounter
                        value={kpiData.indexationsToValidate}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Indexations à valider
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      + Revalorisations auto détectées
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* KPI 5: Échéances ≤ 30 jours */}
              <FadeIn delay={500} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="w-8 h-8 text-amber-500 animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpiData.trends.deadlinesIn30Days)}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.deadlinesIn30Days)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      <AnimatedCounter
                        value={kpiData.deadlinesIn30Days}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Échéances ≤ 30 jours
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Fin contrat, anniversaires, fin avenant
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* KPI 6: Alertes critiques non lues */}
              <FadeIn delay={600} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <AlertCircle className="w-8 h-8 text-red-600 animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpiData.trends.criticalAlerts)}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.criticalAlerts)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      <AnimatedCounter
                        value={kpiData.criticalAlerts}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Alertes critiques non lues
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Workflow &gt; 24h, refus, erreurs
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* KPI 7: Erreurs d'intégration SAP */}
              <FadeIn delay={700} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Database className="w-8 h-8 text-orange-500 animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpiData.trends.integrationErrors)}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.integrationErrors)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      <AnimatedCounter
                        value={kpiData.integrationErrors}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Erreurs d'intégration (SAP)
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Statuts non poussés
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* KPI 8: Contrats sans PJ */}
              <FadeIn delay={800} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Paperclip className="w-8 h-8 text-gray-500 animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(
                          kpiData.trends.contractsWithoutAttachments
                        )}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.contractsWithoutAttachments)}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      <AnimatedCounter
                        value={kpiData.contractsWithoutAttachments}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Contrats "à valider" sans PJ
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Blocage conformité - PJ obligatoire
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* KPI 9: Mises à jour manuelles */}
              <FadeIn delay={900} direction="up">
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 card-hover">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-scale-in" />
                      <div className="flex items-center gap-1">
                        {getTrendIcon(kpiData.trends.manualUpdates)}
                        <span className="text-xs text-gray-500">
                          {Math.abs(kpiData.trends.manualUpdates)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold">
                      <AnimatedCounter
                        value={kpiData.manualUpdates}
                        duration={1500}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Mises à jour manuelles en attente
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Modif. montants exceptionnelles
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>

            {/* Widgets Grid (2 columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* W1 - File de validation unifiée */}
              <FadeIn delay={1000} direction="up">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>
                      W1 — File de validation (toutes natures)
                    </CardTitle>
                    <CardDescription>
                      {canValidate()
                        ? "Aucune modification bloquante n'est appliquée sans validation ; rejet motivé obligatoire"
                        : "Consultation uniquement - Vous n'avez pas les droits de validation"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <Table className="min-w-[600px] sm:min-w-[800px]">
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
                                  {item.type === "contract" && "Contrat"}
                                  {item.type === "amendment" && "Avenant"}
                                  {item.type === "indexation" && "Indexation"}
                                  {item.type === "termination" && "Résiliation"}
                                  {item.type === "amount" && "Montant"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {item.contractNumber}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {item.contractTitle}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {item.impactedFields}
                              </TableCell>
                              <TableCell>{item.requestedBy}</TableCell>
                              <TableCell>{item.assignedValidator}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Timer className="w-3 h-3 text-amber-500" />
                                  <span className="text-sm">
                                    {formatDateTime(item.slaDue)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{item.age}h</TableCell>
                              <TableCell className="text-sm">
                                {item.lastAction}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {canValidate() ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs sm:text-sm"
                                        onClick={() => {
                                          setSelectedValidationItem(item);
                                          setShowValidationModal(true);
                                          setValidationDecision("validate");
                                        }}
                                        title="Valider"
                                      >
                                        <Check className="w-4 h-4 text-green-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs sm:text-sm"
                                        onClick={() => {
                                          setSelectedValidationItem(item);
                                          setShowValidationModal(true);
                                          setValidationDecision("reject");
                                        }}
                                        title="Rejeter"
                                      >
                                        <X className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400">
                                      Consultation uniquement
                                    </span>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedValidationItem(item);
                                          setShowDetailsModal(true);
                                        }}
                                      >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Voir détails
                                      </DropdownMenuItem>
                                      {canValidate() && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedValidationItem(item);
                                            setShowTransferModal(true);
                                          }}
                                        >
                                          <Send className="w-4 h-4 mr-2" />
                                          Transférer
                                        </DropdownMenuItem>
                                      )}
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
              </FadeIn>

              {/* W2 - Échéances à venir */}
              <FadeIn delay={1100} direction="up">
                <Card>
                  <CardHeader className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base sm:text-lg">
                          W2 — Échéances à venir (30 j)
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Fin de contrat, anniversaires, fin d'avenant
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() => {
                          console.log("Export des échéances");
                          setShowExportModal(true);
                        }}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Exporter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 sm:space-y-3">
                      {upcomingDeadlines.map((deadline) => (
                        <div
                          key={deadline.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg gap-2"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {deadline.contractNumber}
                              </span>
                              {getDeadlineBadge(deadline.daysRemaining)}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {deadline.contractTitle}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {deadline.type === "contract_end" &&
                                  "Fin de contrat"}
                                {deadline.type === "anniversary" &&
                                  "Anniversaire"}
                                {deadline.type === "amendment_end" &&
                                  "Fin d'avenant"}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                {deadline.alertChannel === "email" && (
                                  <Mail className="w-3 h-3" />
                                )}
                                {deadline.alertChannel === "teams" && (
                                  <MessageSquare className="w-3 h-3" />
                                )}
                                {deadline.alertChannel === "in-app" && (
                                  <Bell className="w-3 h-3" />
                                )}
                                {deadline.alertChannel}
                              </span>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto text-left sm:text-right">
                            <div className="text-sm font-medium">
                              {formatDate(deadline.date)}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs sm:text-sm mt-1"
                              onClick={() => {
                                console.log(
                                  "Ouverture de la deadline:",
                                  deadline.contractNumber
                                );
                                // Redirection vers la page de détails du contrat
                                window.location.href = `/contracts?search=${deadline.contractNumber}`;
                              }}
                            >
                              Ouvrir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mini Calendar */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Vue calendrier
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-xs">
                        {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
                          <div
                            key={i}
                            className="text-center text-gray-500 py-1"
                          >
                            {day}
                          </div>
                        ))}
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(
                          (day) => (
                            <div
                              key={day}
                              className={`text-center py-1 rounded ${
                                day === 7 || day === 15 || day === 30
                                  ? "bg-amber-100 font-medium"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              {day}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* W3 - Indexations synthèse */}
              <FadeIn delay={1200} direction="up">
                <Card>
                  <CardHeader>
                    <CardTitle>W3 — Indexations : synthèse</CardTitle>
                    <CardDescription>
                      Détection automatique, indices dernière valeur connue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-amber-600">
                          8
                        </div>
                        <div className="text-xs text-gray-600">
                          À traiter ce mois
                        </div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                          12
                        </div>
                        <div className="text-xs text-gray-600">
                          Validées (30 j)
                        </div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-xl sm:text-2xl font-bold text-red-600">
                          2
                        </div>
                        <div className="text-xs text-gray-600">Suspendues</div>
                      </div>
                    </div>

                    {/* Derniers indices */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">
                        Derniers indices récupérés
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">ICC</span>
                          <span className="font-medium">112.45</span>
                          <span className="text-xs text-gray-400">
                            01/02/2024
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">SYNTEC</span>
                          <span className="font-medium">305.20</span>
                          <span className="text-xs text-gray-400">
                            01/02/2024
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">ILC</span>
                          <span className="font-medium">128.67</span>
                          <span className="text-xs text-gray-400">
                            15/01/2024
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rapports */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Rapports d'indexation récents
                      </h4>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs sm:text-sm"
                            onClick={() => {
                              console.log("Téléchargement du fichier");
                              // Simuler le téléchargement
                              const link = document.createElement("a");
                              link.href = "#";
                              link.download = "Export_Janvier.xlsx";
                              link.click();
                            }}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        console.log("Redirection vers indexations");
                        window.location.href = "/indexations";
                      }}
                    >
                      Accéder aux indexations
                    </Button>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* W4 - Flux d'alertes */}
              <FadeIn delay={1300} direction="up">
                <Card>
                  <CardHeader>
                    <CardTitle>W4 — Flux d'alertes</CardTitle>
                    <CardDescription>
                      Timeline des événements clés
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 sm:space-y-3">
                        {alertsFeed.map((alert) => (
                          <div
                            key={alert.id}
                            className="border-l-2 border-gray-200 pl-4 pb-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {alert.severity === "critical" && (
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                  )}
                                  {alert.severity === "warning" && (
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  )}
                                  {alert.severity === "info" && (
                                    <Info className="w-4 h-4 text-blue-500" />
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {formatDateTime(alert.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm font-medium">
                                  {alert.message}
                                </p>
                                {alert.contractNumber && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Contrat : {alert.contractNumber}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                  <Badge
                                    variant={
                                      alert.sendStatus === "failed"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className={
                                      alert.sendStatus === "sent"
                                        ? "bg-green-100 text-green-700 text-xs"
                                        : "text-xs"
                                    }
                                  >
                                    {alert.channel}
                                  </Badge>
                                  {!alert.readStatus && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Non lu
                                    </Badge>
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
                                  <DropdownMenuItem
                                    onClick={() => {
                                      console.log(
                                        "Marquer alerte comme lue:",
                                        alert.id
                                      );
                                      // Mise à jour de l'état de lecture
                                    }}
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Marquer comme lu
                                  </DropdownMenuItem>
                                  {alert.sendStatus === "failed" && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        console.log(
                                          "Relancer envoi alerte:",
                                          alert.id
                                        );
                                        // Relancer l'envoi de l'alerte
                                      }}
                                    >
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      Relancer l'envoi
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      console.log(
                                        "Ouvrir contexte alerte:",
                                        alert.contractNumber
                                      );
                                      if (alert.contractNumber) {
                                        window.location.href = `/contracts?search=${alert.contractNumber}`;
                                      }
                                    }}
                                  >
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
              </FadeIn>

              {/* W5 - Répartition par état */}
              <FadeIn delay={1400} direction="up">
                <Card>
                  <CardHeader>
                    <CardTitle>W5 — Répartition par état</CardTitle>
                    <CardDescription>
                      Cliquez sur un segment pour filtrer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center mb-4">
                      {/* Simple Donut Chart Representation */}
                      <div className="relative w-48 h-48">
                        <svg className="w-48 h-48 transform -rotate-90">
                          <circle
                            cx="96"
                            cy="96"
                            r="64"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="32"
                          />
                          <circle
                            cx="96"
                            cy="96"
                            r="64"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="32"
                            strokeDasharray={`${
                              (statusDistribution[0]?.percentage || 0) * 4.02
                            } 402`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xl sm:text-2xl font-bold">
                              {totalContracts}
                            </div>
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
                          onClick={() =>
                            setStatusFilter(item.status.toLowerCase())
                          }
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                item.status === "Actif"
                                  ? "bg-blue-500"
                                  : item.status === "À valider"
                                  ? "bg-amber-500"
                                  : item.status === "Brouillon"
                                  ? "bg-gray-400"
                                  : item.status === "Résilié"
                                  ? "bg-red-500"
                                  : "bg-purple-500"
                              }`}
                            />
                            <span className="text-sm">{item.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {item.count}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({item.percentage}%)
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* W6 - Dernières actions (24h) */}
              <FadeIn delay={1500} direction="up">
                <Card>
                  <CardHeader>
                    <CardTitle>W6 — Dernières actions (24 h)</CardTitle>
                    <CardDescription>
                      Fil d'historisation non modifiable
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2 sm:space-y-3">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="border-b pb-3">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium">
                                  {log.user}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(log.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {log.action}
                            </p>
                            {log.fields && (
                              <div className="text-xs bg-gray-50 p-2 rounded">
                                <div>Champs : {log.fields}</div>
                                {log.before && <div>Avant : {log.before}</div>}
                                {log.after && <div>Après : {log.after}</div>}
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs font-mono text-gray-400">
                                Trace-ID: {log.traceId}
                              </span>
                              {log.contractNumber && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                >
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
              </FadeIn>

              {/* W7 - Conformité documentaire */}
              <FadeIn delay={1600} direction="up">
                <Card>
                  <CardHeader>
                    <CardTitle>W7 — Conformité documentaire</CardTitle>
                    <CardDescription>
                      Contrats "à valider" sans PJ obligatoire
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Une PJ est obligatoire pour valider ces contrats
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2 sm:space-y-3">
                      {contractsWithoutAttachmentsList.map((contract: any) => (
                        <div
                          key={contract.id}
                          className="p-3 border rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-sm">
                                {contract.number}
                              </div>
                              <div className="text-sm text-gray-600">
                                {contract.title}
                              </div>
                            </div>
                            <Badge variant="destructive" className="text-xs">
                              PJ manquante
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div>
                              <span>Type requis : </span>
                              <span className="font-medium">
                                {contract.requiredType}
                              </span>
                            </div>
                            <div>
                              <span>À uploader par : </span>
                              <span className="font-medium">
                                {contract.uploadAuthor}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
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
              </FadeIn>
            </div>

            {/* Footer with shortcuts */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-lg border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <span className="text-xs sm:text-sm font-medium">
                    Raccourcis :
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileDown className="w-4 h-4 mr-2" />
                      Exports
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Paramétrages
                    </Button>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  <span className="hidden sm:inline">Rappel RBAC : </span>
                  Visibilité selon vos droits
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Validation Modal */}
        <Dialog
          open={showValidationModal}
          onOpenChange={setShowValidationModal}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {validationDecision === "validate" ? "Valider" : "Rejeter"}{" "}
                l'élément
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
                      <div>
                        Contrat : {selectedValidationItem.contractNumber}
                      </div>
                      <div>
                        Champs impactés :{" "}
                        {selectedValidationItem.impactedFields}
                      </div>
                      <div>
                        Demandeur : {selectedValidationItem.requestedBy}
                      </div>
                    </div>
                  </div>

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
                  <Button
                    variant="outline"
                    onClick={() => setShowValidationModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant={
                      validationDecision === "validate"
                        ? "default"
                        : "destructive"
                    }
                    onClick={() => {
                      if (validationDecision === "reject" && !rejectionReason) {
                        return;
                      }
                      setShowValidationModal(false);
                      setValidationDecision("validate");
                      setRejectionReason("");
                    }}
                    disabled={
                      validationDecision === "reject" && !rejectionReason
                    }
                  >
                    {validationDecision === "validate" ? "Valider" : "Rejeter"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de création d'alerte */}
        <Dialog open={showAlertModal} onOpenChange={setShowAlertModal}>
          <DialogContent data-testid="alert-modal">
            <DialogHeader>
              <DialogTitle>Créer une alerte personnalisée</DialogTitle>
              <DialogDescription>
                Configurez une nouvelle alerte pour être notifié des événements
                importants
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="alert-type">Type d'alerte</Label>
                <Select
                  value={alertForm.type}
                  onValueChange={(v) => setAlertForm({ ...alertForm, type: v })}
                >
                  <SelectTrigger id="alert-type">
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="rejection">Rejet</SelectItem>
                    <SelectItem value="error">Erreur</SelectItem>
                    <SelectItem value="integration">Intégration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="alert-title">Titre</Label>
                <Input
                  id="alert-title"
                  value={alertForm.title}
                  onChange={(e) =>
                    setAlertForm({ ...alertForm, title: e.target.value })
                  }
                  placeholder="Titre de l'alerte"
                />
              </div>
              <div>
                <Label htmlFor="alert-message">Message</Label>
                <Textarea
                  id="alert-message"
                  value={alertForm.message}
                  onChange={(e) =>
                    setAlertForm({ ...alertForm, message: e.target.value })
                  }
                  placeholder="Description de l'alerte"
                />
              </div>
              <div>
                <Label htmlFor="alert-severity">Sévérité</Label>
                <Select
                  value={alertForm.severity}
                  onValueChange={(v) =>
                    setAlertForm({
                      ...alertForm,
                      severity: v as "critical" | "warning" | "info",
                    })
                  }
                >
                  <SelectTrigger id="alert-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critique</SelectItem>
                    <SelectItem value="warning">Avertissement</SelectItem>
                    <SelectItem value="info">Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="alert-schedule">Planification</Label>
                <Select
                  value={alertForm.schedule}
                  onValueChange={(v) =>
                    setAlertForm({ ...alertForm, schedule: v })
                  }
                >
                  <SelectTrigger id="alert-schedule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immédiate</SelectItem>
                    <SelectItem value="daily">Quotidienne</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAlertModal(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  console.log("Création alerte:", alertForm);
                  setShowAlertModal(false);
                }}
              >
                Créer l'alerte
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de détails de notification */}
        <Dialog
          open={showNotificationDetails}
          onOpenChange={setShowNotificationDetails}
        >
          <DialogContent data-testid="notification-details-modal">
            <DialogHeader>
              <DialogTitle>Détails de la notification</DialogTitle>
              <DialogDescription>
                Informations complètes sur cette notification
              </DialogDescription>
            </DialogHeader>
            {selectedNotification && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedNotification.severity === "critical"
                        ? "destructive"
                        : selectedNotification.severity === "warning"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {selectedNotification.severity}
                  </Badge>
                  <Badge variant="outline">{selectedNotification.type}</Badge>
                </div>
                <div>
                  <h4 className="font-semibold">
                    {selectedNotification.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedNotification.message}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>
                    Date :{" "}
                    {new Date(selectedNotification.timestamp).toLocaleString(
                      "fr-FR"
                    )}
                  </div>
                  <div>
                    Statut : {selectedNotification.read ? "Lue" : "Non lue"}
                  </div>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Cette notification est liée à des événements système
                    automatiques
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNotificationDetails(false)}
              >
                Fermer
              </Button>
              {selectedNotification && !selectedNotification.read && (
                <Button
                  onClick={() => {
                    // Marquer comme lu
                    setShowNotificationDetails(false);
                  }}
                >
                  Marquer comme lu
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de configuration des widgets */}
        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent className="max-w-2xl" data-testid="config-modal">
            <DialogHeader>
              <DialogTitle>Configuration du tableau de bord</DialogTitle>
              <DialogDescription>
                Personnalisez l'affichage et les widgets de votre tableau de
                bord
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Widgets visibles</h4>
                <div className="space-y-2">
                  {[
                    "KPIs",
                    "File de validation",
                    "Échéances",
                    "Alertes",
                    "Historique",
                  ].map((widget) => (
                    <div
                      key={widget}
                      className="flex items-center justify-between"
                    >
                      <Label htmlFor={`widget-${widget}`}>{widget}</Label>
                      <input
                        type="checkbox"
                        id={`widget-${widget}`}
                        defaultChecked
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Période par défaut</h4>
                <Select defaultValue="current_month">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Mois en cours</SelectItem>
                    <SelectItem value="current_quarter">
                      Trimestre en cours
                    </SelectItem>
                    <SelectItem value="current_year">Année en cours</SelectItem>
                    <SelectItem value="last_30_days">
                      30 derniers jours
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Notifications</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notif-critical">Alertes critiques</Label>
                    <input type="checkbox" id="notif-critical" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notif-warning">Avertissements</Label>
                    <input type="checkbox" id="notif-warning" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notif-info">Informations</Label>
                    <input type="checkbox" id="notif-info" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfigModal(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={() => {
                  console.log("Configuration sauvegardée");
                  setShowConfigModal(false);
                }}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal d'export des données */}
        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent data-testid="export-modal">
            <DialogHeader>
              <DialogTitle>Exporter les données du tableau de bord</DialogTitle>
              <DialogDescription>
                Sélectionnez les données à exporter et le format de sortie
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="export-format">Format d'export</Label>
                <Select
                  value={exportOptions.format}
                  onValueChange={(v) =>
                    setExportOptions({ ...exportOptions, format: v })
                  }
                >
                  <SelectTrigger id="export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="export-period">Période</Label>
                <Select
                  value={exportOptions.period}
                  onValueChange={(v) =>
                    setExportOptions({ ...exportOptions, period: v })
                  }
                >
                  <SelectTrigger id="export-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Mois en cours</SelectItem>
                    <SelectItem value="current_quarter">
                      Trimestre en cours
                    </SelectItem>
                    <SelectItem value="current_year">Année en cours</SelectItem>
                    <SelectItem value="custom">
                      Période personnalisée
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sections à inclure</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="export-kpis"
                      checked={exportOptions.sections.kpis}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          sections: {
                            ...exportOptions.sections,
                            kpis: e.target.checked,
                          },
                        })
                      }
                    />
                    <Label htmlFor="export-kpis">KPIs</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="export-validations"
                      checked={exportOptions.sections.validations}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          sections: {
                            ...exportOptions.sections,
                            validations: e.target.checked,
                          },
                        })
                      }
                    />
                    <Label htmlFor="export-validations">
                      File de validation
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="export-deadlines"
                      checked={exportOptions.sections.deadlines}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          sections: {
                            ...exportOptions.sections,
                            deadlines: e.target.checked,
                          },
                        })
                      }
                    />
                    <Label htmlFor="export-deadlines">Échéances</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="export-alerts"
                      checked={exportOptions.sections.alerts}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          sections: {
                            ...exportOptions.sections,
                            alerts: e.target.checked,
                          },
                        })
                      }
                    />
                    <Label htmlFor="export-alerts">Alertes</Label>
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
                  console.log("Export avec options:", exportOptions);
                  setShowExportModal(false);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Détails de la demande de validation */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails de la demande de validation</DialogTitle>
              <DialogDescription>
                Informations complètes sur la demande{" "}
                {selectedValidationItem?.contractNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedValidationItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">
                      Type de demande
                    </Label>
                    <p className="font-medium">
                      {selectedValidationItem.type === "contract" &&
                        "Création de contrat"}
                      {selectedValidationItem.type === "amendment" && "Avenant"}
                      {selectedValidationItem.type === "indexation" &&
                        "Indexation"}
                      {selectedValidationItem.type === "termination" &&
                        "Résiliation"}
                      {selectedValidationItem.type === "amount" &&
                        "Mise à jour du montant"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Numéro de contrat
                    </Label>
                    <p className="font-medium">
                      {selectedValidationItem.contractNumber}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Titre du contrat
                    </Label>
                    <p className="font-medium">
                      {selectedValidationItem.contractTitle}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Champs impactés
                    </Label>
                    <p className="font-medium">
                      {selectedValidationItem.impactedFields || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Demandeur</Label>
                    <p className="font-medium">
                      {selectedValidationItem.requestedBy}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Valideur assigné
                    </Label>
                    <p className="font-medium">
                      {selectedValidationItem.assignedValidator}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Échéance SLA
                    </Label>
                    <p className="font-medium">
                      {formatDateTime(selectedValidationItem.slaDue)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Âge de la demande
                    </Label>
                    <p className="font-medium">
                      {selectedValidationItem.age} heures
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm text-gray-500">
                    Dernière action
                  </Label>
                  <p className="font-medium">
                    {selectedValidationItem.lastAction || "Aucune action"}
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Cette demande nécessite une validation dans les{" "}
                    {24 - selectedValidationItem.age} heures restantes.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                Fermer
              </Button>
              {canValidate() && (
                <>
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowValidationModal(true);
                      setValidationDecision("validate");
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Valider
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowValidationModal(true);
                      setValidationDecision("reject");
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Transfert de demande */}
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transférer la demande de validation</DialogTitle>
              <DialogDescription>
                Transférer la demande {selectedValidationItem?.contractNumber} à
                un autre valideur
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="transfer-to">Transférer à</Label>
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger id="transfer-to">
                    <SelectValue placeholder="Sélectionnez un valideur" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Aucun validateur disponible
                      </SelectItem>
                    ) : (
                      allUsers
                        .filter(
                          (user: any) =>
                            user.role === "validator" ||
                            user.role === "manager" ||
                            user.role === "admin"
                        )
                        .map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="transfer-note">
                  Note de transfert (optionnel)
                </Label>
                <Textarea
                  id="transfer-note"
                  placeholder="Ajoutez une note pour expliquer le transfert..."
                  rows={3}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Le nouveau valideur recevra une notification et la demande
                  apparaîtra dans sa file d'attente.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTransferModal(false)}
              >
                Annuler
              </Button>
              <Button
                disabled={!transferTo}
                onClick={() => {
                  console.log("Transfert de la demande à:", transferTo);
                  setShowTransferModal(false);
                  setTransferTo("");
                  // Ici, on appellerait normalement une API pour effectuer le transfert
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Transférer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
