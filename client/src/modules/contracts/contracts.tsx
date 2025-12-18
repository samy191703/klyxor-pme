// client/src/modules/contracts/contracts.tsx

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

import {
  Search,
  Filter,
  Plus,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  Archive,
  XCircle,
  RefreshCw,
} from "lucide-react";

// ------------------------------
// Types
// ------------------------------
type ContractRow = {
  id?: string;
  contract_id?: string;

  contract_number?: string;
  number?: string;

  title?: string;
  contract_name?: string;

  clientName?: string;
  client_name?: string;
  clientDisplayName?: string;
  client_display_name?: string;

  status?: string | null;
  type?: string | null;
  typeLabel?: string | null;

  amount?: number | string | null;
  totalAmount?: number | string | null;
  currency?: string | null;
  currencyCode?: string | null;
  currency_code?: string | null;

  startDate?: string | null;
  start_date?: string | null;
  effectiveDate?: string | null;
  effective_date?: string | null;

  endDate?: string | null;
  end_date?: string | null;
  terminationDate?: string | null;
  termination_date?: string | null;
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

const formatAmount = (v?: number | string | null) => {
  if (v === null || v === undefined || v === "") return "-";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

type StatusStyle = { label: string; className: string; key: string };

const mapStatus = (status?: string | null): StatusStyle => {
  const s = (status || "").toLowerCase();

  if (s === "active" || s === "actif" || s === "active_contract") {
    return {
      key: "active",
      label: "Actif",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  }
  if (s === "pending_validation" || s === "à_valider" || s === "to_validate") {
    return {
      key: "pending",
      label: "À valider",
      className: "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }
  if (s === "draft" || s === "brouillon") {
    return {
      key: "draft",
      label: "Brouillon",
      className: "bg-sky-50 text-sky-700 border border-sky-200",
    };
  }
  if (s === "terminated" || s === "résilié" || s === "resiliated") {
    return {
      key: "terminated",
      label: "Résilié",
      className: "bg-red-50 text-red-700 border border-red-200",
    };
  }
  if (s === "closed" || s === "clôturé" || s === "archived") {
    return {
      key: "closed",
      label: "Clôturé",
      className: "bg-slate-50 text-slate-700 border border-slate-200",
    };
  }

  return {
    key: "other",
    label: status || "N/A",
    className: "bg-slate-50 text-slate-700 border border-slate-200",
  };
};

// Normalisation interne
type StatusKey = "all" | "active" | "pending" | "draft" | "terminated" | "closed";

const statusKeyLabel: Record<StatusKey, string> = {
  all: "Tous",
  active: "Actifs",
  pending: "À valider",
  draft: "Brouillons",
  terminated: "Résiliés",
  closed: "Clôturés",
};

export default function ContractsModule() {
  const [, navigate] = useLocation();
  const { canCreateContract = false, canViewContracts = true } = usePermissions();

  const { data: contracts = [], isLoading, error } = useQuery<ContractRow[]>({
    queryKey: ["/api/contracts"],
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const distinctStatus = useMemo(() => {
    const vals = (contracts ?? [])
      .map((c) => (c.status ? String(c.status) : ""))
      .filter(Boolean);
    return Array.from(new Set(vals)).sort();
  }, [contracts]);

  const distinctTypes = useMemo(() => {
    const vals = (contracts ?? [])
      .map((c) => (c.typeLabel || c.type ? String(c.typeLabel || c.type) : ""))
      .filter(Boolean);
    return Array.from(new Set(vals)).sort();
  }, [contracts]);

  const kpi = useMemo(() => {
    let total = contracts.length;
    let active = 0;
    let pending = 0;
    let draft = 0;
    let terminated = 0;
    let closed = 0;

    for (const c of contracts) {
      const key = mapStatus(c.status).key as StatusKey | "other";
      if (key === "active") active++;
      else if (key === "pending") pending++;
      else if (key === "draft") draft++;
      else if (key === "terminated") terminated++;
      else if (key === "closed") closed++;
    }

    return { total, active, pending, draft, terminated, closed };
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (contracts ?? []).filter((c) => {
      if (term) {
        const haystack = [
          c.contract_number,
          c.number,
          c.title,
          c.contract_name,
          c.clientName,
          c.client_name,
          c.clientDisplayName,
          c.client_display_name,
          c.typeLabel,
          c.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      if (statusFilter !== "all") {
        const key = mapStatus(c.status).key as StatusKey | "other";
        if (key !== statusFilter) return false;
      }

      if (typeFilter !== "all") {
        const t = String(c.typeLabel || c.type || "");
        if (t !== typeFilter) return false;
      }

      return true;
    });
  }, [contracts, search, statusFilter, typeFilter]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const clearKpiStatusFilter = () => {
    setStatusFilter("all");
  };

  const applyStatusFromKpi = (key: StatusKey) => {
    setStatusFilter(key);
  };

  const openContract = (row: ContractRow) => {
    const id = row.id || row.contract_id || row.contract_number || row.number;
    if (!id) return;
    navigate(`/contracts/${encodeURIComponent(String(id))}`);
  };

  const createContract = () => navigate("/contracts/new");

  if (!canViewContracts) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6 text-sm text-red-600">
          Vous n&apos;avez pas les droits nécessaires pour consulter les contrats.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full" data-testid="contracts-main">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Contrats
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Vue consolidée des contrats (filtrer, rechercher, ouvrir une fiche).
          </p>
        </div>

        {canCreateContract && (
          <Button className="gap-2" onClick={createContract}>
            <Plus className="h-4 w-4" />
            Nouveau contrat
          </Button>
        )}
      </div>

      {/* Bandeau état */}
      {(isLoading || error) && (
        <div
          className={cn(
            "mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-600",
          )}
        >
          {error ? (
            <>
              <span className="font-medium">Erreur</span>
              <span className="truncate">
                Impossible de charger la liste des contrats.
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
              <span className="truncate">Chargement des contrats…</span>
            </>
          )}
        </div>
      )}

      {/* KPI (cliquables) */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-6">
        <KpiChip
          label="Total"
          value={kpi.total}
          icon={<FileText className="h-3.5 w-3.5" />}
          active={statusFilter === "all"}
          onClick={() => applyStatusFromKpi("all")}
          hint="Afficher tous les contrats"
        />
        <KpiChip
          label="Actifs"
          value={kpi.active}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="success"
          active={statusFilter === "active"}
          onClick={() => applyStatusFromKpi("active")}
          hint="Filtrer sur les contrats actifs"
        />
        <KpiChip
          label="À valider"
          value={kpi.pending}
          icon={<Clock className="h-3.5 w-3.5" />}
          tone="warning"
          active={statusFilter === "pending"}
          onClick={() => applyStatusFromKpi("pending")}
          hint="Filtrer sur les contrats à valider"
        />
        <KpiChip
          label="Brouillons"
          value={kpi.draft}
          icon={<FileText className="h-3.5 w-3.5" />}
          active={statusFilter === "draft"}
          onClick={() => applyStatusFromKpi("draft")}
          hint="Filtrer sur les brouillons"
        />
        <KpiChip
          label="Résiliés"
          value={kpi.terminated}
          icon={<XCircle className="h-3.5 w-3.5" />}
          tone="danger"
          active={statusFilter === "terminated"}
          onClick={() => applyStatusFromKpi("terminated")}
          hint="Filtrer sur les contrats résiliés"
        />
        <KpiChip
          label="Clôturés"
          value={kpi.closed}
          icon={<Archive className="h-3.5 w-3.5" />}
          active={statusFilter === "closed"}
          onClick={() => applyStatusFromKpi("closed")}
          hint="Filtrer sur les contrats clôturés"
        />
      </div>

      {/* Filtres */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un contrat, client, numéro…"
                className="pl-9 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Filtres</span>
            </div>

            <Select
              value={statusFilter === "all" ? "all" : statusFilter}
              onValueChange={(v) => {
                if (v === "all") return setStatusFilter("all");
                const normalized = mapStatus(v).key as StatusKey | "other";
                setStatusFilter(normalized === "other" ? "all" : normalized);
              }}
            >
              <SelectTrigger className="w-[160px] border-slate-200 bg-white text-slate-900">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {distinctStatus.map((s) => (
                  <SelectItem key={s} value={s}>
                    {mapStatus(s).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
              <SelectTrigger className="w-[160px] border-slate-200 bg-white text-slate-900">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {distinctTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:bg-slate-100"
              onClick={resetFilters}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Indicateur filtre KPI (statut) + bouton dédié */}
      {statusFilter !== "all" && (
        <div className="mt-3 mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600">
            Filtre actif :{" "}
            <span className="font-semibold text-slate-900">
              {statusKeyLabel[statusFilter]}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-600 hover:bg-slate-100"
            onClick={clearKpiStatusFilter}
          >
            Effacer le filtre KPI
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="mt-4 border-slate-200 bg-white">
        <CardHeader className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Contrats ({filteredContracts.length})
              </CardTitle>
              <div className="text-[11px] text-slate-500">
                Cliquez sur une ligne pour ouvrir la fiche contrat.
              </div>
            </div>

            <div className="text-xs text-slate-500">{contracts.length} au total</div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[170px] text-[11px]">N° contrat</TableHead>
                  <TableHead className="text-[11px]">Intitulé</TableHead>
                  <TableHead className="text-[11px]">Client</TableHead>
                  <TableHead className="text-[11px]">Montant</TableHead>
                  <TableHead className="text-[11px]">Devise</TableHead>
                  <TableHead className="text-[11px]">Statut</TableHead>
                  <TableHead className="text-[11px]">Dates</TableHead>
                  <TableHead className="pr-6 text-right text-[11px]">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {!isLoading && filteredContracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                      Aucun contrat ne correspond aux filtres.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  filteredContracts.map((c) => {
                    const id = c.id || c.contract_id || c.contract_number || c.number || "";
                    const number = c.contract_number || c.number || id || "-";
                    const title = c.title || c.contract_name || "(Sans titre)";
                    const typeLabel = c.typeLabel || c.type || "";
                    const client =
                      c.clientName ||
                      c.client_name ||
                      c.clientDisplayName ||
                      c.client_display_name ||
                      "-";

                    const statusStyle = mapStatus(c.status);

                    const start =
                      c.startDate || c.start_date || c.effectiveDate || c.effective_date;
                    const end =
                      c.endDate || c.end_date || c.terminationDate || c.termination_date;

                    const amount = c.amount ?? c.totalAmount;
                    const currency = c.currency || c.currencyCode || c.currency_code || "-";

                    return (
                      <TableRow
                        key={String(id)}
                        className="border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => openContract(c)}
                      >
                        <TableCell className="font-mono text-xs text-slate-900">
                          {number}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium text-slate-900">{title}</div>
                          {typeLabel && (
                            <div className="text-[11px] text-slate-500">{typeLabel}</div>
                          )}
                        </TableCell>

                        <TableCell className="text-sm text-slate-900">{client}</TableCell>

                        <TableCell className="text-sm text-slate-900">
                          {formatAmount(amount)}
                        </TableCell>

                        <TableCell className="text-xs text-slate-900">{currency}</TableCell>

                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                              statusStyle.className,
                            )}
                          >
                            {statusStyle.label}
                          </span>
                        </TableCell>

                        <TableCell className="text-[11px] text-slate-700">
                          {formatDate(start)} <span className="text-slate-300">—</span>{" "}
                          {formatDate(end)}
                        </TableCell>

                        <TableCell className="pr-6 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs text-slate-700 hover:bg-slate-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              openContract(c);
                            }}
                          >
                            Voir
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          className="border-slate-300"
          onClick={() => navigate("/billing-plans")}
        >
          Accéder aux échéanciers
        </Button>
      </div>
    </div>
  );
}

// ------------------------------
// UI helpers
// ------------------------------
function KpiChip({
  label,
  value,
  icon,
  tone = "default",
  active = false,
  onClick,
  hint,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  active?: boolean;
  onClick?: () => void;
  hint?: string;
}) {
  const bg =
    tone === "danger"
      ? "bg-red-50 text-red-700 border border-red-200"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700 border border-amber-200"
        : tone === "success"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-50 text-slate-800 border border-slate-200";

  const ring =
    tone === "danger"
      ? "ring-red-300"
      : tone === "warning"
        ? "ring-amber-300"
        : tone === "success"
          ? "ring-emerald-300"
          : "ring-slate-300";

  return (
    <button
      type="button"
      title={hint || `Filtrer : ${label}`}
      onClick={onClick}
      className={cn(
        "text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] transition-all",
        "hover:shadow-sm hover:-translate-y-[1px] active:translate-y-0",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        bg,
        onClick && "cursor-pointer",
        active && cn("ring-2 shadow-sm", ring),
      )}
    >
      {icon && <div className="h-4 w-4 shrink-0">{icon}</div>}
      <div className="flex flex-col">
        <span className="truncate text-[10px] opacity-80">{label}</span>
        <span className="text-xs font-semibold">{value ?? 0}</span>
      </div>
    </button>
  );
}

function SkeletonRow() {
  return (
    <TableRow className="border-slate-100">
      <TableCell colSpan={8} className="py-3">
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      </TableCell>
    </TableRow>
  );
}
