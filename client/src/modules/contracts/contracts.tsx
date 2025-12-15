// client/src/modules/contracts/contracts.tsx

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { queryClient } from "@/lib/queryClient";

import {
  FileText,
  Search,
  Filter,
  Plus,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
} from "lucide-react";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";

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

type StatusStyle = {
  label: string;
  className: string;
};

const mapStatus = (status?: string | null): StatusStyle => {
  const s = (status || "").toLowerCase();

  if (s === "active" || s === "actif" || s === "active_contract") {
    return {
      label: "Actif",
      className:
        "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  }
  if (s === "pending_validation" || s === "à_valider" || s === "to_validate") {
    return {
      label: "À valider",
      className:
        "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }
  if (s === "draft" || s === "brouillon") {
    return {
      label: "Brouillon",
      className: "bg-sky-50 text-sky-700 border border-sky-200",
    };
  }
  if (s === "terminated" || s === "résilié" || s === "resiliated") {
    return {
      label: "Résilié",
      className: "bg-red-50 text-red-700 border border-red-200",
    };
  }
  if (s === "closed" || s === "clôturé" || s === "archived") {
    return {
      label: "Clôturé",
      className: "bg-slate-50 text-slate-700 border-slate-200 border",
    };
  }

  return {
    label: status || "N/A",
    className: "bg-slate-50 text-slate-700 border border-slate-200",
  };
};

export default function ContractsModule() {
  const [, navigate] = useLocation();
  const { canCreateContract, canViewContracts } = usePermissions();

  const {
    data: contracts = [],
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: ["/api/contracts"],
  });

  // Filtres
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");

  // Options de filtres dérivées
  const distinctStatus = useMemo(
    () =>
      Array.from(
        new Set(
          contracts
            .map((c: any) => c.status)
            .filter((v: any) => v && typeof v === "string"),
        ),
      ) as string[],
    [contracts],
  );

  const distinctTypes = useMemo(
    () =>
      Array.from(
        new Set(
          contracts
            .map((c: any) => c.type || c.typeLabel)
            .filter((v: any) => v && typeof v === "string"),
        ),
      ) as string[],
    [contracts],
  );

  // KPIs
  const kpi = useMemo(() => {
    let draft = 0;
    let pending = 0;
    let active = 0;
    let terminated = 0;
    let closed = 0;

    for (const c of contracts as any[]) {
      const s = (c.status || "").toLowerCase();
      if (s === "draft" || s === "brouillon") draft++;
      else if (
        s === "pending_validation" ||
        s === "à_valider" ||
        s === "to_validate"
      )
        pending++;
      else if (s === "active" || s === "actif" || s === "active_contract")
        active++;
      else if (s === "terminated" || s === "résilié" || s === "resiliated")
        terminated++;
      else if (s === "closed" || s === "clôturé" || s === "archived") closed++;
    }

    return { draft, pending, active, terminated, closed };
  }, [contracts]);

  // Application des filtres
  const filteredContracts = useMemo(() => {
    return (contracts as any[]).filter((c) => {
      const term = search.trim().toLowerCase();
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
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      if (statusFilter !== "all") {
        if ((c.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      if (typeFilter !== "all") {
        const t = c.type || c.typeLabel;
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

  // Navigation
  const openContract = (idOrNumber: string | number | undefined) => {
    if (!idOrNumber) return;
    navigate(`/contracts/${idOrNumber}`);
  };

  const createContract = () => {
    navigate("/contracts/new");
  };

  // Actions dans le header (Actualiser + Nouveau contrat)
  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
          onClick={() =>
            queryClient
              .invalidateQueries({
                queryKey: ["/api/contracts"],
              })
              .then(() => refetch())
          }
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
        {canCreateContract && (
          <Button
            onClick={createContract}
            className="gap-2 bg-[var(--klyxor-bleu-nuit,#111827)] text-white hover:bg-slate-900"
          >
            <Plus className="h-4 w-4" />
            Nouveau contrat
          </Button>
        )}
      </div>
    );
  };

  return (
    <KlyxorPageLayout
      title="Gestion des contrats"
      subtitle="Vue consolidée des contrats, avenants et résiliations."
      actions={renderHeaderActions}
    >
      {(theme) => {
        const {
          isDark,
          heroCardClass,
          sectionCardClass,
          tableHeaderClass,
          tableRowHoverClass,
          primaryText,
          secondaryText,
          mutedText,
        } = theme;

        const filtersCardClass = sectionCardClass;
        const tableCardClass = sectionCardClass;

        const tableRowClass = (base?: string) =>
          tableRowHoverClass(
            cn(
              base,
              isDark ? "border-slate-800" : "border-slate-100",
            ),
          );

        if (!canViewContracts) {
          return (
            <Card className={sectionCardClass}>
              <CardContent className="p-6 text-sm text-red-600">
                Vous n&apos;avez pas les droits nécessaires pour consulter les
                contrats.
              </CardContent>
            </Card>
          );
        }

        return (
          <>
            {/* HERO – aligné sur le hero Dashboard */}
            <Card className={heroCardClass}>
              <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr,0.9fr]">
                {/* Bloc gauche : résumé global */}
                <div className="flex flex-col gap-2">
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    Vue globale des contrats
                  </div>
                  <div
                    className={cn(
                      "text-sm",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    {contracts.length} contrat(s) au total •{" "}
                    {kpi.active} actif(s) • {kpi.pending} en validation
                  </div>
                </div>

                {/* Bloc droit : 3 stats encadrées comme sur Dashboard */}
                <div className="grid gap-2 text-xs">
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
                      isDark
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-100"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700",
                    )}
                  >
                    <span className="font-medium">Contrats actifs</span>
                    <span className="font-semibold">{kpi.active}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
                      isDark
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-100"
                        : "bg-amber-50 border-amber-200 text-amber-700",
                    )}
                  >
                    <span className="font-medium">À valider</span>
                    <span className="font-semibold">{kpi.pending}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
                      isDark
                        ? "bg-red-500/10 border-red-500/40 text-red-100"
                        : "bg-red-50 border-red-200 text-red-700",
                    )}
                  >
                    <span className="font-medium">Résiliés / clôturés</span>
                    <span className="font-semibold">
                      {kpi.terminated + kpi.closed}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ligne mini KPI – ISO Dashboard */}
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-6">
              <KpiChip
                label="Total contrats"
                value={contracts.length}
                icon={<FileText className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="Brouillons"
                value={kpi.draft}
                icon={<FileText className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="À valider"
                value={kpi.pending}
                icon={<Clock className="h-3.5 w-3.5" />}
                tone="warning"
                isDark={isDark}
              />
              <KpiChip
                label="Actifs"
                value={kpi.active}
                icon={<CheckCircle className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <KpiChip
                label="Résiliés"
                value={kpi.terminated}
                icon={<XCircle className="h-3.5 w-3.5" />}
                tone="danger"
                isDark={isDark}
              />
              <KpiChip
                label="Clôturés"
                value={kpi.closed}
                icon={<Archive className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
            </div>

            {/* Tabs – même style que Dashboard */}
            <Tabs defaultValue="contracts" className="space-y-4">
              <TabsList
                className={cn(
                  "flex gap-6 bg-transparent px-0 pb-0",
                  isDark
                    ? "border-b border-slate-800"
                    : "border-b border-slate-200",
                )}
              >
                <TabsTrigger
                  value="contracts"
                  className={cn(
                    "relative pb-3 text-sm font-medium transition-colors",
                    isDark
                      ? "text-slate-300 hover:text-slate-50"
                      : "text-slate-600 hover:text-slate-900",
                    "data-[state=active]:text-slate-900",
                    "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0",
                    "data-[state=active]:after:h-[2px] data-[state=active]:after:w-full",
                    "data-[state=active]:after:bg-slate-900",
                  )}
                >
                  <span>Contrats</span>
                  <span className="ml-1 text-xs text-slate-400">
                    ({(contracts as any[]).length})
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="history"
                  className={cn(
                    "relative pb-3 text-sm font-medium transition-colors",
                    isDark
                      ? "text-slate-300 hover:text-slate-50"
                      : "text-slate-600 hover:text-slate-900",
                    "data-[state=active]:text-slate-900",
                    "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0",
                    "data-[state=active]:after:h-[2px] data-[state=active]:after:w-full",
                    "data-[state=active]:after:bg-slate-900",
                  )}
                >
                  Historique
                </TabsTrigger>
              </TabsList>

              {/* Onglet Contrats */}
              <TabsContent value="contracts" className="space-y-4">
                {/* Filtres */}
                <Card className={filtersCardClass}>
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="relative w-full">
                        <Search
                          className={cn(
                            "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                            "text-slate-400",
                          )}
                        />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Rechercher un contrat, client, numéro…"
                          className={cn(
                            "pl-9",
                            isDark
                              ? "border-slate-700 bg-slate-950 text-slate-50 placeholder:text-slate-500"
                              : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={cn(
                          "flex items-center gap-1 text-xs uppercase tracking-wide",
                          mutedText,
                        )}
                      >
                        <Filter className="h-4 w-4 text-slate-400" />
                        <span>Filtres</span>
                      </div>

                      <Select
                        value={statusFilter}
                        onValueChange={(v) => setStatusFilter(v as any)}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-[150px]",
                            isDark
                              ? "border-slate-700 bg-slate-950 text-slate-50"
                              : "border-slate-200 bg-white text-slate-900",
                          )}
                        >
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          {distinctStatus.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={typeFilter}
                        onValueChange={(v) => setTypeFilter(v as any)}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-[150px]",
                            isDark
                              ? "border-slate-700 bg-slate-950 text-slate-50"
                              : "border-slate-200 bg-white text-slate-900",
                          )}
                        >
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
                        className={cn(
                          "text-xs",
                          isDark
                            ? "text-slate-300 hover:bg-slate-900"
                            : "text-slate-500 hover:bg-slate-100",
                        )}
                        onClick={resetFilters}
                      >
                        Réinitialiser
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tableau des contrats */}
                <Card className={tableCardClass}>
                  <CardHeader className="px-4 pt-4 pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle
                          className={cn(
                            "text-sm font-semibold",
                            primaryText,
                          )}
                        >
                          Contrats ({filteredContracts.length})
                        </CardTitle>
                        <div className={cn("text-[11px]", secondaryText)}>
                          Vue consolidée des contrats, avenants et résiliations.
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-2 text-xs",
                          mutedText,
                        )}
                      >
                        <span>{contracts.length} contrat(s) au total</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[70vh]">
                      <Table>
                        <TableHeader className={tableHeaderClass}>
                          <TableRow>
                            <TableHead className="w-[170px] text-[11px]">
                              N° contrat
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Intitulé
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Client
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Montant
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Devise
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Statut
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Dates
                            </TableHead>
                            <TableHead className="pr-6 text-right text-[11px]">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredContracts.length === 0 && !isLoading && (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                className={cn(
                                  "py-10 text-center text-sm",
                                  mutedText,
                                )}
                              >
                                Aucun contrat ne correspond aux filtres.
                              </TableCell>
                            </TableRow>
                          )}

                          {filteredContracts.map((c: any) => {
                            const id =
                              c.id ||
                              c.contract_id ||
                              c.contractNumber ||
                              c.contract_number;
                            const number =
                              c.contract_number || c.number || id || "-";
                            const title =
                              c.title || c.contract_name || "(Sans titre)";
                            const subtitle =
                              c.typeLabel || c.type || c.category || "";
                            const client =
                              c.clientName ||
                              c.client_name ||
                              c.clientDisplayName ||
                              c.client_display_name ||
                              "-";
                            const statusStyle = mapStatus(c.status);
                            const start =
                              c.startDate ||
                              c.start_date ||
                              c.effectiveDate ||
                              c.effective_date;
                            const end =
                              c.endDate ||
                              c.end_date ||
                              c.terminationDate ||
                              c.termination_date;
                            const amount = c.amount || c.totalAmount;
                            const currency =
                              c.currency ||
                              c.currencyCode ||
                              c.currency_code ||
                              "-";

                            return (
                              <TableRow
                                key={id}
                                className={tableRowClass()}
                                onClick={() => openContract(id)}
                              >
                                <TableCell
                                  className={cn(
                                    "font-mono text-xs",
                                    primaryText,
                                  )}
                                >
                                  {number}
                                </TableCell>
                                <TableCell>
                                  <div
                                    className={cn(
                                      "text-sm font-medium",
                                      primaryText,
                                    )}
                                  >
                                    {title}
                                  </div>
                                  {subtitle && (
                                    <div
                                      className={cn(
                                        "text-[11px]",
                                        mutedText,
                                      )}
                                    >
                                      {subtitle}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div
                                    className={cn(
                                      "text-sm",
                                      primaryText,
                                    )}
                                  >
                                    {client}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div
                                    className={cn(
                                      "text-sm",
                                      primaryText,
                                    )}
                                  >
                                    {formatAmount(amount)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div
                                    className={cn(
                                      "text-xs",
                                      primaryText,
                                    )}
                                  >
                                    {currency}
                                  </div>
                                </TableCell>
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
                                <TableCell>
                                  <div
                                    className={cn(
                                      "text-[11px]",
                                      primaryText,
                                    )}
                                  >
                                    {formatDate(start)}{" "}
                                    <span className={mutedText}>—</span>{" "}
                                    {formatDate(end)}
                                  </div>
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                      "gap-1 text-xs",
                                      isDark
                                        ? "text-slate-200 hover:bg-slate-900"
                                        : "text-slate-700 hover:bg-slate-100",
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openContract(id);
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
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Onglet Historique – placeholder aligné Dashboard */}
              <TabsContent value="history">
                <Card className={tableCardClass}>
                  <CardContent className="p-6 text-sm">
                    <p className={mutedText}>
                      Historique des modifications de contrats (à connecter à
                      vos logs / audit-trail).
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        );
      }}
    </KlyxorPageLayout>
  );
}

/* === Composant KPI réutilisé (aligné Dashboard) === */

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
