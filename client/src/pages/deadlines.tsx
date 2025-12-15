import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  Download,
  Eye,
  Bell,
  AlertTriangle,
  RotateCcw,
  Save,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { Deadline } from "@shared/schema";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";

export default function Deadlines() {
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<any>(null);
  const [exportColumns, setExportColumns] = useState({
    contract: true,
    type: true,
    date: true,
    jMinus: true,
    responsible: true,
    status: true,
    alertChannel: true,
    lastSent: true,
  });
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");

  // Nouveaux états pour les modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAlertConfigModal, setShowAlertConfigModal] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({
    contractId: "",
    type: "end_contract",
    date: new Date().toISOString().split("T")[0],
    responsible: "",
    alertChannel: "email",
    alertAdvance: "30",
  });
  const [alertConfig, setAlertConfig] = useState({
    channels: {
      email: true,
      teams: false,
      inApp: true,
    },
    timing: {
      j30: true,
      j7: true,
      j1: true,
      jPlus: false,
    },
    recipients: [] as string[],
  });

  const { data: deadlines = [], isLoading } = useQuery<Deadline[]>({
    queryKey: ["/api/deadlines"],
  });

  // Récupération des utilisateurs pour les sélecteurs
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Calcul des KPIs
  const kpis = {
    j30: deadlines.filter(
      (d) => d.daysRemaining <= 30 && d.daysRemaining > 7
    ).length,
    j7: deadlines.filter(
      (d) => d.daysRemaining <= 7 && d.daysRemaining > 1
    ).length,
    j1: deadlines.filter(
      (d) => d.daysRemaining <= 1 && d.daysRemaining >= 0
    ).length,
    late: deadlines.filter((d) => d.daysRemaining < 0).length,
  };

  const filteredDeadlines = deadlines.filter((deadline) => {
    const matchesSearch =
      searchTerm === "" ||
      (deadline.contractNumber &&
        deadline.contractNumber
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));
    const matchesPeriod =
      periodFilter === "all" ||
      (periodFilter === "j30" &&
        deadline.daysRemaining <= 30 &&
        deadline.daysRemaining > 7) ||
      (periodFilter === "j7" &&
        deadline.daysRemaining <= 7 &&
        deadline.daysRemaining > 1) ||
      (periodFilter === "j1" &&
        deadline.daysRemaining <= 1 &&
        deadline.daysRemaining >= 0) ||
      (periodFilter === "late" && deadline.daysRemaining < 0);
    const matchesType = typeFilter === "all" || deadline.type === typeFilter;

    // responsibleFilter & statusFilter peuvent être raccordés au backend ensuite
    return matchesSearch && matchesPeriod && matchesType;
  });

  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return "N/A";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "N/A";
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(dateObj);
    } catch {
      return "N/A";
    }
  };

  const formatDateTime = (date: Date | string | undefined | null) => {
    if (!date) return "N/A";
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return "N/A";
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
    } catch {
      return "N/A";
    }
  };

  const getDaysVariant = (days: number) => {
    if (days < 0) return "destructive";
    if (days <= 1) return "destructive";
    if (days <= 7) return "secondary";
    if (days <= 30) return "outline";
    return "default";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "end_contract":
        return "Fin de contrat";
      case "anniversary":
        return "Date anniversaire";
      case "amendment":
        return "Fin d'avenant";
      default:
        return type;
    }
  };

  const handleShowDetails = (deadline: any) => {
    setSelectedDeadline(deadline);
    setShowDetailsPanel(true);
  };

  const handleExport = () => {
    console.log(
      "Export avec colonnes:",
      exportColumns,
      "Format:",
      exportFormat
    );
    setShowExportModal(false);
  };

  const resetFilters = () => {
    setPeriodFilter("all");
    setTypeFilter("all");
    setResponsibleFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={resetFilters}
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
        >
          <RotateCcw className="w-4 h-4" />
          Réinitialiser
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowCreateModal(true)}
          data-testid="button-create-deadline"
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
        >
          <Calendar className="w-4 h-4" />
          Nouvelle échéance
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAlertConfigModal(true)}
          data-testid="button-config-alerts"
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
        >
          <Bell className="w-4 h-4" />
          Configurer alertes
        </Button>
        <Button
          variant="default"
          onClick={() => setShowExportModal(true)}
          data-testid="button-export"
          className="gap-2 text-xs bg-[var(--klyxor-bleu-nuit,#111827)] text-white hover:bg-slate-900"
        >
          <Download className="w-4 h-4" />
          Exporter
        </Button>
      </div>
    );
  };

  return (
    <>
      <KlyxorPageLayout
        title="Échéances"
        subtitle="Suivi des dates clés des contrats et alertes associées."
        actions={renderHeaderActions}
      >
        {(theme) => {
          const {
            heroCardClass,
            sectionCardClass,
            tableHeaderClass,
            tableRowHoverClass,
            primaryText,
            secondaryText,
            mutedText,
            isDark,
          } = theme;

          const tableRowClass = (base?: string) =>
            tableRowHoverClass(
              cn(base, isDark ? "border-slate-800" : "border-slate-100"),
            );

          // Loader intégré dans cockpit
          if (isLoading && deadlines.length === 0) {
            return (
              <Card className={sectionCardClass}>
                <CardContent className="p-6 text-center text-sm">
                  <span className={cn("text-sm", mutedText)}>
                    Chargement des échéances…
                  </span>
                </CardContent>
              </Card>
            );
          }

          return (
            <>
              {/* HERO – résumé global échéances */}
              <Card className={heroCardClass}>
                <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr,1fr]">
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "text-xs font-medium",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      Vue globale des échéances
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      {deadlines.length} échéance(s) au total • {kpis.j30} à 30
                      j • {kpis.j7} à 7 j • {kpis.j1} à 1 j • {kpis.late} en
                      retard
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs">
                    <HeroKpi
                      label="À 30 jours"
                      value={kpis.j30}
                      icon={<Calendar className="w-3.5 h-3.5" />}
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="À 7 jours"
                      value={kpis.j7}
                      icon={<Clock className="w-3.5 h-3.5" />}
                      tone="warning"
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="À 1 jour / En retard"
                      value={kpis.j1 + kpis.late}
                      icon={<AlertTriangle className="w-3.5 h-3.5" />}
                      tone="danger"
                      isDark={isDark}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Mini KPI sous forme de tuiles */}
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-4">
                <MiniKpi
                  label="À 30 j"
                  value={kpis.j30}
                  isDark={isDark}
                />
                <MiniKpi
                  label="À 7 j"
                  value={kpis.j7}
                  tone="warning"
                  isDark={isDark}
                />
                <MiniKpi
                  label="À 1 j"
                  value={kpis.j1}
                  tone="danger"
                  isDark={isDark}
                />
                <MiniKpi
                  label="En retard"
                  value={kpis.late}
                  tone="danger"
                  isDark={isDark}
                />
              </div>

              {/* Barre de filtres */}
              <Card className={sectionCardClass}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      {/* Période */}
                      <Select
                        value={periodFilter}
                        onValueChange={setPeriodFilter}
                      >
                        <SelectTrigger
                          className="w-[180px]"
                          data-testid="select-period"
                        >
                          <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Toutes les périodes
                          </SelectItem>
                          <SelectItem value="j30">À 30 jours</SelectItem>
                          <SelectItem value="j7">À 7 jours</SelectItem>
                          <SelectItem value="j1">À 1 jour</SelectItem>
                          <SelectItem value="late">En retard</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Type d'échéance */}
                      <Select
                        value={typeFilter}
                        onValueChange={setTypeFilter}
                      >
                        <SelectTrigger
                          className="w-[200px]"
                          data-testid="select-type"
                        >
                          <SelectValue placeholder="Type d'échéance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="end_contract">
                            Fin de contrat
                          </SelectItem>
                          <SelectItem value="anniversary">
                            Date anniversaire
                          </SelectItem>
                          <SelectItem value="amendment">
                            Fin d'avenant
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Responsable */}
                      <Select
                        value={responsibleFilter}
                        onValueChange={setResponsibleFilter}
                      >
                        <SelectTrigger
                          className="w-[180px]"
                          data-testid="select-responsible"
                        >
                          <SelectValue placeholder="Responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Tous les responsables
                          </SelectItem>
                          {users.map((user: any) => (
                            <SelectItem
                              key={user.id}
                              value={`${user.firstName} ${user.lastName}`}
                            >
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Statut */}
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger
                          className="w-[180px]"
                          data-testid="select-status"
                        >
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bandeau d'information */}
              <Alert className="mb-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Une notification est générée{" "}
                  <strong>30 jours avant</strong> l&apos;échéance (valeur
                  paramétrable).
                </AlertDescription>
              </Alert>

              {/* Liste / tableau */}
              <Card className={sectionCardClass}>
                <CardContent className="p-0">
                  {filteredDeadlines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Calendar className="w-16 h-16 text-gray-400 mb-4" />
                      <p className={cn("text-lg mb-2", primaryText)}>
                        Aucune échéance dans l&apos;intervalle
                      </p>
                      <p className={cn("text-sm mb-4", mutedText)}>
                        Ajustez vos filtres pour voir les échéances
                      </p>
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={resetFilters}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Réinitialiser les filtres
                        </Button>
                        <Button variant="link">
                          Paramétrer le délai d&apos;alerte dans les
                          préférences
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className={tableHeaderClass}>
                          <TableRow>
                            <TableHead>Contrat</TableHead>
                            <TableHead>Type d&apos;échéance</TableHead>
                            <TableHead>Date d&apos;échéance</TableHead>
                            <TableHead>J-</TableHead>
                            <TableHead>Responsable</TableHead>
                            <TableHead>Statut du contrat</TableHead>
                            <TableHead>Canal d&apos;alerte</TableHead>
                            <TableHead>Dernier envoi</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDeadlines
                            .slice(0, parseInt(itemsPerPage))
                            .map((deadline) => (
                              <TableRow
                                key={deadline.id}
                                data-testid={`row-deadline-${deadline.id}`}
                                className={tableRowClass("cursor-pointer")}
                                onClick={() => handleShowDetails(deadline)}
                              >
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {deadline.contractNumber}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Services informatiques
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {getTypeLabel(deadline.type)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {formatDate(deadline.date)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={getDaysVariant(
                                      deadline.daysRemaining
                                    )}
                                  >
                                    {deadline.daysRemaining < 0
                                      ? `Retard ${Math.abs(
                                          deadline.daysRemaining
                                        )}j`
                                      : `J-${deadline.daysRemaining}`}
                                  </Badge>
                                </TableCell>
                                <TableCell>Marie Martin</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">Actif</Badge>
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
                                      {formatDateTime(
                                        new Date(
                                          Date.now() - 24 * 60 * 60 * 1000
                                        )
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-400">
                                      -
                                    </span>
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
                        1-
                        {Math.min(
                          parseInt(itemsPerPage),
                          filteredDeadlines.length
                        )}{" "}
                        sur {filteredDeadlines.length}
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

              {/* Panneau latéral détail échéance */}
              <Sheet
                open={showDetailsPanel}
                onOpenChange={setShowDetailsPanel}
              >
                <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[500px] lg:max-w-[600px] overflow-y-auto">
                  {selectedDeadline && (
                    <>
                      <SheetHeader>
                        <SheetTitle>
                          <div className="flex items-center justify-between">
                            <span>
                              {getTypeLabel(selectedDeadline.type)}
                            </span>
                            <Badge
                              variant={getDaysVariant(
                                selectedDeadline.daysRemaining
                              )}
                            >
                              J-{selectedDeadline.daysRemaining}
                            </Badge>
                          </div>
                          <div className="text-sm font-normal text-gray-600 mt-2">
                            Date d&apos;échéance:{" "}
                            {formatDate(selectedDeadline.date)}
                          </div>
                        </SheetTitle>
                      </SheetHeader>

                      <div className="mt-6 space-y-6">
                        {/* Bloc Contrat lié */}
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">
                            Contrat lié
                          </h3>
                          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                Numéro:
                              </span>
                              <span className="text-sm font-medium">
                                {selectedDeadline.contractNumber}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                Intitulé:
                              </span>
                              <span className="text-sm font-medium">
                                Services informatiques
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                Statut:
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                Actif
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                Période:
                              </span>
                              <span className="text-sm">
                                01/01/2024 - 31/12/2024
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                Responsable:
                              </span>
                              <span className="text-sm">Marie Martin</span>
                            </div>
                          </div>
                        </div>

                        {/* Bloc Alertes & rappels */}
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">
                            Alertes & rappels
                          </h3>
                          <div className="space-y-2">
                            {selectedDeadline.notificationSent ? (
                              <>
                                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="w-4 h-4 text-green-600" />
                                    <span className="text-sm">
                                      Email envoyé
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {formatDateTime(
                                      new Date(
                                        Date.now() - 24 * 60 * 60 * 1000
                                      )
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <MessageSquare className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm">
                                      Teams notifié
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {formatDateTime(
                                      new Date(
                                        Date.now() - 24 * 60 * 60 * 1000
                                      )
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <Bell className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm">
                                      In-app généré
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {formatDateTime(
                                      new Date(
                                        Date.now() - 24 * 60 * 60 * 1000
                                      )
                                    )}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">
                                Aucune notification envoyée
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bloc Historique */}
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">
                            Historique (échéance)
                          </h3>
                          <div className="text-sm text-gray-600">
                            <p>
                              Création:{" "}
                              {formatDateTime(
                                new Date(
                                  Date.now() - 30 * 24 * 60 * 60 * 1000
                                )
                              )}
                            </p>
                            <p>
                              Dernier recalcul J-: {formatDateTime(new Date())}
                            </p>
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
            </>
          );
        }}
      </KlyxorPageLayout>

      {/* Modale Export */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exporter les échéances</DialogTitle>
            <DialogDescription>
              Sélectionnez les colonnes à exporter et le format de fichier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Rappel des filtres actifs */}
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p className="font-medium mb-2">Filtres actifs:</p>
              <p>Période: {periodFilter === "all" ? "Toutes" : periodFilter}</p>
              <p>
                Type: {typeFilter === "all" ? "Tous" : getTypeLabel(typeFilter)}
              </p>
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
                  responsible: "Responsable",
                  status: "Statut",
                  alertChannel: "Canal d'alerte",
                  lastSent: "Dernier envoi",
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={
                        exportColumns[key as keyof typeof exportColumns]
                      }
                      onCheckedChange={(checked) =>
                        setExportColumns({
                          ...exportColumns,
                          [key]: checked as boolean,
                        })
                      }
                    />
                    <Label
                      htmlFor={key}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Format de sortie */}
            <div className="space-y-2">
              <Label className="font-medium">Format de sortie:</Label>
              <Select
                value={exportFormat}
                onValueChange={(value: "xlsx" | "csv") =>
                  setExportFormat(value)
                }
              >
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
                value={`echeances_${new Date()
                  .toISOString()
                  .split("T")[0]
                  .replace(/-/g, "")}.${exportFormat}`}
                readOnly
                className="bg-gray-50"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                L&apos;export contient uniquement les données visibles selon vos
                droits.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleExport}>Générer l&apos;export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de création/modification de deadline */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent data-testid="create-deadline-modal">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle échéance</DialogTitle>
            <DialogDescription>
              Définissez une nouvelle échéance pour un contrat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deadline-contract">Contrat</Label>
              <Select
                value={deadlineForm.contractId}
                onValueChange={(v) =>
                  setDeadlineForm({ ...deadlineForm, contractId: v })
                }
              >
                <SelectTrigger id="deadline-contract">
                  <SelectValue placeholder="Sélectionnez un contrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnt-001">
                    CNT-2024-001 - Services informatiques
                  </SelectItem>
                  <SelectItem value="cnt-002">
                    CNT-2024-002 - Maintenance équipements
                  </SelectItem>
                  <SelectItem value="cnt-003">
                    CNT-2024-003 - Location bureaux
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deadline-type">Type d&apos;échéance</Label>
              <Select
                value={deadlineForm.type}
                onValueChange={(v) =>
                  setDeadlineForm({ ...deadlineForm, type: v })
                }
              >
                <SelectTrigger id="deadline-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_contract">Fin de contrat</SelectItem>
                  <SelectItem value="anniversary">
                    Date anniversaire
                  </SelectItem>
                  <SelectItem value="amendment">Fin d&apos;avenant</SelectItem>
                  <SelectItem value="review">Revue contractuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deadline-date">Date d&apos;échéance</Label>
              <Input
                id="deadline-date"
                type="date"
                value={deadlineForm.date}
                onChange={(e) =>
                  setDeadlineForm({ ...deadlineForm, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="deadline-responsible">Responsable</Label>
              <Input
                id="deadline-responsible"
                value={deadlineForm.responsible}
                onChange={(e) =>
                  setDeadlineForm({
                    ...deadlineForm,
                    responsible: e.target.value,
                  })
                }
                placeholder="Nom du responsable"
              />
            </div>
            <div>
              <Label htmlFor="deadline-channel">Canal d&apos;alerte</Label>
              <Select
                value={deadlineForm.alertChannel}
                onValueChange={(v) =>
                  setDeadlineForm({ ...deadlineForm, alertChannel: v })
                }
              >
                <SelectTrigger id="deadline-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="teams">Teams</SelectItem>
                  <SelectItem value="in-app">In-App</SelectItem>
                  <SelectItem value="all">Tous les canaux</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="deadline-advance">Préavis (jours)</Label>
              <Select
                value={deadlineForm.alertAdvance}
                onValueChange={(v) =>
                  setDeadlineForm({ ...deadlineForm, alertAdvance: v })
                }
              >
                <SelectTrigger id="deadline-advance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 jour</SelectItem>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="15">15 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                console.log("Création deadline:", deadlineForm);
                setShowCreateModal(false);
              }}
            >
              Créer l&apos;échéance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal configuration alertes */}
      <Dialog
        open={showAlertConfigModal}
        onOpenChange={setShowAlertConfigModal}
      >
        <DialogContent
          className="max-w-2xl"
          data-testid="alert-config-modal"
        >
          <DialogHeader>
            <DialogTitle>Configuration des alertes d&apos;échéance</DialogTitle>
            <DialogDescription>
              Définissez comment et quand vous souhaitez être notifié des
              échéances
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Canaux de notification</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="channel-email">Email</Label>
                  <input
                    type="checkbox"
                    id="channel-email"
                    checked={alertConfig.channels.email}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        channels: {
                          ...alertConfig.channels,
                          email: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="channel-teams">Microsoft Teams</Label>
                  <input
                    type="checkbox"
                    id="channel-teams"
                    checked={alertConfig.channels.teams}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        channels: {
                          ...alertConfig.channels,
                          teams: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="channel-app">Notifications in-app</Label>
                  <input
                    type="checkbox"
                    id="channel-app"
                    checked={alertConfig.channels.inApp}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        channels: {
                          ...alertConfig.channels,
                          inApp: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Périodes d&apos;alerte</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="timing-j30">30 jours avant</Label>
                  <input
                    type="checkbox"
                    id="timing-j30"
                    checked={alertConfig.timing.j30}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        timing: {
                          ...alertConfig.timing,
                          j30: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="timing-j7">7 jours avant</Label>
                  <input
                    type="checkbox"
                    id="timing-j7"
                    checked={alertConfig.timing.j7}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        timing: {
                          ...alertConfig.timing,
                          j7: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="timing-j1">1 jour avant</Label>
                  <input
                    type="checkbox"
                    id="timing-j1"
                    checked={alertConfig.timing.j1}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        timing: {
                          ...alertConfig.timing,
                          j1: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="timing-jplus">Après échéance</Label>
                  <input
                    type="checkbox"
                    id="timing-jplus"
                    checked={alertConfig.timing.jPlus}
                    onChange={(e) =>
                      setAlertConfig({
                        ...alertConfig,
                        timing: {
                          ...alertConfig.timing,
                          jPlus: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">
                Destinataires supplémentaires
              </h4>
              <div className="text-sm text-muted-foreground mb-2">
                En plus du responsable du contrat, notifier :
              </div>
              <Input
                placeholder="Emails séparés par des virgules"
                onChange={(e) =>
                  setAlertConfig({
                    ...alertConfig,
                    recipients: e.target.value
                      .split(",")
                      .map((email) => email.trim()),
                  })
                }
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Les alertes sont envoyées à 8h00 (heure locale) pour chaque
                période configurée.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAlertConfigModal(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                console.log("Configuration alertes:", alertConfig);
                setShowAlertConfigModal(false);
              }}
            >
              Enregistrer la configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* === Petits composants KPI pour le hero / mini-ligne === */

function HeroKpi({
  label,
  value,
  icon,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  tone?: "default" | "warning" | "danger";
  isDark: boolean;
}) {
  const bg =
    tone === "danger"
      ? isDark
        ? "bg-red-500/10 border-red-500/40 text-red-100"
        : "bg-red-50 border-red-200 text-red-700"
      : tone === "warning"
      ? isDark
        ? "bg-amber-500/10 border-amber-500/40 text-amber-100"
        : "bg-amber-50 border-amber-200 text-amber-700"
      : isDark
      ? "bg-slate-950/40 border-slate-700 text-slate-100"
      : "bg-slate-50 border-slate-200 text-slate-800";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
        bg,
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "danger";
  isDark: boolean;
}) {
  const bg =
    tone === "danger"
      ? isDark
        ? "bg-red-500/15 text-red-200 border-red-500/40"
        : "bg-red-50 text-red-700 border-red-200"
      : tone === "warning"
      ? isDark
        ? "bg-amber-500/15 text-amber-100 border-amber-500/40"
        : "bg-amber-50 text-amber-700 border-amber-200"
      : isDark
      ? "bg-slate-900/60 text-slate-100 border-slate-700/60"
      : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px]",
        bg,
      )}
    >
      <div className="flex flex-col">
        <span className="truncate text-[10px] opacity-80">{label}</span>
        <span className="text-xs font-semibold">{value ?? 0}</span>
      </div>
    </div>
  );
}
