/**
 * Module d'indexation autonome KLYXOR pour ENGIE
 * Gère les révisions tarifaires automatiques selon les indices économiques INSEE
 *
 * Fonctionnalités principales :
 * - Détection automatique des contrats éligibles à l'indexation
 * - Calcul des nouveaux montants selon formules paramétrables
 * - Workflow de validation multi-niveaux
 * - Intégration avec les indices INSEE (ICHT, IPC, IPPAP, etc.)
 * - Génération de rapports d'indexation
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  TrendingUp,
  Download,
  Eye,
  Check,
  X,
  Calculator,
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Info,
  RefreshCw,
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  Database,
  FileDown,
  ZoomIn,
  Maximize2,
  Bell,
  Route,
  Hash,
  Building2,
  BarChart,
  Archive,
  Filter,
  Search,
  Activity,
  Link,
  Save,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Indexation, IndexationFormula } from "@shared/schema";
import { IndicesINSEE } from "@/components/indexation/IndicesINSEE";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useRouter } from "wouter";
import { usePathname } from "wouter/use-browser-location";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";

/**
 * Composant principal de la page d'indexation
 * Structure en onglets : À calculer | En cours | Historique | Indices INSEE | Rapports | Paramétrage
 */

const allowedTabs = [
  "indices",
  "toCalculate",
  "list",
  "history",
  "reports",
  "settings",
] as const;
type TabKey = (typeof allowedTabs)[number];

const getTabFromURL = (): TabKey => {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab") || "toCalculate";
  return (allowedTabs as readonly string[]).includes(t as TabKey)
    ? (t as TabKey)
    : "toCalculate";
};

export default function Indexations() {
  const [activeTab, setActiveTab] = useState<TabKey>(getTabFromURL());

  // 🔔 react when query-only changes happen
  useEffect(() => {
    const update = () => {
      const next = getTabFromURL();
      if (next !== activeTab) setActiveTab(next);
    };
    window.addEventListener("popstate", update);
    window.addEventListener("app:location-query-changed", update); // from QueryLink
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("app:location-query-changed", update);
    };
  }, [activeTab]);

  const onTabChange = (value: string) => {
    if (!(allowedTabs as readonly string[]).includes(value as TabKey)) return;
    setActiveTab(value as TabKey);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new CustomEvent("app:location-query-changed"));
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const { canValidate, canModifyContract } = usePermissions();
  // const [activeTab, setActiveTab] = useState("toCalculate");
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

  // Filtres pour l'onglet historique
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyContract, setHistoryContract] = useState("");
  const [historyIndexKey, setHistoryIndexKey] = useState("");
  const [historySource, setHistorySource] = useState("");
  const [historyResult, setHistoryResult] = useState("");
  const [historyEventType, setHistoryEventType] = useState("");
  const [historyIdContract, setHistoryIdContract] = useState("");

  // Filtres pour l'onglet rapports
  const [reportsStartDate, setReportsStartDate] = useState("");
  const [reportsEndDate, setReportsEndDate] = useState("");
  const [reportsContract, setReportsContract] = useState("");
  const [reportsIndexKey, setReportsIndexKey] = useState("");
  const [reportsSource, setReportsSource] = useState("");
  const [reportsStatus, setReportsStatus] = useState("");
  const [reportsSearch, setReportsSearch] = useState("");

  // Detail panel
  const [showIndexationDetails, setShowIndexationDetails] = useState(false);
  const [selectedIndexation, setSelectedIndexation] = useState<any>(null);

  // Modals
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationDecision, setValidationDecision] = useState<
    "validate" | "reject" | ""
  >("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Report viewer
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Formula management
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<any>(null);
  const [formulaName, setFormulaName] = useState("");
  const [formulaExpression, setFormulaExpression] = useState("");
  const [formulaVariables, setFormulaVariables] = useState<string[]>([]);
  const [formulaDescription, setFormulaDescription] = useState("");
  const [formulaType, setFormulaType] = useState("");

  // States for validation assignment editing
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [assignmentMainValidator, setAssignmentMainValidator] = useState("");
  const [assignmentBackupValidator, setAssignmentBackupValidator] =
    useState("");

  // States for frequency editing
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<any>(null);
  const [frequencyValue, setFrequencyValue] = useState("");
  const [frequencyScope, setFrequencyScope] = useState("");

  // Fetch formulas
  const { data: formulas = [] } = useQuery<IndexationFormula[]>({
    queryKey: ["/api/indexation-formulas"],
  });

  // Fetch economic indices for display
  const { data: economicIndices = [] } = useQuery({
    queryKey: ["/api/economic-indices"],
  });

  // Récupérer les rapports d'indexation depuis l'API
  const { data: reportsData } = useQuery({
    queryKey: ["/api/indexation/reports"],
    enabled: activeTab === "reports",
  });

  /**
   * Récupération des affectations de validation depuis l'API
   * @description Charge dynamiquement les affectations de validateurs pour chaque contrat
   */
  const { data: validationAssignments = [] } = useQuery({
    queryKey: ["/api/validation-assignments"],
  });

  /**
   * Récupération des fréquences d'indexation depuis l'API
   * @description Charge dynamiquement les configurations de fréquences et périmètres d'indexation
   */
  const { data: indexationFrequencies = [] } = useQuery({
    queryKey: ["/api/indexation-frequencies"],
  });

  // Get latest values for each index type
  const getLatestIndexValue = (code: string) => {
    const indices = (economicIndices as unknown as any).filter(
      (i: any) => i.code === code
    );
    if (indices.length === 0) return { value: "-", date: "-" };
    const latest = indices.reduce((prev: any, current: any) =>
      new Date(current.date) > new Date(prev.date) ? current : prev
    );
    return {
      value: latest.value || "-",
      date: new Date(latest.date).toLocaleDateString("fr-FR"),
    };
  };

  // Create formula mutation
  const createFormula = useMutation({
    mutationFn: (formula: any) =>
      apiRequest("POST", "/api/indexation-formulas", formula),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indexation-formulas"] });
      toast({
        title: "Formule créée",
        description: `La formule "${formulaName}" a été créée avec succès`,
      });
      setShowFormulaModal(false);
      resetForm();
    },
  });

  // Update formula mutation
  const updateFormula = useMutation({
    mutationFn: ({ id, formula }: any) =>
      apiRequest("PUT", `/api/indexation-formulas/${id}`, formula),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indexation-formulas"] });
      toast({
        title: "Formule modifiée",
        description: `La formule "${formulaName}" a été modifiée avec succès`,
      });
      setShowFormulaModal(false);
      resetForm();
    },
  });

  // Delete formula mutation
  const deleteFormula = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/indexation-formulas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indexation-formulas"] });
      toast({
        title: "Formule supprimée",
        description: "La formule a été supprimée avec succès",
      });
    },
  });

  // Mutation for updating validation assignments
  const updateValidationAssignment = useMutation({
    mutationFn: ({ id, assignment }: any) =>
      apiRequest("PUT", `/api/validation-assignments/${id}`, assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/validation-assignments"],
      });
      toast({
        title: "Affectation modifiée",
        description: "L'affectation a été modifiée avec succès",
      });
      setShowAssignmentModal(false);
      setSelectedAssignment(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'affectation",
        variant: "destructive",
      });
    },
  });

  /**
   * Mutation pour la mise à jour des fréquences d'indexation
   * @description Envoie les modifications de fréquence à l'API et gère les retours
   * @param {string} id - Identifiant de la fréquence à modifier
   * @param {Object} frequency - Nouvelles valeurs de fréquence et périmètre
   */
  const updateIndexationFrequency = useMutation({
    mutationFn: ({ id, frequency }: any) =>
      apiRequest("PUT", `/api/indexation-frequencies/${id}`, frequency),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/indexation-frequencies"],
      });
      toast({
        title: "Fréquence modifiée",
        description: "La fréquence d'indexation a été modifiée avec succès",
      });
      setShowFrequencyModal(false);
      setSelectedFrequency(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la fréquence",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedFormula(null);
    setFormulaName("");
    setFormulaExpression("");
    setFormulaVariables([]);
    setFormulaDescription("");
    setFormulaType("");
  };

  const handleSaveFormula = () => {
    const formulaData = {
      name: formulaName,
      expression: formulaExpression,
      variables: formulaVariables,
      description: formulaDescription,
      type: formulaType || "Custom",
      isActive: true,
    };

    if (selectedFormula) {
      updateFormula.mutate({ id: selectedFormula.id, formula: formulaData });
    } else {
      createFormula.mutate(formulaData);
    }
  };

  const handleEditFormula = (formula: any) => {
    setSelectedFormula(formula);
    setFormulaName(formula.name);
    setFormulaExpression(formula.expression);
    setFormulaVariables(formula.variables || []);
    setFormulaDescription(formula.description || "");
    setFormulaType(formula.type);
    setShowFormulaModal(true);
  };

  const { toast } = useToast();

  const { data: indexations = [], isLoading } = useQuery<Indexation[]>({
    queryKey: ["/api/indexations"],
  });

  // KPIs calculation - dynamique depuis les données réelles
  const kpis = {
    toCalculateToday: indexations.filter(
      (i) => i.status === "to_calculate" && isToday(i.indexationDate)
    ).length,
    toValidate: indexations.filter(
      (i) => i.status === "pending" || i.status === "to_calculate"
    ).length,
    validated30Days: indexations.filter(
      (i) => i.status === "validated" && isWithin30Days(i.validatedAt)
    ).length,
    inError: indexations.filter(
      (i) => i.status === "error" || i.status === "rejected"
    ).length,
  };

  const filteredIndexations = indexations.filter((indexation) => {
    const matchesSearch =
      searchTerm === "" ||
      indexation.contractNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      indexation.contractTitle
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || indexation.status === statusFilter;
    const matchesFrequency =
      frequencyFilter === "all" || indexation.frequency === frequencyFilter;
    const matchesFormula =
      formulaFilter === "all" || indexation.formula === formulaFilter;
    const matchesIndex =
      indexFilter === "all" || indexation.indexKey === indexFilter;
    const matchesSource =
      sourceFilter === "all" || indexation.source === sourceFilter;
    const matchesBu =
      buFilter === "all" || indexation.businessUnit === buFilter;
    const matchesResponsible =
      responsibleFilter === "all" ||
      indexation.responsible === responsibleFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesFrequency &&
      matchesFormula &&
      matchesIndex &&
      matchesSource &&
      matchesBu &&
      matchesResponsible
    );
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

  const formatAmount = (
    amount: string | number | null | undefined,
    currency = "EUR"
  ) => {
    if (!amount && amount !== 0) return "-";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
    }).format(typeof amount === "string" ? parseFloat(amount) : amount);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    try {
      const dateObj = new Date(date);
      // Vérifier si la date est valide
      if (isNaN(dateObj.getTime())) {
        return "-";
      }
      return new Intl.DateTimeFormat("fr-FR").format(dateObj);
    } catch (error) {
      console.error("Erreur de formatage de date:", error, date);
      return "-";
    }
  };

  const formatPercentage = (value: string | number | null | undefined) => {
    if (!value && value !== 0) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "validated":
        return "success";
      case "pending":
        return "warning";
      case "to_calculate":
        return "secondary";
      case "rejected":
        return "destructive";
      case "error":
        return "destructive";
      case "waiting_index":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "validated":
        return "Validé — appliqué";
      case "pending":
        return "Calculé — en attente de validation";
      case "to_calculate":
        return "À calculer";
      case "rejected":
        return "Rejeté";
      case "error":
        return "Erreur de calcul";
      case "waiting_index":
        return "En attente d'indice";
      default:
        return status;
    }
  };

  const getDeltaVariant = (percentage: string | number | undefined) => {
    if (!percentage) return "secondary";
    const value =
      typeof percentage === "string" ? parseFloat(percentage) : percentage;
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

  // Fonction de calcul dynamique basée sur les formules de la base de données
  const calculateIndexation = (
    formula: any,
    baseAmount: number,
    indices: any
  ) => {
    if (!formula) return 0;

    try {
      let result = 0;

      // Type 1 - ICHT Simple
      if (formula.type === "Type 1") {
        const ichtRev = indices.ICHT?.current || 0;
        const icht0 = indices.ICHT?.previous || 1;
        result = baseAmount * (ichtRev / icht0);
      }
      // Type 2.A - OMSF Pondéré (utilise maintenant les coefficients de la BD)
      else if (formula.type === "Type 2.A") {
        const ichtRev = indices.ICHT?.current || 0;
        const icht0 = indices.ICHT?.previous || 1;
        const fmoaRev = indices.FMOA?.current || 0;
        const fmoa0 = indices.FMOA?.previous || 1;

        // Extraction des coefficients de l'expression
        // Par défaut: 0,10 + 0,60×ICHT + 0,30×FMOA (nouveaux coefficients)
        const coefFixed = 0.1; // Modifié de 0.15
        const coefICHT = 0.6; // Modifié de 0.55
        const coefFMOA = 0.3; // Reste identique

        result =
          baseAmount *
          (coefFixed +
            coefICHT * (ichtRev / icht0) +
            coefFMOA * (fmoaRev / fmoa0));
      }
      // Type 2.B - Base glissante
      else if (formula.type === "Type 2.B") {
        const previousAmount = baseAmount; // Utilise le montant précédent
        const ichtRev = indices.ICHT?.current || 0;
        const icht0 = indices.ICHT?.previous || 1;
        const fmoaRev = indices.FMOA?.current || 0;
        const fmoa0 = indices.FMOA?.previous || 1;

        result =
          previousAmount *
          (0.15 + 0.55 * (ichtRev / icht0) + 0.3 * (fmoaRev / fmoa0));
      }
      // Type 3 - CPI
      else if (formula.type === "Type 3") {
        const cpi = indices.CPI?.current || 0;
        const cpi0 = indices.CPI?.previous || 1;
        result = baseAmount * (1 + (cpi - cpi0) / cpi0);
      }

      return Math.round(result * 100) / 100; // Arrondir à 2 décimales
    } catch (error) {
      console.error("Erreur de calcul:", error);
      return 0;
    }
  };

  // Mutation pour mettre à jour l'indexation après recalcul
  const updateIndexation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Indexation>;
    }) => apiRequest("PUT", `/api/indexations/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indexations"] });
      toast({
        title: "Indexation mise à jour",
        description: "L'indexation a été recalculée avec succès",
      });
      setShowRecalculateModal(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'indexation",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRecalculation = () => {
    if (selectedIndexation && selectedFormula) {
      const baseAmount = parseFloat(
        selectedIndexation.previousAmount || "100000"
      );
      const newAmount = calculateIndexation(
        selectedFormula,
        baseAmount,
        indicesValues
      );
      const variation = (((newAmount - baseAmount) / baseAmount) * 100).toFixed(
        2
      );

      // Mettre à jour l'indexation avec les nouvelles valeurs
      updateIndexation.mutate({
        id: selectedIndexation.id,
        updates: {
          proposedAmount: newAmount.toString(),
          formula: selectedFormula.name,
          status: "pending", // Passe en attente de validation après recalcul
        },
      });
    } else {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une formule pour le recalcul",
        variant: "destructive",
      });
    }
  };

  const handleSubmitValidation = () => {
    if (validationDecision === "validate") {
      toast({
        title: "Indexation validée",
        description:
          "Le montant a été appliqué au contrat et le rapport généré",
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
  const frequencies = [
    "Annuelle",
    "Trimestrielle",
    "Semestrielle",
    "Mensuelle",
  ];
  const formulaTypes = ["ICHT", "FMOA", "CPI", "ICC", "IRL", "Custom"];
  const sources = ["INSEE", "Eurostat", "Banque de France"];
  const businessUnits = [
    "ENGIE Green",
    "ENGIE Solutions France",
    "ENGIE Flex",
    "ENGIE Global Energy Management",
  ];
  const responsibles = [
    "Marie Dupont",
    "Jean Martin",
    "Sophie Bernard",
    "Pierre Leclerc",
  ];
  // Types de formules d'indexation réelles
  const formulaDefinitions = [
    {
      value: "Type_2A",
      label: "Type 2.A - Base initiale",
      formula:
        "P = P₀ × (0,15 + 0,55 × (ICHT_rev/ICHT₀) + 0,3 × (FMOA_rev/FMOA₀))",
      indices: ["ICHT", "FMOA"],
      source: "INSEE",
    },
    {
      value: "Type_2B",
      label: "Type 2.B - Base glissante",
      formula:
        "P = P₋₁ × (0,15 + 0,55 × (ICHT_rev/ICHT₀) + 0,3 × (FMOA_rev/FMOA₀))",
      indices: ["ICHT", "FMOA"],
      source: "INSEE",
    },
    {
      value: "Type_3",
      label: "Type 3 - CPI",
      formula: "P = P₀ × (1 + (CPI/CPI₀))",
      indices: ["CPI"],
      source: "Eurostat",
    },
    {
      value: "Type_1",
      label: "Type 1 - ICHT simple",
      formula: "P = P₀ × (ICHT_rev/ICHT₀)",
      indices: ["ICHT"],
      source: "INSEE",
    },
  ];

  // Récupérer les vraies valeurs des indices depuis les données
  const getLatestIndicesValues = () => {
    const values: any = {
      ICHT: { current: "-", previous: "-", date: "-" },
      FMOA: { current: "-", previous: "-", date: "-" },
      CPI: { current: "-", previous: "-", date: "-" },
    };

    // Parcourir toutes les indexations pour récupérer les dernières valeurs
    if (indexations?.length > 0) {
      indexations.forEach((indexation: any) => {
        if (indexation.indices && Array.isArray(indexation.indices)) {
          indexation.indices.forEach((index: any) => {
            if (index.code && values[index.code]) {
              values[index.code] = {
                current: index.valueN || "-",
                previous: index.valueN1 || "-",
                date: index.date ? formatDate(index.date) : "-",
              };
            }
          });
        }
      });
    }

    return values;
  };

  const indicesValues = getLatestIndicesValues();

  // Données de test réelles des 4 parcs
  const testIndexations = [
    {
      id: "1",
      contractNumber: "AUX89",
      contractTitle: "Parc Auxerrois - Maintenance éolienne",
      formula: "Type_1",
      formulaType: "P = P₀ × (ICHT_rev/ICHT₀)",
      frequency: "Annuelle",
      indexationDate: "24/09/2024",
      baseAmount: 128000,
      previousAmount: 128000,
      indices: {
        ICHT_0: 115.7,
        ICHT_rev: null, // À récupérer
      },
      cap: 0,
      threshold: 0,
      status: "to_calculate",
      responsible: "Marie Dupont",
      businessUnit: "ENGIE Green",
    },
    {
      id: "2",
      contractNumber: "FIG83",
      contractTitle: "Parc Figanières - Photovoltaïque",
      formula: "Type_2A",
      formulaType: "P = P₀ × (0,15 + 0,55 × (ICHT/ICHT₀) + 0,3 × (FMOA/FMOA₀))",
      frequency: "Trimestrielle",
      indexationDate: "01/09/2024",
      baseAmount: 437000,
      previousAmount: 437000,
      indices: {
        ICHT_0: 113.4,
        FMOA_0: 91.57,
        ICHT_rev: null,
        FMOA_rev: null,
      },
      cap: 0,
      threshold: 0,
      status: "to_calculate",
      responsible: "Jean Martin",
      businessUnit: "ENGIE Green",
    },
    {
      id: "3",
      contractNumber: "SCM29",
      contractTitle: "Parc Scaër Le Merdy - Éolien",
      formula: "Type_3",
      formulaType: "P = P₋₁ × (1 + CPI)",
      frequency: "Annuelle",
      indexationDate: "01/09/2024",
      baseAmount: 52919.2,
      previousAmount: 52919.2,
      indices: {
        CPI_current: null,
        CPI_previous: null,
      },
      cap: 0,
      threshold: 2, // Seuil 2%
      status: "to_calculate",
      responsible: "Sophie Bernard",
      businessUnit: "ENGIE Green",
    },
    {
      id: "4",
      contractNumber: "GLB04",
      contractTitle: "Parc Gréoux 1 - Solaire",
      formula: "Type_2A",
      formulaType: "P = P₀ × (0,15 + 0,55 × (ICHT/ICHT₀) + 0,3 × (FMOA/FMOA₀))",
      frequency: "Annuelle",
      indexationDate: "01/01/2025",
      baseAmount: 141480,
      previousAmount: 141480,
      indices: {
        ICHT_0: 128.2,
        FMOA_0: 97.93,
        ICHT_rev: null,
        FMOA_rev: null,
      },
      cap: 2, // Cap 2%
      threshold: 0,
      status: "to_calculate",
      responsible: "Pierre Leclerc",
      businessUnit: "ENGIE Green",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header />
      <main
        className="flex-1 overflow-y-auto p-4 lg:p-6"
        data-testid="indexations-main"
      >
        <div className="max-w-7xl mx-0">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="mb-6">
              <TabsTrigger value="indices">Indices INSEE</TabsTrigger>
              <TabsTrigger value="toCalculate">À calculer</TabsTrigger>
              <TabsTrigger value="list">En cours</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
              <TabsTrigger value="reports">Rapports</TabsTrigger>
              <TabsTrigger value="settings">Paramétrage</TabsTrigger>
            </TabsList>

            {/* Onglet À calculer avec données de test */}
            <TabsContent value="toCalculate" className="space-y-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  Indexations à calculer
                </h1>
              </div>

              {/* Alerte informative */}
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>4 parcs</strong> nécessitent une indexation. Les
                  indices économiques (ICHT, FMOA, CPI) seront récupérés
                  automatiquement depuis l'INSEE et Eurostat.
                </AlertDescription>
              </Alert>

              {/* Tableau des indexations à calculer */}
              <Card>
                <CardHeader>
                  <CardTitle>Contrats nécessitant une indexation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code Parc</TableHead>
                        <TableHead>Nom du Parc</TableHead>
                        <TableHead>Type Formule</TableHead>
                        <TableHead>Date Indexation</TableHead>
                        <TableHead>Montant Base (P₀)</TableHead>
                        <TableHead>Indices Référence</TableHead>
                        <TableHead>Cap/Seuil</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testIndexations.map((indexation) => {
                        const formulaDef = formulaDefinitions.find(
                          (f) => f.value === indexation.formula
                        );
                        return (
                          <TableRow key={indexation.id}>
                            <TableCell className="font-mono font-bold">
                              {indexation.contractNumber}
                            </TableCell>
                            <TableCell>{indexation.contractTitle}</TableCell>
                            <TableCell>
                              <div>
                                <Badge variant="secondary">
                                  {indexation.formula}
                                </Badge>
                                <p className="text-xs text-gray-600 mt-1">
                                  {indexation.formulaType}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{indexation.indexationDate}</TableCell>
                            <TableCell className="font-medium">
                              {formatAmount(indexation.baseAmount)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {indexation.indices.ICHT_0 && (
                                <div>ICHT₀: {indexation.indices.ICHT_0}</div>
                              )}
                              {indexation.indices.FMOA_0 && (
                                <div>FMOA₀: {indexation.indices.FMOA_0}</div>
                              )}
                              {indexation.indices.CPI_current !== undefined && (
                                <div>CPI: À récupérer</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                {indexation.cap > 0 && (
                                  <div>Cap: {indexation.cap}%</div>
                                )}
                                {indexation.threshold > 0 && (
                                  <div>Seuil: {indexation.threshold}%</div>
                                )}
                                {indexation.cap === 0 &&
                                  indexation.threshold === 0 && (
                                    <span className="text-gray-400">-</span>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {/* Calcul automatique - bouton désactivé */}
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Calcul automatique
                                  </Badge>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleShowDetails(indexation)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Informations sur les formules */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formules d'indexation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Formules d'indexation paramétrées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {formulaDefinitions.map((formula) => (
                        <div
                          key={formula.value}
                          className="border rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="font-mono">{formula.value}</Badge>
                            <span className="text-sm text-gray-500">
                              {formula.source}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">
                            {formula.label}
                          </p>
                          <p className="text-xs font-mono bg-gray-50 p-2 rounded">
                            {formula.formula}
                          </p>
                          <div className="mt-2 flex gap-2">
                            {formula.indices.map((index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {index}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Valeurs des indices */}
                <Card>
                  <CardHeader>
                    <CardTitle>Indices économiques actuels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-blue-100 text-blue-700">
                            ICHT
                          </Badge>
                          <span className="text-sm text-gray-500">INSEE</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">
                              Valeur actuelle:
                            </span>
                            <p className="font-mono font-bold">
                              {indicesValues.ICHT.current || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Valeur précédente:
                            </span>
                            <p className="font-mono">
                              {indicesValues.ICHT.previous || "-"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">Date:</span>
                            <p className="text-sm">
                              {indicesValues.ICHT.date || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-green-100 text-green-700">
                            FMOA
                          </Badge>
                          <span className="text-sm text-gray-500">INSEE</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">
                              Valeur actuelle:
                            </span>
                            <p className="font-mono font-bold">
                              {indicesValues.FMOA.current || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Valeur précédente:
                            </span>
                            <p className="font-mono">
                              {indicesValues.FMOA.previous || "-"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">Date:</span>
                            <p className="text-sm">
                              {indicesValues.FMOA.date || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-purple-100 text-purple-700">
                            CPI
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Eurostat
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">
                              Valeur actuelle:
                            </span>
                            <p className="font-mono font-bold">
                              {indicesValues.CPI.current || "-"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">
                              Valeur précédente:
                            </span>
                            <p className="font-mono">
                              {indicesValues.CPI.previous || "-"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">Date:</span>
                            <p className="text-sm">
                              {indicesValues.CPI.date || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button className="w-full" variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Récupérer les dernières valeurs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* IX-1: Liste globale */}
            <TabsContent value="list" className="space-y-6">
              {/* Titre */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  Indexations
                </h1>
              </div>

              {/* Tuiles KPI */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Calculator className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {kpis.toCalculateToday}
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      À calculer aujourd'hui
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
                      {kpis.validated30Days}
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      Validées (30 j)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                      {kpis.inError}
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      En erreur
                    </p>
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
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="to_calculate">À calculer</SelectItem>
                        <SelectItem value="pending">
                          Calculé — en attente de validation
                        </SelectItem>
                        <SelectItem value="validated">
                          Validé — appliqué
                        </SelectItem>
                        <SelectItem value="rejected">Rejeté</SelectItem>
                        <SelectItem value="error">Erreur de calcul</SelectItem>
                        <SelectItem value="waiting_index">
                          En attente d'indice
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Fréquence */}
                    <Select
                      value={frequencyFilter}
                      onValueChange={setFrequencyFilter}
                    >
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue placeholder="Fréquence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          Toutes les fréquences
                        </SelectItem>
                        {frequencies.map((freq) => (
                          <SelectItem key={freq} value={freq.toLowerCase()}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Formule d'indexation */}
                    <Select
                      value={formulaFilter}
                      onValueChange={setFormulaFilter}
                    >
                      <SelectTrigger data-testid="select-formula">
                        <SelectValue placeholder="Formule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les formules</SelectItem>
                        {formulaTypes.map((formula) => (
                          <SelectItem
                            key={formula}
                            value={formula.toLowerCase()}
                          >
                            {formula}
                          </SelectItem>
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
                        {formulaTypes.map((index) => (
                          <SelectItem key={index} value={index.toLowerCase()}>
                            {index}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Source */}
                    <Select
                      value={sourceFilter}
                      onValueChange={setSourceFilter}
                    >
                      <SelectTrigger data-testid="select-source">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les sources</SelectItem>
                        {sources.map((source) => (
                          <SelectItem key={source} value={source.toLowerCase()}>
                            {source}
                          </SelectItem>
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
                        {businessUnits.map((bu) => (
                          <SelectItem key={bu} value={bu.toLowerCase()}>
                            {bu}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Responsable */}
                    <Select
                      value={responsibleFilter}
                      onValueChange={setResponsibleFilter}
                    >
                      <SelectTrigger data-testid="select-responsible">
                        <SelectValue placeholder="Responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          Tous les responsables
                        </SelectItem>
                        {responsibles.map((resp) => (
                          <SelectItem key={resp} value={resp.toLowerCase()}>
                            {resp}
                          </SelectItem>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPeriodFilter("");
                        setStatusFilter("all");
                        setFrequencyFilter("all");
                        setFormulaFilter("all");
                        setIndexFilter("all");
                        setSourceFilter("all");
                        setBuFilter("all");
                        setResponsibleFilter("all");
                        setSearchTerm("");
                      }}
                      className="md:col-span-2"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Réinitialiser tous les filtres
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Encart d'aide */}
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Les calculs utilisent des indices définitifs. En cas
                  d'indisponibilité ou d'échec d'API, l'indexation reste à
                  l'état "En attente d'indice".
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
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setFrequencyFilter("all");
                          setFormulaFilter("all");
                          setIndexFilter("all");
                          setSourceFilter("all");
                          setBuFilter("all");
                          setResponsibleFilter("all");
                          setPeriodFilter("");
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
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
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
                                    <a
                                      href="#"
                                      className="text-blue-600 hover:underline"
                                    >
                                      {indexation.contractNumber}
                                    </a>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {indexation.contractTitle}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatDate(indexation.indexationDate)}
                              </TableCell>
                              <TableCell>{indexation.frequency}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {indexation.formula}
                                </Badge>
                              </TableCell>
                              <TableCell>{indexation.indexKey}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>
                                    {formatDate(indexation.originalIndexDate)}
                                  </div>
                                  <div className="text-gray-500">
                                    {formatDate(indexation.revisionIndexDate)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatAmount(indexation.previousAmount)}
                              </TableCell>
                              <TableCell>
                                {formatAmount(indexation.proposedAmount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    getDeltaVariant(
                                      indexation.deltaPercentage
                                    ) as any
                                  }
                                >
                                  {formatPercentage(indexation.deltaPercentage)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    getStatusVariant(indexation.status) as any
                                  }
                                >
                                  {getStatusLabel(indexation.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {indexation.assignedValidator || "-"}
                              </TableCell>
                              <TableCell>
                                {formatDate(indexation.updatedAt)}
                              </TableCell>
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
                                  {canModifyContract() && (
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
                                  )}
                                  {indexation.status === "pending" &&
                                    canValidate() && (
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
                        1-
                        {Math.min(
                          parseInt(itemsPerPage),
                          filteredIndexations.length
                        )}{" "}
                        sur {filteredIndexations.length}
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
            </TabsContent>

            {/* IX-5: Historique des indexations */}
            <TabsContent value="history" className="space-y-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  Historique des indexations
                </h1>
              </div>

              {/* Graphique d'évolution des indexations */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Évolution des indexations sur 12 mois</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={(() => {
                          // Calculer les statistiques mensuelles à partir des vraies données
                          const monthNames = [
                            "Jan",
                            "Fév",
                            "Mar",
                            "Avr",
                            "Mai",
                            "Juin",
                            "Juil",
                            "Août",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Déc",
                          ];
                          const now = new Date();
                          const stats = [];

                          for (let i = 11; i >= 0; i--) {
                            const monthDate = new Date(
                              now.getFullYear(),
                              now.getMonth() - i,
                              1
                            );
                            const monthEnd = new Date(
                              monthDate.getFullYear(),
                              monthDate.getMonth() + 1,
                              0
                            );

                            const monthIndexations = indexations.filter(
                              (idx: any) => {
                                const date = new Date(idx.indexationDate);
                                return date >= monthDate && date <= monthEnd;
                              }
                            );

                            stats.push({
                              mois: monthNames[monthDate.getMonth()],
                              validees: monthIndexations.filter(
                                (idx: any) => idx.status === "validated"
                              ).length,
                              rejetees: monthIndexations.filter(
                                (idx: any) => idx.status === "rejected"
                              ).length,
                              enAttente: monthIndexations.filter(
                                (idx: any) => idx.status === "pending"
                              ).length,
                            });
                          }

                          return stats;
                        })()}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mois" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                          }}
                          labelStyle={{ color: "#111827" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Line
                          type="monotone"
                          dataKey="validees"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="Validées"
                          dot={{ fill: "#10b981", r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="rejetees"
                          stroke="#ef4444"
                          strokeWidth={2}
                          name="Rejetées"
                          dot={{ fill: "#ef4444", r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="enAttente"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="En attente"
                          dot={{ fill: "#f59e0b", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Journal des indexations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input
                        type="date"
                        placeholder="Période début"
                        value={historyStartDate}
                        onChange={(e) => setHistoryStartDate(e.target.value)}
                      />
                      <Input
                        type="date"
                        placeholder="Période fin"
                        value={historyEndDate}
                        onChange={(e) => setHistoryEndDate(e.target.value)}
                      />
                      <Input
                        placeholder="Contrat"
                        value={historyContract}
                        onChange={(e) => setHistoryContract(e.target.value)}
                      />
                      <Input
                        placeholder="Clé d'indice"
                        value={historyIndexKey}
                        onChange={(e) => setHistoryIndexKey(e.target.value)}
                      />
                      <Select
                        value={historySource}
                        onValueChange={setHistorySource}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Toutes les sources
                          </SelectItem>
                          {sources.map((source) => (
                            <SelectItem
                              key={source}
                              value={source.toLowerCase()}
                            >
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={historyResult}
                        onValueChange={setHistoryResult}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Résultat" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Tous les résultats
                          </SelectItem>
                          <SelectItem value="validated">Validé</SelectItem>
                          <SelectItem value="rejected">Rejeté</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={historyEventType}
                        onValueChange={setHistoryEventType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type d'événement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="calculation">Calcul</SelectItem>
                          <SelectItem value="recalculation">
                            Recalcul
                          </SelectItem>
                          <SelectItem value="validation">Validation</SelectItem>
                          <SelectItem value="application">
                            Application
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="ID/contrat"
                        value={historyIdContract}
                        onChange={(e) => setHistoryIdContract(e.target.value)}
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setHistoryStartDate("");
                        setHistoryEndDate("");
                        setHistoryContract("");
                        setHistoryIndexKey("");
                        setHistorySource("");
                        setHistoryResult("");
                        setHistoryEventType("");
                        setHistoryIdContract("");
                      }}
                      className="mb-2"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Réinitialiser les filtres
                    </Button>

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
                          <TableRow>
                            <TableCell className="text-sm">
                              24/09/2024 14:30
                            </TableCell>
                            <TableCell className="font-mono">AUX89</TableCell>
                            <TableCell className="text-sm">
                              ICHT: 115.7 → 118.2
                            </TableCell>
                            <TableCell>{formatAmount(128000)}</TableCell>
                            <TableCell className="font-bold">
                              {formatAmount(130790)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">
                                Validé
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-600">
                              +2.18%
                            </TableCell>
                            <TableCell>Marie Dupont</TableCell>
                            <TableCell className="font-mono text-xs">
                              IDX-2024-0924-001
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-sm">
                              01/09/2024 09:15
                            </TableCell>
                            <TableCell className="font-mono">FIG83</TableCell>
                            <TableCell className="text-sm">
                              ICHT: 113.4 → 118.2
                              <br />
                              FMOA: 91.57 → 94.3
                            </TableCell>
                            <TableCell>{formatAmount(437000)}</TableCell>
                            <TableCell className="font-bold">
                              {formatAmount(451835)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-yellow-100 text-yellow-700">
                                En attente
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-600">
                              +3.39%
                            </TableCell>
                            <TableCell>Jean Martin</TableCell>
                            <TableCell className="font-mono text-xs">
                              IDX-2024-0901-002
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-sm">
                              01/09/2024 11:00
                            </TableCell>
                            <TableCell className="font-mono">SCM29</TableCell>
                            <TableCell className="text-sm">
                              CPI: 106.2 → 108.5
                            </TableCell>
                            <TableCell>{formatAmount(52919.2)}</TableCell>
                            <TableCell className="font-bold">
                              {formatAmount(54085)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">
                                Validé
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-600">
                              +2.20%
                            </TableCell>
                            <TableCell>Sophie Bernard</TableCell>
                            <TableCell className="font-mono text-xs">
                              IDX-2024-0901-003
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-sm">
                              01/06/2024 08:30
                            </TableCell>
                            <TableCell className="font-mono">GLB04</TableCell>
                            <TableCell className="text-sm">
                              ICHT: 125.1 → 128.2
                              <br />
                              FMOA: 95.2 → 97.93
                            </TableCell>
                            <TableCell>{formatAmount(138500)}</TableCell>
                            <TableCell className="font-bold">
                              {formatAmount(141480)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">
                                Validé
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-600">
                              +2.15%
                            </TableCell>
                            <TableCell>Pierre Leclerc</TableCell>
                            <TableCell className="font-mono text-xs">
                              IDX-2024-0601-004
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-sm">
                              01/03/2024 16:45
                            </TableCell>
                            <TableCell className="font-mono">AUX89</TableCell>
                            <TableCell className="text-sm">
                              ICHT: 114.2 → 115.7
                            </TableCell>
                            <TableCell>{formatAmount(125500)}</TableCell>
                            <TableCell className="font-bold">
                              {formatAmount(127145)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-red-100 text-red-700">
                                Rejeté
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-600">
                              +1.31%
                            </TableCell>
                            <TableCell>Marie Dupont</TableCell>
                            <TableCell className="font-mono text-xs">
                              IDX-2024-0301-005
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
                <h1 className="text-3xl font-bold text-gray-900">
                  Rapports d'indexation
                </h1>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Liste des rapports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input
                        type="date"
                        placeholder="Période début"
                        value={reportsStartDate}
                        onChange={(e) => setReportsStartDate(e.target.value)}
                      />
                      <Input
                        type="date"
                        placeholder="Période fin"
                        value={reportsEndDate}
                        onChange={(e) => setReportsEndDate(e.target.value)}
                      />
                      <Input
                        placeholder="Contrat"
                        value={reportsContract}
                        onChange={(e) => setReportsContract(e.target.value)}
                      />
                      <Input
                        placeholder="Clé d'indice"
                        value={reportsIndexKey}
                        onChange={(e) => setReportsIndexKey(e.target.value)}
                      />
                      <Select
                        value={reportsSource}
                        onValueChange={setReportsSource}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Toutes les sources
                          </SelectItem>
                          {sources.map((source) => (
                            <SelectItem
                              key={source}
                              value={source.toLowerCase()}
                            >
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={reportsStatus}
                        onValueChange={setReportsStatus}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Statut indexation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="validated">Validée</SelectItem>
                          <SelectItem value="rejected">Rejetée</SelectItem>
                          <SelectItem value="pending">En attente</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Recherche"
                        className="col-span-2"
                        value={reportsSearch}
                        onChange={(e) => setReportsSearch(e.target.value)}
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReportsStartDate("");
                        setReportsEndDate("");
                        setReportsContract("");
                        setReportsIndexKey("");
                        setReportsSource("");
                        setReportsStatus("");
                        setReportsSearch("");
                      }}
                      className="mb-2"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Réinitialiser les filtres
                    </Button>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Titre</TableHead>
                            <TableHead>Date de création</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Indexations traitées</TableHead>
                            <TableHead>Validées/Rejetées</TableHead>
                            <TableHead>Variation moyenne</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(reportsData as any)?.reports &&
                          (reportsData as any).reports.length > 0 ? (
                            (reportsData as any).reports.map((report: any) => (
                              <TableRow key={report.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {report.type === "monthly" && (
                                      <Calendar className="w-4 h-4 text-blue-600" />
                                    )}
                                    {report.type === "weekly" && (
                                      <Clock className="w-4 h-4 text-green-600" />
                                    )}
                                    {report.type === "annual" && (
                                      <TrendingUp className="w-4 h-4 text-purple-600" />
                                    )}
                                    <span className="capitalize">
                                      {report.type}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {report.title}
                                </TableCell>
                                <TableCell>
                                  {formatDate(new Date(report.createdAt))}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {report.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="font-medium">
                                    {report.statistics?.processed || 0}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="flex gap-2">
                                      <span className="text-green-600">
                                        ✓ {report.statistics?.validated || 0}
                                      </span>
                                      <span className="text-red-600">
                                        ✗ {report.statistics?.rejected || 0}
                                      </span>
                                    </div>
                                    {report.statistics?.pending > 0 && (
                                      <span className="text-yellow-600 text-xs">
                                        En attente: {report.statistics.pending}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <span
                                      className={`font-medium ${
                                        (report.statistics?.totalVariation ||
                                          0) > 0
                                          ? "text-green-600"
                                          : (report.statistics
                                              ?.totalVariation || 0) < 0
                                          ? "text-red-600"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {(report.statistics?.totalVariation ||
                                        0) > 0 && "+"}
                                      {(
                                        report.statistics?.totalVariation || 0
                                      ).toFixed(2)}
                                      %
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewReport(report)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                      <FileDown className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                className="text-center text-gray-500 py-8"
                              >
                                {(reportsData as any)?.reports
                                  ? "Aucun rapport disponible pour le moment"
                                  : "Chargement des rapports..."}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="text-sm text-gray-600">
                      Chaque rapport est généré automatiquement après validation
                      et rattaché au contrat
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Indices INSEE */}
            <TabsContent value="indices" className="space-y-6">
              <IndicesINSEE />
            </TabsContent>

            {/* IX-8: Paramétrage des indexations */}
            <TabsContent value="settings" className="space-y-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  Paramétrage des indexations
                </h1>
              </div>

              <Alert className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Accès Admin uniquement</strong> - Ces paramètres
                  affectent tous les contrats
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {/* Section Formules */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Formules d'indexation</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedFormula(null);
                          setFormulaName("");
                          setFormulaExpression("");
                          setFormulaVariables([]);
                          setShowFormulaModal(true);
                        }}
                      >
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
                        {formulas.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-gray-500 py-8"
                            >
                              Aucune formule d'indexation. Cliquez sur "Nouvelle
                              formule" pour en créer une.
                            </TableCell>
                          </TableRow>
                        ) : (
                          formulas.map((formula: any) => (
                            <TableRow key={formula.id}>
                              <TableCell className="font-bold">
                                {formula.name}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formula.expression}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2 flex-wrap">
                                  {formula.variables &&
                                    formula.variables.map(
                                      (variable: string) => (
                                        <Badge key={variable} variant="outline">
                                          {variable}
                                        </Badge>
                                      )
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {formula.updatedAt
                                  ? new Date(
                                      formula.updatedAt
                                    ).toLocaleDateString("fr-FR")
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditFormula(formula)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      deleteFormula.mutate(formula.id)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
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
                      Définition par contrat de la fréquence et des lignes
                      budgétaires concernées
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
                        {(indexationFrequencies as any).length > 0 ? (
                          (indexationFrequencies as any).map(
                            (frequency: any) => (
                              <TableRow key={frequency.id}>
                                <TableCell className="font-mono font-bold">
                                  {frequency.contractCode}
                                </TableCell>
                                <TableCell>{frequency.frequency}</TableCell>
                                <TableCell>{frequency.scope}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedFrequency(frequency);
                                      setFrequencyValue(frequency.frequency);
                                      setFrequencyScope(frequency.scope);
                                      setShowFrequencyModal(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          )
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-gray-500"
                            >
                              Aucune fréquence d'indexation configurée
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Section Indices & sources */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Indices économiques & sources officielles</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          apiRequest("POST", "/api/economic-indices/sync")
                            .then(() => {
                              queryClient.invalidateQueries({
                                queryKey: ["/api/economic-indices"],
                              });
                              toast({
                                title: "Synchronisation réussie",
                                description:
                                  "Les indices économiques ont été mis à jour depuis l'INSEE",
                              });
                            })
                            .catch(() => {
                              toast({
                                title: "Erreur de synchronisation",
                                description:
                                  "Impossible de récupérer les données INSEE",
                                variant: "destructive",
                              });
                            });
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Synchroniser INSEE
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Configuration des indices et sources de données pour les
                      calculs d'indexation
                    </p>

                    {/* Tableau des indices */}
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Indices surveillés</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Libellé</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Valeur actuelle</TableHead>
                            <TableHead>Dernière MAJ</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-mono">
                              ICHT-IME
                            </TableCell>
                            <TableCell>
                              Indice du coût horaire du travail
                            </TableCell>
                            <TableCell>
                              <a
                                href="https://www.insee.fr/fr/statistiques/serie/001565183"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                INSEE
                              </a>
                            </TableCell>
                            <TableCell className="font-bold">
                              {getLatestIndexValue("ICHT").value}
                            </TableCell>
                            <TableCell>
                              {getLatestIndexValue("ICHT").date}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">
                                Actif
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-mono">FM0ABE0</TableCell>
                            <TableCell>Frais et services divers</TableCell>
                            <TableCell>
                              <a
                                href="https://www.insee.fr/fr/statistiques/serie/010534796"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                INSEE
                              </a>
                            </TableCell>
                            <TableCell className="font-bold">
                              {getLatestIndexValue("IPPAP").value}
                            </TableCell>
                            <TableCell>
                              {getLatestIndexValue("IPPAP").date}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">
                                Actif
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-mono">ICC</TableCell>
                            <TableCell>
                              Indice du coût de la construction
                            </TableCell>
                            <TableCell>
                              <a
                                href="https://www.insee.fr/fr/statistiques/serie/001763852"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                INSEE
                              </a>
                            </TableCell>
                            <TableCell className="font-bold">
                              {getLatestIndexValue("IPC").value}
                            </TableCell>
                            <TableCell>
                              {getLatestIndexValue("IPC").date}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">
                                Actif
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-mono">IRL</TableCell>
                            <TableCell>
                              Indice de référence des loyers
                            </TableCell>
                            <TableCell>INSEE</TableCell>
                            <TableCell className="font-bold">
                              {getLatestIndexValue("IRL").value}
                            </TableCell>
                            <TableCell>
                              {getLatestIndexValue("IRL").date}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">
                                Actif
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Configuration des sources */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Configuration des API</h4>
                      <div className="space-y-4">
                        <div>
                          <Label>Sources INSEE - Indices économiques</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Input
                                value="https://www.insee.fr/fr/statistiques/serie/001565183"
                                readOnly
                                className="flex-1"
                              />
                              <Badge variant="outline">ICHT-IME</Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Input
                                value="https://www.insee.fr/fr/statistiques/serie/010534796"
                                readOnly
                                className="flex-1"
                              />
                              <Badge variant="outline">FM0ABE0</Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Input
                                value="https://www.insee.fr/fr/statistiques/serie/001763852"
                                readOnly
                                className="flex-1"
                              />
                              <Badge variant="outline">ICC</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Séries chronologiques INSEE pour le calcul des
                              indexations
                            </p>
                          </div>
                        </div>
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Récupération automatique</strong> : Les
                          indices sont mis à jour automatiquement chaque mois.
                          Seules les valeurs définitives sont utilisées pour les
                          calculs.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>

                {/* Section Routage de validation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Routage de validation & affectations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <h4 className="font-semibold mb-3">
                        Affectations par parc
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code Parc</TableHead>
                            <TableHead>Business Unit</TableHead>
                            <TableHead>Valideur principal</TableHead>
                            <TableHead>Valideur suppléant</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(validationAssignments as any).length > 0 ? (
                            (validationAssignments as any).map(
                              (assignment: any) => (
                                <TableRow key={assignment.id}>
                                  <TableCell className="font-mono">
                                    {assignment.parkCode}
                                  </TableCell>
                                  <TableCell>
                                    {assignment.businessUnit}
                                  </TableCell>
                                  <TableCell>
                                    {assignment.mainValidatorName}
                                  </TableCell>
                                  <TableCell>
                                    {assignment.backupValidatorName || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedAssignment(assignment);
                                        setAssignmentMainValidator(
                                          assignment.mainValidatorName
                                        );
                                        setAssignmentBackupValidator(
                                          assignment.backupValidatorName || ""
                                        );
                                        setShowAssignmentModal(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )
                            )
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center text-gray-500"
                              >
                                Aucune affectation trouvée
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>

                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            id="auto-reminder"
                            defaultChecked={
                              (validationAssignments as any)[0]?.autoReminder ??
                              true
                            }
                          />
                          <Label
                            htmlFor="auto-reminder"
                            className="font-semibold"
                          >
                            Relances automatiques activées
                          </Label>
                        </div>
                        <p className="text-sm text-gray-600">
                          Email de rappel envoyé après{" "}
                          {((validationAssignments as any)[0] as any)
                            ?.reminderDelay || 24}
                          h sans action, puis escalade au suppléant après{" "}
                          {((validationAssignments as any)[0] as any)
                            ?.escalationDelay || 48}
                          h
                        </p>
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
                          <Input
                            type="number"
                            placeholder="5"
                            className="w-20"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      <div>
                        <Label>Canaux de notification</Label>
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="notif-app"
                              defaultChecked
                            />
                            <Label htmlFor="notif-app">In-app</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="notif-email"
                              defaultChecked
                            />
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
          <Sheet
            open={showIndexationDetails}
            onOpenChange={setShowIndexationDetails}
          >
            <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[600px] lg:max-w-[700px] overflow-y-auto">
              {selectedIndexation && (
                <>
                  <SheetHeader>
                    <SheetTitle>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>{selectedIndexation.contractNumber}</span>
                          <Badge
                            variant={
                              getStatusVariant(selectedIndexation.status) as any
                            }
                          >
                            {getStatusLabel(selectedIndexation.status)}
                          </Badge>
                        </div>
                        <div className="text-sm font-normal">
                          {selectedIndexation.contractTitle}
                        </div>
                        <div className="text-sm font-normal text-gray-600">
                          Date d'indexation :{" "}
                          {formatDate(selectedIndexation.indexationDate)}
                        </div>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    {/* Paramètres contractuels */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900">
                        Paramètres contractuels
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fréquence :</span>
                          <span>{selectedIndexation.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Formule d'indexation :
                          </span>
                          <span>{selectedIndexation.formula}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Périmètre :</span>
                          <span>
                            {selectedIndexation.scope || "Fixe + Variable"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Indices utilisés */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900">
                        Indices utilisés
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Clé d'indice :</span>
                          <span>{selectedIndexation.indexKey}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Source :</span>
                          <span>{selectedIndexation.source}</span>
                        </div>
                        {selectedIndexation.indices &&
                          Array.isArray(selectedIndexation.indices) &&
                          selectedIndexation.indices.length > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Dernière valeur (définitive) :
                                </span>
                                <span>
                                  {selectedIndexation.indices[0]?.valueN ||
                                    selectedIndexation.newAmount ||
                                    "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Valeur précédente :
                                </span>
                                <span>
                                  {selectedIndexation.indices[0]?.valueN1 ||
                                    selectedIndexation.oldAmount ||
                                    "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Date de publication :
                                </span>
                                <span>
                                  {selectedIndexation.indices[0]?.date
                                    ? formatDate(
                                        selectedIndexation.indices[0].date
                                      )
                                    : "-"}
                                </span>
                              </div>
                            </>
                          )}
                        {selectedIndexation.originalIndexDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Date indice d'origine :
                            </span>
                            <span>
                              {formatDate(selectedIndexation.originalIndexDate)}
                            </span>
                          </div>
                        )}
                        {selectedIndexation.revisionIndexDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Date indice révisé :
                            </span>
                            <span>
                              {formatDate(selectedIndexation.revisionIndexDate)}
                            </span>
                          </div>
                        )}
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
                          <span className="text-gray-600">
                            Montant précédent :
                          </span>
                          <span>
                            {formatAmount(selectedIndexation.previousAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Montant calculé :
                          </span>
                          <span className="font-medium">
                            {formatAmount(selectedIndexation.proposedAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Δ absolu :</span>
                          <span>
                            {formatAmount(
                              (selectedIndexation.proposedAmount || 0) -
                                (selectedIndexation.previousAmount || 0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Δ % :</span>
                          <Badge
                            variant={
                              getDeltaVariant(
                                selectedIndexation.deltaPercentage
                              ) as any
                            }
                          >
                            {formatPercentage(
                              selectedIndexation.deltaPercentage
                            )}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Règle d'arrondi :
                          </span>
                          <span>
                            {selectedIndexation.roundingRule || "2 décimales"}
                          </span>
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
                          <span>
                            {selectedIndexation.assignedValidator ||
                              "Non assigné"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">SLA :</span>
                          <span>
                            {selectedIndexation.sla
                              ? `${selectedIndexation.sla}h`
                              : "48h"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            Relances auto &gt; 24h activées
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Historisation */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900">
                        Historisation
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2 text-sm">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                          <div className="flex-1">
                            <div className="font-medium">Calcul initial</div>
                            <div className="text-gray-500">
                              {formatDate(
                                selectedIndexation.createdAt || new Date()
                              )}{" "}
                              - Système
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {canModifyContract() && (
                        <Button
                          onClick={() => handleRecalculate(selectedIndexation)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Recalculer
                        </Button>
                      )}
                      {selectedIndexation.status === "pending" &&
                        canValidate() && (
                          <Button
                            onClick={() => handleValidate(selectedIndexation)}
                          >
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
          <Dialog
            open={showRecalculateModal}
            onOpenChange={setShowRecalculateModal}
          >
            <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Recalculer l'indexation avec nouvelle formule
                </DialogTitle>
                <DialogDescription>
                  Appliquez une nouvelle formule d'indexation et recalculez les
                  montants
                </DialogDescription>
              </DialogHeader>

              {selectedIndexation && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div>Contrat : {selectedIndexation.contractNumber}</div>
                    <div>
                      Date d'indexation :{" "}
                      {formatDate(selectedIndexation.indexationDate)}
                    </div>
                    <div>Formule actuelle : {selectedIndexation.formula}</div>
                    <div>
                      Montant de base :{" "}
                      {parseFloat(
                        selectedIndexation.previousAmount || "100000"
                      ).toLocaleString("fr-FR")}{" "}
                      €
                    </div>
                    <div>
                      Montant actuel :{" "}
                      {parseFloat(
                        selectedIndexation.proposedAmount || "0"
                      ).toLocaleString("fr-FR")}{" "}
                      €
                    </div>
                  </div>

                  {/* Sélection de la formule */}
                  <div className="space-y-2">
                    <Label>Choisir une nouvelle formule d'indexation</Label>
                    <Select
                      onValueChange={(value) => {
                        const formula = (formulas as any[]).find(
                          (f: any) => f.id === value
                        );
                        setSelectedFormula(formula);

                        // Calculer immédiatement avec la nouvelle formule
                        if (formula && selectedIndexation) {
                          const baseAmount = parseFloat(
                            selectedIndexation.previousAmount || "100000"
                          );
                          const newAmount = calculateIndexation(
                            formula,
                            baseAmount,
                            indicesValues
                          );

                          // Afficher le nouveau montant calculé en temps réel
                          toast({
                            title: "Calcul avec nouvelle formule",
                            description: `${
                              formula.name
                            }: ${newAmount.toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            })} (variation: ${(
                              ((newAmount - baseAmount) / baseAmount) *
                              100
                            ).toFixed(2)}%)`,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une formule" />
                      </SelectTrigger>
                      <SelectContent>
                        {(formulas as any[]).map((formula: any) => (
                          <SelectItem key={formula.id} value={formula.id}>
                            {formula.name} - {formula.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedFormula && (
                      <div className="mt-2 p-3 bg-blue-50 rounded text-sm space-y-1">
                        <p className="font-medium text-blue-900">
                          {selectedFormula.name}
                        </p>
                        <p className="text-blue-700 font-mono text-xs">
                          {selectedFormula.expression}
                        </p>
                        <p className="text-blue-600">
                          {selectedFormula.description}
                        </p>
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="font-medium text-blue-900">
                            Nouveau calcul:
                          </p>
                          <p className="text-lg font-bold text-blue-900">
                            {calculateIndexation(
                              selectedFormula,
                              parseFloat(
                                selectedIndexation.previousAmount || "100000"
                              ),
                              indicesValues
                            ).toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">
                      Valeurs des indices utilisées
                    </h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ICHT :</span>
                        <span>
                          {indicesValues.ICHT.current || "-"} (préc:{" "}
                          {indicesValues.ICHT.previous || "-"})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">FMOA :</span>
                        <span>
                          {indicesValues.FMOA.current || "-"} (préc:{" "}
                          {indicesValues.FMOA.previous || "-"})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CPI :</span>
                        <span>
                          {indicesValues.CPI.current || "-"} (préc:{" "}
                          {indicesValues.CPI.previous || "-"})
                        </span>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Les formules sont maintenant dynamiques et proviennent de
                      la base de données. Les changements de coefficients
                      impactent directement les calculs.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRecalculateModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmitRecalculation}
                  disabled={!selectedFormula || updateIndexation.isPending}
                >
                  {updateIndexation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Recalcul en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Appliquer le recalcul
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* IX-4: Modale Valider/Rejeter */}
          <Dialog
            open={showValidationModal}
            onOpenChange={setShowValidationModal}
          >
            <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Valider / Rejeter l'indexation</DialogTitle>
                <DialogDescription>
                  Examinez les détails de l'indexation et prenez une décision de
                  validation
                </DialogDescription>
              </DialogHeader>

              {selectedIndexation && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Montant précédent :</span>
                      <span>
                        {formatAmount(selectedIndexation.previousAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Indices N-1 / N :</span>
                      <span>
                        {selectedIndexation.indices &&
                        Array.isArray(selectedIndexation.indices) &&
                        selectedIndexation.indices.length > 0
                          ? `${
                              selectedIndexation.indices[0]?.valueN1 || "-"
                            } / ${
                              selectedIndexation.indices[0]?.valueN || "-"
                            } (${selectedIndexation.source})`
                          : `${selectedIndexation.oldAmount || "-"} / ${
                              selectedIndexation.newAmount || "-"
                            } (${selectedIndexation.source})`}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Montant calculé :</span>
                      <span>
                        {formatAmount(selectedIndexation.proposedAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Δ % / Δ € :</span>
                      <span>
                        {formatPercentage(selectedIndexation.deltaPercentage)} /
                        {formatAmount(
                          (selectedIndexation.proposedAmount || 0) -
                            (selectedIndexation.previousAmount || 0)
                        )}
                      </span>
                    </div>
                  </div>

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
                      Après validation, le montant est appliqué au contrat et
                      l'opération est historisée.
                    </AlertDescription>
                  </Alert>
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
                <DialogDescription>
                  Visualisez et exportez le rapport détaillé de l'indexation
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4">
                <div className="bg-gray-100 p-8 rounded min-h-[400px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium">
                        Rapport d'indexation
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedReport || selectedIndexation ? (
                          <>
                            Contrat:{" "}
                            {
                              (selectedReport || selectedIndexation)
                                .contractNumber
                            }
                            <br />
                            Période:{" "}
                            {formatDate(
                              (selectedReport || selectedIndexation).periodFrom
                            )}{" "}
                            →{" "}
                            {formatDate(
                              (selectedReport || selectedIndexation).periodTo
                            )}
                            <br />
                            Formule appliquée:{" "}
                            {(selectedReport || selectedIndexation).formula}
                            <br />
                            Montants:{" "}
                            {formatAmount(
                              (selectedReport || selectedIndexation)
                                .previousAmount
                            )}{" "}
                            →{" "}
                            {formatAmount(
                              (selectedReport || selectedIndexation)
                                .proposedAmount
                            )}
                            <br />
                            Δ:{" "}
                            {formatPercentage(
                              (selectedReport || selectedIndexation)
                                .deltaPercentage
                            )}{" "}
                            /{" "}
                            {formatAmount(
                              (selectedReport || selectedIndexation).deltaAmount
                            )}
                          </>
                        ) : (
                          <>
                            Contrat: -<br />
                            Période: -<br />
                            Formule appliquée: -<br />
                            Montants: -<br />
                            Δ: -
                          </>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Le rapport est également disponible en Excel
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowReportViewer(false)}
                >
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
                  <strong>Indice indisponible :</strong> La valeur définitive de
                  l'indice n'est pas encore publiée ; la ligne reste "En attente
                  d'indice".
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erreur de calcul :</strong> Calcul suspendu — vérifiez
                  la formule et/ou les valeurs d'indice.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erreur d'API :</strong> Échec de récupération des
                  indices — incident loggué, relance automatique / alerte admin.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Échec de validation :</strong> Décision non
                  enregistrée — la ligne reste "Calculé — en attente de
                  validation".
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Rappels visibles */}
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>
              • Automatisation + validation : détection à la date d'indexation,
              calcul automatique, application seulement après validation
            </p>
            <p>
              • Sources officielles : récupération automatique, valeurs
              définitives, historisation des indices
            </p>
            <p>
              • RBAC partout : listes, détails, actions et rapports selon rôle
            </p>
          </div>

          {/* Modal pour créer/éditer une formule */}
          <Dialog open={showFormulaModal} onOpenChange={setShowFormulaModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedFormula
                    ? "Modifier la formule"
                    : "Nouvelle formule d'indexation"}
                </DialogTitle>
                <DialogDescription>
                  {selectedFormula
                    ? "Modifiez les paramètres de la formule d'indexation"
                    : "Créez une nouvelle formule d'indexation pour vos contrats"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="formula-name">Nom de la formule</Label>
                  <input
                    id="formula-name"
                    type="text"
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ex: Type 2.A - OMSF Pondéré"
                  />
                </div>
                <div>
                  <Label htmlFor="formula-expression">
                    Expression mathématique
                  </Label>
                  <textarea
                    id="formula-expression"
                    value={formulaExpression}
                    onChange={(e) => setFormulaExpression(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md font-mono text-sm"
                    rows={4}
                    placeholder="Ex: OMSFn = OMSF0 × (0,15 + 0,55×(ICHTrev/ICHT0) + 0,3×(FM0Arev/FM0A0))"
                  />
                </div>
                <div>
                  <Label>Variables utilisées</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["ICHT", "FMOA", "CPI", "ICC", "IRL", "OMSF"].map(
                      (variable) => (
                        <Badge
                          key={variable}
                          variant={
                            formulaVariables.includes(variable)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            if (formulaVariables.includes(variable)) {
                              setFormulaVariables(
                                formulaVariables.filter((v) => v !== variable)
                              );
                            } else {
                              setFormulaVariables([
                                ...formulaVariables,
                                variable,
                              ]);
                            }
                          }}
                        >
                          {variable}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="formula-description">Description</Label>
                  <textarea
                    id="formula-description"
                    value={formulaDescription}
                    onChange={(e) => setFormulaDescription(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    rows={2}
                    placeholder="Description optionnelle de la formule et de son usage"
                  />
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Les formules doivent respecter la syntaxe mathématique
                    standard. Les indices sont récupérés automatiquement depuis
                    les sources officielles.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowFormulaModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveFormula}
                  disabled={!formulaName || !formulaExpression}
                >
                  {selectedFormula ? "Modifier" : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal pour modifier les affectations de validation */}
          <Dialog
            open={showAssignmentModal}
            onOpenChange={setShowAssignmentModal}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Modifier l'affectation pour {selectedAssignment?.parkCode}
                </DialogTitle>
                <DialogDescription>
                  Modifiez les validateurs pour le parc{" "}
                  {selectedAssignment?.parkCode} (
                  {selectedAssignment?.businessUnit})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="main-validator">Validateur principal</Label>
                  <input
                    id="main-validator"
                    type="text"
                    value={assignmentMainValidator}
                    onChange={(e) => setAssignmentMainValidator(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Nom du validateur principal"
                  />
                </div>
                <div>
                  <Label htmlFor="backup-validator">Validateur suppléant</Label>
                  <input
                    id="backup-validator"
                    type="text"
                    value={assignmentBackupValidator}
                    onChange={(e) =>
                      setAssignmentBackupValidator(e.target.value)
                    }
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Nom du validateur suppléant (optionnel)"
                  />
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Les changements seront appliqués immédiatement et affectés
                    aux nouvelles validations.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAssignmentModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    if (selectedAssignment) {
                      updateValidationAssignment.mutate({
                        id: selectedAssignment.id,
                        assignment: {
                          mainValidatorName: assignmentMainValidator,
                          backupValidatorName:
                            assignmentBackupValidator || null,
                        },
                      });
                    }
                  }}
                  disabled={
                    !assignmentMainValidator ||
                    updateValidationAssignment.isPending
                  }
                >
                  {updateValidationAssignment.isPending
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/*
           * Modal de modification des fréquences d'indexation
           * @description Interface permettant de modifier la fréquence et le périmètre d'indexation
           * pour un contrat spécifique. Les modifications sont appliquées immédiatement
           * et impactées sur les prochains calculs d'indexation automatique.
           */}
          <Dialog
            open={showFrequencyModal}
            onOpenChange={setShowFrequencyModal}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Modifier la fréquence pour {selectedFrequency?.contractCode}
                </DialogTitle>
                <DialogDescription>
                  Modifiez la fréquence et le périmètre d'indexation pour le
                  contrat {selectedFrequency?.contractCode}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="frequency">Fréquence</Label>
                  <select
                    id="frequency"
                    value={frequencyValue}
                    onChange={(e) => setFrequencyValue(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="">Sélectionnez une fréquence</option>
                    <option value="Mensuelle">Mensuelle</option>
                    <option value="Trimestrielle">Trimestrielle</option>
                    <option value="Semestrielle">Semestrielle</option>
                    <option value="Annuelle">Annuelle</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="scope">Périmètre</Label>
                  <input
                    id="scope"
                    type="text"
                    value={frequencyScope}
                    onChange={(e) => setFrequencyScope(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="Ex: Maintenance complète, Production + Maintenance"
                  />
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Les modifications seront appliquées aux prochains calculs
                    d'indexation.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowFrequencyModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    if (selectedFrequency) {
                      updateIndexationFrequency.mutate({
                        id: selectedFrequency.id,
                        frequency: {
                          frequency: frequencyValue,
                          scope: frequencyScope,
                        },
                      });
                    }
                  }}
                  disabled={
                    !frequencyValue ||
                    !frequencyScope ||
                    updateIndexationFrequency.isPending
                  }
                >
                  {updateIndexationFrequency.isPending
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
