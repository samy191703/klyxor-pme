// client/src/pages/dashboard.tsx

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  FileText,
  Calendar,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

// ------------------------------
// Types
// ------------------------------
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

// ------------------------------
// Helpers
// ------------------------------
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

  // ---- DATA ----
  const contractsQ = useQuery<Contract[]>({ queryKey: ["/api/contracts"] });
  const validationQ = useQuery<ValidationRequest[]>({
    queryKey: ["/api/validation-requests"],
  });
  const deadlinesQ = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const alertsQ = useQuery<Alert[]>({ queryKey: ["/api/alerts"] });
  const indexationsQ = useQuery<Indexation[]>({
    queryKey: ["/api/indexations"],
  });

  const contracts = contractsQ.data ?? [];
  const validationRequests = validationQ.data ?? [];
  const deadlines = deadlinesQ.data ?? [];
  const alerts = alertsQ.data ?? [];
  const indexations = indexationsQ.data ?? [];

  // Bandeau état
  const loadingAny =
    contractsQ.isLoading ||
    validationQ.isLoading ||
    deadlinesQ.isLoading ||
    alertsQ.isLoading ||
    indexationsQ.isLoading;

  const errorAny =
    (contractsQ.error as unknown) ||
    (validationQ.error as unknown) ||
    (deadlinesQ.error as unknown) ||
    (alertsQ.error as unknown) ||
    (indexationsQ.error as unknown) ||
    null;

  // ---- Derived ----
  const pendingValidations = useMemo(
    () => validationRequests.filter((r) => r.status === "pending"),
    [validationRequests],
  );

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return deadlines
      .filter((d) => d.dueDate && new Date(d.dueDate) > now)
      .sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return da - db;
      });
  }, [deadlines]);

  const deadlines30 = useMemo(() => {
    const limit = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    return deadlines.filter((d) => {
      if (!d.dueDate) return false;
      const due = new Date(d.dueDate);
      return due <= limit;
    }).length;
  }, [deadlines]);

  const criticalAlerts = useMemo(
    () => alerts.filter((a) => a.severity === "critical").length,
    [alerts],
  );

  const indexationSummary = useMemo(
    () => ({
      pending: indexations.filter((i) => i.status === "pending").length,
      validated: indexations.filter((i) => i.status === "validated").length,
      issues: indexations.filter(
        (i) => i.status === "suspended" || i.status === "error",
      ).length,
    }),
    [indexations],
  );

  // ---- Navigation (aligné App.tsx) ----
  const openContract = (contractNumber?: string | null) => {
    if (!contractNumber) return;
    navigate(`/contracts?search=${encodeURIComponent(contractNumber)}`);
  };

  const openContractsPage = () => navigate("/contracts");
  const openValidationQueue = () => navigate("/validation");
  const openIndexations = () => navigate("/indexation-dashboard");
  const openBillingPlans = () => navigate("/billing-plans");

  // KPI “Alertes critiques” plafonnée à 9+
  const alertsDisplayValue = criticalAlerts > 9 ? 9 : criticalAlerts;
  const alertsDisplaySuffix = criticalAlerts > 9 ? "+" : "";

  return (
    <div className="w-full" data-testid="dashboard-main">
      {/* Bandeau état */}
      {(loadingAny || errorAny) && (
        <div
          className={[
            "mb-3 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs",
            errorAny
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-600",
          ].join(" ")}
        >
          <div className="min-w-0">
            {errorAny ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  Erreur lors du chargement du tableau de bord.
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                <span className="truncate">Chargement du tableau de bord…</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header de page */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Tableau de bord Klyxor
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Vue synthétique de l’activité contrats, facturation et alertes
        </p>
      </div>

      {/* KPI simples */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <KpiCard
          label="Contrats"
          value={contracts.length}
          icon={<FileText className="h-4 w-4" />}
        />
        <KpiCard
          label="À valider"
          value={pendingValidations.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <KpiCard
          label="Échéances < 30j"
          value={deadlines30}
          icon={<Calendar className="h-4 w-4" />}
          tone="warning"
        />
        <KpiCard
          label="Alertes critiques"
          value={alertsDisplayValue}
          valueSuffix={alertsDisplaySuffix}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="danger"
        />
      </div>

      {/* Grille principale */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        {/* Colonne gauche */}
        <div className="space-y-4">
          {/* Contrats & pipeline */}
          <Card className="border-slate-200 bg-white">
            <CardContent className="px-4 py-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Contrats & pipeline
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Derniers contrats, négociations et validations à traiter.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-[11px] border-slate-300"
                    onClick={openContractsPage}
                  >
                    Voir tous
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MiniColumn
                  title="Derniers actifs"
                  items={contracts.slice(0, 4).map((c) => ({
                    id: c.id,
                    main: c.contract_number || c.number || c.id,
                    sub: c.title || c.contract_name || "Sans titre",
                    onClick: () =>
                      openContract(c.contract_number || c.number || c.id),
                  }))}
                />

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
                        openContract(c.contract_number || c.number || c.id),
                    }))}
                  emptyText="Aucune négociation en cours."
                />

                <MiniColumn
                  title="À valider"
                  items={pendingValidations.slice(0, 5).map((r) => ({
                    id: r.id,
                    main: r.reference || r.contractNumber || r.id,
                    sub: r.subject || r.type,
                    onClick: () => openContract(r.reference || r.contractNumber),
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* File de validation */}
          <Card className="border-slate-200 bg-white">
            <CardContent className="px-4 py-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    File de validation
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {pendingValidations.length} demande(s) en attente.
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-[11px] border-slate-300"
                  onClick={openValidationQueue}
                >
                  Voir tout
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
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
                        className="border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() =>
                          openContract(r.reference || r.contractNumber)
                        }
                      >
                        <TableCell className="text-[11px] text-slate-900">
                          {r.type}
                        </TableCell>
                        <TableCell className="text-[11px]">
                          <div className="font-mono text-slate-900">
                            {r.reference || r.contractNumber || "N/A"}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {r.subject || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-900">
                          {r.requested_by || r.requestedBy || "-"}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-900">
                          {r.assigned_to || r.assigned_to_username || "-"}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-900">
                          {r.dueDate ? formatDate(r.dueDate) : "-"}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-900">
                          {typeof r.age === "number" ? `${r.age}h` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}

                    {pendingValidations.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-3 text-center text-[11px] text-slate-500"
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

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Facturation & indexations */}
          <Card className="border-slate-200 bg-white">
            <CardContent className="px-4 py-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Facturation & indexations
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Échéances à 30 jours et statut des indexations.
                  </div>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 text-[11px]">
                <MiniStat label="À traiter" value={indexationSummary.pending} />
                <MiniStat
                  label="Validées"
                  value={indexationSummary.validated}
                  tone="success"
                />
                <MiniStat
                  label="Erreurs"
                  value={indexationSummary.issues}
                  tone="danger"
                />
              </div>

              <div className="mb-2 flex items-center justify-between text-[11px]">
                <div className="font-medium text-slate-900">
                  Échéances de facturation &lt; 30j
                </div>
                <div className="text-slate-500">
                  {upcomingDeadlines.length} échéance(s)
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Contrat</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {upcomingDeadlines.slice(0, 6).map((d, i) => (
                      <TableRow
                        key={d.id || i}
                        className="border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell className="font-mono text-[11px] text-slate-900">
                          {d.contractNumber || d.contract_id || "N/A"}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-900">
                          {d.client || "—"}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-900">
                          {formatDate(d.dueDate)}
                        </TableCell>
                        <TableCell className="text-[11px]">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px]"
                            onClick={openBillingPlans}
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
                          className="py-3 text-center text-[11px] text-slate-500"
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
                  className="h-7 px-3 text-[11px] border-slate-300"
                  onClick={openIndexations}
                >
                  Accéder aux indexations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// UI helpers
// ------------------------------
function KpiCard({
  label,
  value,
  valueSuffix = "",
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  valueSuffix?: string;
  icon?: React.ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  const box =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  const text =
    tone === "danger"
      ? "text-red-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-slate-700";

  return (
    <div
      className={["flex items-center gap-3 rounded-md border px-3 py-2", box].join(
        " ",
      )}
    >
      <div
        className={[
          "h-8 w-8 rounded-md flex items-center justify-center bg-white border border-slate-200",
          text,
        ].join(" ")}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className={["text-lg font-semibold leading-5", text].join(" ")}>
          {value ?? 0}
          {valueSuffix}
        </div>
      </div>
    </div>
  );
}

function MiniColumn({
  title,
  items,
  emptyText = "Rien à afficher pour le moment.",
}: {
  title: string;
  items: { id: string; main: string; sub?: string; onClick?: () => void }[];
  emptyText?: string;
}) {
  return (
    <div className="space-y-1.5 text-[11px]">
      <div className="text-xs font-medium text-slate-700">{title}</div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={item.onClick}
            className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 bg-slate-50 hover:bg-slate-100"
          >
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-slate-900 truncate">
                {item.main}
              </span>
              {item.sub && (
                <span className="text-[10px] text-slate-500 truncate">
                  {item.sub}
                </span>
              )}
            </div>
            <ArrowRight className="h-3 w-3 text-slate-400" />
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-md px-2 py-1.5 text-[11px] text-slate-500 bg-slate-50">
            {emptyText}
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
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
}) {
  const color =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
        ? "text-red-600"
        : "text-slate-800";

  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
      <div className={["text-sm font-semibold", color].join(" ")}>
        {value ?? 0}
      </div>
    </div>
  );
}
