// client/src/pages/dashboard.tsx

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import Header from "@/components/layout/header";
import { PageHeaderKlyxor } from "@/components/layout/PageHeaderKlyxor";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { queryClient } from "@/lib/queryClient";
import { useKlyxorTheme } from "@/hooks/useKlyxorTheme";

import {
  FileText,
  Edit,
  XCircle,
  TrendingUp,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Bell,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Moon,
  Sun,
} from "lucide-react";

// Types simples (pour éviter le any partout, mais sans sur-typage)
type Contract = {
  id: string;
  contract_number?: string;
  number?: string;
  title?: string;
  contract_name?: string;
  status?: string;
  attachments?: unknown[] | null;
};

type ValidationRequest = {
  id: string;
  type: string;
  status: string;
  reference?: string;
  contractNumber?: string;
  subject?: string;
  requested_by?: string;
  requestedBy?: string;
  assigned_to?: string;
  assigned_to_username?: string;
  dueDate?: string;
  age?: number;
};

type Deadline = {
  id?: string;
  dueDate?: string;
  contractNumber?: string;
  contract_id?: string;
  client?: string;
};

type Alert = {
  id: string;
  severity?: "critical" | "warning" | string;
  title?: string;
  message?: string;
  contract_id?: string;
  createdAt?: string;
};

type Indexation = {
  id: string;
  status?: string;
  contractNumber?: string;
  contract_id?: string;
  contract?: string;
  formulaCode?: string;
  formula?: string;
};

type AuditLog = {
  id: string;
  user?: string;
  user_id?: string;
  action?: string;
  traceId?: string;
  contractNumber?: string;
  createdAt?: string;
  timestamp?: string | Date;
};

const formatDate = (d?: string | Date | null) => {
  if (!d) return "-";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { canValidate, canCreateContract, canExportData } = usePermissions();

  // Thème Klyxor centralisé
  const {
    isDark,
    toggleTheme,
    cockpitClass,
    heroCardClass,
    sectionCardClass,
    tableHeaderClass,
    tableRowHoverClass,
    primaryText,
    secondaryText,
    mutedText,
  } = useKlyxorTheme();

  // ---- DATA ----
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: validationRequests = [] } = useQuery<ValidationRequest[]>({
    queryKey: ["/api/validation-requests"],
  });

  const { data: deadlines = [] } = useQuery<Deadline[]>({
    queryKey: ["/api/deadlines"],
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: indexations = [] } = useQuery<Indexation[]>({
    queryKey: ["/api/indexations"],
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  // ---- KPI & dérivés ----

  const pendingValidations = useMemo(
    () => validationRequests.filter((r) => r.status === "pending"),
    [validationRequests],
  );

  const upcomingDeadlines = useMemo(
    () =>
      deadlines.filter(
        (d) => d.dueDate && new Date(d.dueDate) > new Date(),
      ),
    [deadlines],
  );

  const alertsFeed = useMemo(() => alerts ?? [], [alerts]);

  const contractsWithoutAttachments = useMemo(
    () =>
      contracts
        .filter((c) => !c.attachments || c.attachments.length === 0)
        .slice(0, 5),
    [contracts],
  );

  const kpi = useMemo(
    () => ({
      totalContracts: contracts.length,
      contractsToValidate: pendingValidations.filter(
        (r) => r.type === "contract",
      ).length,
      amendmentsToValidate: pendingValidations.filter(
        (r) => r.type === "amendment",
      ).length,
      terminationsToValidate: pendingValidations.filter(
        (r) => r.type === "termination",
      ).length,
      indexationsToValidate: pendingValidations.filter(
        (r) => r.type === "indexation",
      ).length,
      deadlines30: deadlines.filter((d) => {
        if (!d.dueDate) return false;
        const due = new Date(d.dueDate);
        const limit = new Date(
          Date.now() + 30 * 24 * 3600 * 1000,
        );
        return due <= limit;
      }).length,
      criticalAlerts: alertsFeed.filter(
        (a) => a.severity === "critical",
      ).length,
    }),
    [contracts.length, pendingValidations, deadlines, alertsFeed],
  );

  const indexationSummary = useMemo(
    () => ({
      toProcessThisMonth: indexations.filter(
        (i) => i.status === "pending",
      ).length,
      validated30d: indexations.filter(
        (i) => i.status === "validated",
      ).length,
      suspended: indexations.filter(
        (i) => i.status === "suspended" || i.status === "error",
      ).length,
    }),
    [indexations],
  );

  // ---- Navigation helpers ----

  const openContract = (contractNumber?: string | null) => {
    if (!contractNumber) return;
    navigate(`/contracts?search=${encodeURIComponent(contractNumber)}`);
  };

  const openIndexations = () => navigate("/indexations?tab=list");
  const openBilling = () => navigate("/billing-plans");
  const openContractsPage = () => navigate("/contracts");

  const lastRun = "2025-12-05 02:12";
  const nextRun = "2025-12-08 02:00";
  const batchStatus: "ok" | "warning" | "error" = "ok";

  // ---- RENDU ----

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <main className="flex-1 overflow-auto pb-8 pt-4">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-6">
          <div className={cockpitClass}>
            {/* Bandeau titre + toggle thème */}
            <PageHeaderKlyxor
              title={
                <span
                  className={cn(
                    "text-xl font-semibold tracking-tight",
                    primaryText,
                  )}
                >
                  Tableau de bord Klyxor
                </span>
              }
              subtitle={
                <span className={cn("text-sm", secondaryText)}>
                  Vue synthétique de l’activité contrats, facturation et alertes
                </span>
              }
              actions={
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium",
                      isDark
                        ? "border-slate-500/60 bg-slate-900/70 text-slate-100"
                        : "border-slate-300 bg-white text-slate-700",
                    )}
                  >
                    {user?.role || "Utilisateur"}
                  </Badge>

                  <Button
                    size="icon"
                    variant="outline"
                    className={cn(
                      "h-8 w-8 border text-xs",
                      isDark
                        ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                    )}
                    onClick={toggleTheme}
                    title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
                  >
                    {isDark ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>

                  {(canValidate || canCreateContract || canExportData) && (
                    <div
                      className={cn(
                        "hidden items-center gap-1 text-[10px] md:flex",
                        mutedText,
                      )}
                    >
                      {canValidate && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5",
                            isDark
                              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700",
                          )}
                        >
                          Validation
                        </span>
                      )}
                      {canCreateContract && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5",
                            isDark
                              ? "border border-blue-500/40 bg-blue-500/10 text-blue-200"
                              : "border border-blue-200 bg-blue-50 text-blue-700",
                          )}
                        >
                          Création contrats
                        </span>
                      )}
                      {canExportData && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5",
                            isDark
                              ? "border border-slate-500/40 bg-slate-500/10 text-slate-200"
                              : "border border-slate-200 bg-slate-50 text-slate-700",
                          )}
                        >
                          Export
                        </span>
                      )}
                    </div>
                  )}
                </div>
              }
            />

            {/* Bandeau overview */}
            <Card className={heroCardClass}>
              <CardContent className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
                <div className="flex flex-1 flex-col gap-1">
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs",
                      isDark ? "text-slate-300" : "text-slate-600",
                    )}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Batch automatique</span>
                    <span className="h-1 w-1 rounded-full bg-emerald-400" />
                    <span
                      className={cn(
                        "text-[11px]",
                        isDark ? "text-emerald-200" : "text-emerald-700",
                      )}
                    >
                      {batchStatus === "ok"
                        ? "Tâches planifiées actives"
                        : batchStatus === "warning"
                        ? "À surveiller"
                        : "Erreur"}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-sm",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    Dernier run&nbsp;: {lastRun} • Prochain&nbsp;: {nextRun}
                  </div>
                </div>

                <div className="grid flex-1 grid-cols-3 gap-2 text-xs">
                  <OverviewChip
                    label="Contrats actifs (approx.)"
                    value={kpi.totalContracts}
                    icon={<FileText className="h-3.5 w-3.5" />}
                    isDark={isDark}
                  />
                  <OverviewChip
                    label="Échéances &lt; 30j"
                    value={kpi.deadlines30}
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    tone="warning"
                    isDark={isDark}
                  />
                  <OverviewChip
                    label="Alertes critiques"
                    value={kpi.criticalAlerts}
                    icon={<AlertCircle className="h-3.5 w-3.5" />}
                    tone="danger"
                    isDark={isDark}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ligne KPI mini */}
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-6">
              <KpiChip
                label="Contrats à valider"
                value={kpi.contractsToValidate}
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="Avenants"
                value={kpi.amendmentsToValidate}
                icon={<Edit className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="Résiliations"
                value={kpi.terminationsToValidate}
                icon={<XCircle className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="Indexations à valider"
                value={kpi.indexationsToValidate}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="Échéances (30j)"
                value={kpi.deadlines30}
                icon={<Calendar className="h-3.5 w-3.5" />}
                tone="warning"
                isDark={isDark}
              />
              <KpiChip
                label="Alertes critiques"
                value={kpi.criticalAlerts}
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                tone="danger"
                isDark={isDark}
              />
            </div>

            {/* Grille principale : 2 colonnes */}
            <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
              {/* Colonne gauche : Contrats & validation */}
              <div className="space-y-4">
                {/* Bloc pipeline + quick actions */}
                <Card className={sectionCardClass}>
                  <CardContent className="px-4 py-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            secondaryText,
                          )}
                        >
                          Contrats & pipeline
                        </div>
                        <div className={cn("text-[11px]", mutedText)}>
                          Derniers contrats, négociations et validations à
                          traiter.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-7 px-3 text-[11px]",
                          isDark
                            ? "border-slate-600 bg-slate-900/40 text-slate-50 hover:bg-slate-800"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                        onClick={openContractsPage}
                      >
                        Voir tous les contrats
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Derniers actifs */}
                      <MiniColumn
                        title="Derniers actifs"
                        items={contracts.slice(0, 4).map((c) => ({
                          id: c.id,
                          main: c.contract_number || c.number || c.id,
                          sub: c.title || c.contract_name || "Sans titre",
                          onClick: () =>
                            openContract(
                              c.contract_number || c.number || c.id,
                            ),
                        }))}
                        isDark={isDark}
                      />

                      {/* Négociation */}
                      <MiniColumn
                        title="En négociation"
                        items={contracts
                          .filter((c) => c.status === "negotiation")
                          .slice(0, 4)
                          .map((c) => ({
                            id: c.id,
                            main: c.contract_number || c.number || c.id,
                            sub: c.title || c.contract_name || "Sans titre",
                            onClick: () =>
                              openContract(
                                c.contract_number || c.number || c.id,
                              ),
                          }))}
                        isDark={isDark}
                      />

                      {/* À valider */}
                      <MiniColumn
                        title="À valider"
                        items={pendingValidations.slice(0, 5).map((r) => ({
                          id: r.id,
                          main: r.reference || r.contractNumber || r.id,
                          sub: r.subject || r.type,
                          onClick: () =>
                            openContract(r.reference || r.contractNumber),
                        }))}
                        isDark={isDark}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Bloc file de validation détaillée */}
                <Card className={sectionCardClass}>
                  <CardContent className="px-4 py-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            secondaryText,
                          )}
                        >
                          File de validation
                        </div>
                        <div className={cn("text-[11px]", mutedText)}>
                          {pendingValidations.length} demande(s) en attente.
                        </div>
                      </div>
                      {canValidate && (
                        <Badge
                          className={cn(
                            "text-[10px] font-medium",
                            isDark
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          Rôle valideur
                        </Badge>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className={tableHeaderClass}>
                            <TableHead>Type</TableHead>
                            <TableHead>Contrat</TableHead>
                            <TableHead>Demandeur</TableHead>
                            <TableHead>Valideur</TableHead>
                            <TableHead>Échéance</TableHead>
                            <TableHead>Âge</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingValidations.slice(0, 10).map((r) => (
                            <TableRow
                              key={r.id}
                              className={tableRowHoverClass(
                                isDark
                                  ? "border-slate-800"
                                  : "border-slate-100",
                              )}
                              onClick={() =>
                                openContract(
                                  r.reference || r.contractNumber,
                                )
                              }
                            >
                              <TableCell className={cn("text-[11px]", primaryText)}>
                                {r.type}
                              </TableCell>
                              <TableCell className="text-[11px]">
                                <div
                                  className={cn(
                                    "font-mono",
                                    primaryText,
                                  )}
                                >
                                  {r.reference || r.contractNumber || "N/A"}
                                </div>
                                <div className={cn("text-[10px]", mutedText)}>
                                  {r.subject || "-"}
                                </div>
                              </TableCell>
                              <TableCell className={cn("text-[11px]", primaryText)}>
                                {r.requested_by || r.requestedBy || "-"}
                              </TableCell>
                              <TableCell className={cn("text-[11px]", primaryText)}>
                                {r.assigned_to ||
                                  r.assigned_to_username ||
                                  "-"}
                              </TableCell>
                              <TableCell className={cn("text-[11px]", primaryText)}>
                                {r.dueDate ? formatDate(r.dueDate) : "-"}
                              </TableCell>
                              <TableCell className={cn("text-[11px]", primaryText)}>
                                {r.age ? `${r.age}h` : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                          {pendingValidations.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className={cn(
                                  "py-3 text-center text-[11px]",
                                  mutedText,
                                )}
                              >
                                Aucune demande en attente.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Colonne droite : Facturation + alertes + activité */}
              <div className="space-y-4">
                {/* Bloc facturation & indexations */}
                <Card className={sectionCardClass}>
                  <CardContent className="px-4 py-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            secondaryText,
                          )}
                        >
                          Facturation & indexations
                        </div>
                        <div className={cn("text-[11px]", mutedText)}>
                          Échéances à 30 jours et statut des indexations.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-7 px-3 text-[11px]",
                          isDark
                            ? "border-slate-600 bg-slate-900/40 text-slate-50 hover:bg-slate-800"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                        onClick={() =>
                          queryClient.invalidateQueries({
                            queryKey: ["/api/indexations"],
                          })
                        }
                      >
                        Rafraîchir
                      </Button>
                    </div>

                    {/* Indexations mini KPIs */}
                    <div className="mb-3 grid grid-cols-3 gap-2 text-[11px]">
                      <MiniStat
                        label="À traiter ce mois"
                        value={indexationSummary.toProcessThisMonth}
                        isDark={isDark}
                      />
                      <MiniStat
                        label="Validées (30j)"
                        value={indexationSummary.validated30d}
                        tone="success"
                        isDark={isDark}
                      />
                      <MiniStat
                        label="Erreurs / suspendues"
                        value={indexationSummary.suspended}
                        tone="danger"
                        isDark={isDark}
                      />
                    </div>

                    {/* Échéances facturation */}
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <div
                        className={cn("font-medium", primaryText)}
                      >
                        Échéances de facturation &lt; 30j
                      </div>
                      <div className={cn(mutedText)}>
                        {upcomingDeadlines.length} échéance(s)
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className={tableHeaderClass}>
                            <TableHead>Contrat</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingDeadlines.slice(0, 8).map((d, i) => (
                            <TableRow
                              key={d.id || i}
                              className={tableRowHoverClass(
                                isDark
                                  ? "border-slate-800"
                                  : "border-slate-100",
                              )}
                            >
                              <TableCell
                                className={cn(
                                  "font-mono text-[11px]",
                                  primaryText,
                                )}
                              >
                                {d.contractNumber || d.contract_id || "N/A"}
                              </TableCell>
                              <TableCell className={cn("text-[11px]", primaryText)}>
                                {d.client || "—"}
                              </TableCell>
                              <TableCell className={cn("text-[11px]", primaryText)}>
                                {formatDate(d.dueDate)}
                              </TableCell>
                              <TableCell className={cn("text-[11px]", primaryText)}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={cn(
                                    "h-6 px-2 text-[11px]",
                                    isDark
                                      ? "text-slate-100 hover:bg-slate-900"
                                      : "text-slate-700 hover:bg-slate-100",
                                  )}
                                  onClick={openBilling}
                                >
                                  Voir échéancier
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {upcomingDeadlines.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className={cn(
                                  "py-3 text-center text-[11px]",
                                  mutedText,
                                )}
                              >
                                Aucune échéance à venir.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-7 px-3 text-[11px]",
                          isDark
                            ? "border-slate-600 bg-slate-900/40 text-slate-50 hover:bg-slate-800"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                        onClick={openIndexations}
                      >
                        Accéder aux indexations
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Bloc alertes & activité */}
                <Card className={sectionCardClass}>
                  <CardContent className="px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            secondaryText,
                          )}
                        >
                          Alertes & activité
                        </div>
                        <div className={cn("text-[11px]", mutedText)}>
                          Workflow, incidents et dernières actions.
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {/* Alertes */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={cn("font-medium", primaryText)}>
                            Alertes
                          </span>
                          <span className={cn(mutedText)}>
                            {alertsFeed.length}
                          </span>
                        </div>
                        <ScrollArea className={cn(
                          "h-[180px] rounded-md",
                          isDark ? "bg-slate-950/60" : "bg-slate-50",
                        )}>
                          <div className="space-y-1.5 p-2">
                            {alertsFeed.map((a) => (
                              <div
                                key={a.id}
                                className={cn(
                                  "flex items-start gap-2 rounded-md px-2 py-1.5",
                                  isDark
                                    ? "hover:bg-slate-900"
                                    : "hover:bg-slate-100",
                                )}
                              >
                                <div className="pt-0.5">
                                  {a.severity === "critical" ? (
                                    <AlertTriangle
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        isDark ? "text-red-400" : "text-red-500",
                                      )}
                                    />
                                  ) : a.severity === "warning" ? (
                                    <Bell
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        isDark ? "text-amber-300" : "text-amber-500",
                                      )}
                                    />
                                  ) : (
                                    <Bell
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        isDark ? "text-slate-400" : "text-slate-500",
                                      )}
                                    />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div
                                    className={cn(
                                      "text-[11px] font-medium",
                                      primaryText,
                                    )}
                                  >
                                    {a.title || a.message}
                                  </div>
                                  <div className={cn("text-[10px]", mutedText)}>
                                    {a.contract_id
                                      ? `Contrat ${a.contract_id}`
                                      : "Système"}{" "}
                                    •{" "}
                                    {a.createdAt
                                      ? new Date(
                                          a.createdAt,
                                        ).toLocaleString("fr-FR")
                                      : "-"}
                                  </div>
                                </div>
                                <button
                                  className={cn(
                                    "text-[10px]",
                                    isDark
                                      ? "text-slate-300 hover:text-slate-100"
                                      : "text-slate-600 hover:text-slate-900",
                                  )}
                                  onClick={() =>
                                    openContract(a.contract_id || undefined)
                                  }
                                >
                                  Ouvrir
                                </button>
                              </div>
                            ))}
                            {alertsFeed.length === 0 && (
                              <div
                                className={cn(
                                  "rounded-md px-2 py-2 text-[11px]",
                                  isDark
                                    ? "bg-slate-950/60 text-slate-400"
                                    : "bg-slate-100 text-slate-500",
                                )}
                              >
                                Aucune alerte en cours.
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Historique */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={cn("font-medium", primaryText)}>
                            Historique 24h
                          </span>
                          <span className={cn(mutedText)}>
                            {auditLogs.length}
                          </span>
                        </div>
                        <ScrollArea className={cn(
                          "h-[180px] rounded-md",
                          isDark ? "bg-slate-950/60" : "bg-slate-50",
                        )}>
                          <div className="space-y-1.5 p-2">
                            {auditLogs.slice(0, 25).map((log) => (
                              <div
                                key={log.id}
                                className={cn(
                                  "flex items-center justify-between rounded-md px-2 py-1.5",
                                  isDark
                                    ? "hover:bg-slate-900"
                                    : "hover:bg-slate-100",
                                )}
                              >
                                <div className="flex-1">
                                  <div
                                    className={cn(
                                      "text-[11px] font-medium",
                                      primaryText,
                                    )}
                                  >
                                    {log.user || log.user_id || "Système"} •{" "}
                                    {log.action || "-"}
                                  </div>
                                  <div className={cn("text-[10px]", mutedText)}>
                                    {log.traceId || log.id} •{" "}
                                    {log.createdAt
                                      ? new Date(
                                          log.createdAt,
                                        ).toLocaleString("fr-FR")
                                      : formatDate(log.timestamp)}
                                  </div>
                                </div>
                                <div className={cn("pl-2 text-[10px]", mutedText)}>
                                  {log.contractNumber || "-"}
                                </div>
                              </div>
                            ))}
                            {auditLogs.length === 0 && (
                              <div
                                className={cn(
                                  "rounded-md px-2 py-2 text-[11px]",
                                  isDark
                                    ? "bg-slate-950/60 text-slate-400"
                                    : "bg-slate-100 text-slate-500",
                                )}
                              >
                                Aucune activité récente.
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>

                    {/* Conformité documentaire mini */}
                    <div
                      className={cn(
                        "mt-3 border-t pt-2",
                        isDark ? "border-slate-800/60" : "border-slate-200",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className={cn("font-medium", primaryText)}>
                          Conformité documentaire
                        </span>
                        <span className={cn(mutedText)}>
                          {contractsWithoutAttachments.length} contrat(s) sans PJ
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        {contractsWithoutAttachments.map((c) => (
                          <div
                            key={c.id}
                            className={cn(
                              "flex items-center justify-between rounded-md px-2 py-1.5",
                              isDark
                                ? "hover:bg-slate-900"
                                : "hover:bg-slate-100",
                            )}
                          >
                            <div>
                              <div className={cn("font-medium", primaryText)}>
                                {c.contract_number || c.number || c.id}
                              </div>
                              <div className={cn("text-[10px]", mutedText)}>
                                {c.title || c.contract_name || "Sans titre"}
                              </div>
                            </div>
                            <button
                              className={cn(
                                "flex items-center gap-1 text-[10px]",
                                isDark
                                  ? "text-slate-300 hover:text-slate-100"
                                  : "text-slate-600 hover:text-slate-900",
                              )}
                              onClick={() =>
                                openContract(
                                  c.contract_number || c.number || c.id,
                                )
                              }
                            >
                              Ouvrir
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {contractsWithoutAttachments.length === 0 && (
                          <div
                            className={cn(
                              "rounded-md px-2 py-2 text-[11px]",
                              isDark
                                ? "bg-slate-950/60 text-slate-400"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            Tous les contrats ont au moins une pièce jointe.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---- Petits composants UI ----

function OverviewChip({
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
        ? "bg-red-500/15 text-red-100 border-red-500/40"
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
        "flex items-center gap-2 rounded-md border px-2.5 py-2 text-[11px]",
        bg,
      )}
    >
      {icon && <div className="h-4 w-4 shrink-0">{icon}</div>}
      <div className="flex flex-col">
        <span className="truncate text-[10px] opacity-80">{label}</span>
        <span className="text-xs font-semibold">{value ?? 0}</span>
      </div>
    </div>
  );
}

function KpiChip({
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
      {icon && <div className="h-4 w-4 shrink-0">{icon}</div>}
      <div className="flex flex-col">
        <span className="truncate text-[10px] opacity-80">{label}</span>
        <span className="text-xs font-semibold">{value ?? 0}</span>
      </div>
    </div>
  );
}

function MiniColumn({
  title,
  items,
  isDark,
}: {
  title: string;
  items: { id: string; main: string; sub?: string; onClick?: () => void }[];
  isDark: boolean;
}) {
  return (
    <div className="space-y-1.5 text-[11px]">
      <div
        className={cn(
          "text-xs font-medium",
          isDark ? "text-slate-200" : "text-slate-700",
        )}
      >
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={item.onClick}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5",
              isDark
                ? "bg-slate-950/40 hover:bg-slate-900"
                : "bg-slate-50 hover:bg-slate-100",
            )}
          >
            <div className="flex flex-col">
              <span
                className={cn(
                  "font-medium",
                  isDark ? "text-slate-50" : "text-slate-800",
                )}
              >
                {item.main}
              </span>
              {item.sub && (
                <span
                  className={cn(
                    "text-[10px]",
                    isDark ? "text-slate-400" : "text-slate-500",
                  )}
                >
                  {item.sub}
                </span>
              )}
            </div>
            <ArrowRight
              className={cn(
                "h-3 w-3",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            />
          </div>
        ))}
        {items.length === 0 && (
          <div
            className={cn(
              "rounded-md px-2 py-1.5 text-[11px]",
              isDark
                ? "bg-slate-950/40 text-slate-400"
                : "bg-slate-50 text-slate-500",
            )}
          >
            Rien à afficher pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
  isDark: boolean;
}) {
  const color =
    tone === "success"
      ? isDark
        ? "text-emerald-300"
        : "text-emerald-600"
      : tone === "danger"
      ? isDark
        ? "text-red-300"
        : "text-red-600"
      : isDark
      ? "text-slate-100"
      : "text-slate-800";

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "text-[10px] font-medium",
          isDark ? "text-slate-300" : "text-slate-500",
        )}
      >
        {label}
      </div>
      <div className={cn("text-sm font-semibold", color)}>{value ?? 0}</div>
    </div>
  );
}
