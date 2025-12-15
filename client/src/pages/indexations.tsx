// client/src/pages/indexations.tsx

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
import { queryClient } from "@/lib/queryClient";

import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";

type Indexation = {
  id: string;
  status?: string;
  contractNumber?: string;
  contract_id?: string;
  contract?: string;
  formulaCode?: string;
  formula?: string;
  period?: string;
  runDate?: string;
  createdAt?: string;
  errorMessage?: string | null;
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

export default function IndexationsPage() {
  const [, navigate] = useLocation();

  const {
    data: indexations = [],
    isLoading,
    refetch,
  } = useQuery<Indexation[]>({
    queryKey: ["/api/indexations"],
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<string | "all">("all");

  const distinctStatus = useMemo(
    () =>
      Array.from(
        new Set(
          indexations
            .map((i) => i.status)
            .filter((v): v is string => !!v && typeof v === "string"),
        ),
      ),
    [indexations],
  );

  const distinctPeriods = useMemo(
    () =>
      Array.from(
        new Set(
          indexations
            .map((i) => i.period)
            .filter((v): v is string => !!v && typeof v === "string"),
        ),
      ),
    [indexations],
  );

  const kpi = useMemo(() => {
    let pending = 0;
    let validated = 0;
    let error = 0;
    let suspended = 0;

    for (const i of indexations) {
      const s = (i.status || "").toLowerCase();
      if (s === "pending" || s === "to_run") pending++;
      else if (s === "validated" || s === "applied") validated++;
      else if (s === "error") error++;
      else if (s === "suspended") suspended++;
    }

    return { pending, validated, error, suspended };
  }, [indexations]);

  const filteredIndexations = useMemo(
    () =>
      indexations.filter((i) => {
        const term = search.trim().toLowerCase();
        if (term) {
          const haystack = [
            i.contractNumber,
            i.contract_id,
            i.contract,
            i.formulaCode,
            i.formula,
            i.period,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(term)) return false;
        }

        if (statusFilter !== "all") {
          if ((i.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
            return false;
          }
        }

        if (periodFilter !== "all") {
          if (i.period !== periodFilter) return false;
        }

        return true;
      }),
    [indexations, search, statusFilter, periodFilter],
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPeriodFilter("all");
  };

  const openContract = (contractNumber?: string | null) => {
    if (!contractNumber) return;
    navigate(`/contracts?search=${encodeURIComponent(contractNumber)}`);
  };

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;
    return (
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
            .invalidateQueries({ queryKey: ["/api/indexations"] })
            .then(() => refetch())
        }
      >
        <RefreshCw className="h-4 w-4" />
        Actualiser
      </Button>
    );
  };

  return (
    <KlyxorPageLayout
      title="Indexations"
      subtitle="Suivi des calculs d’indexation et statut des campagnes."
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
            cn(base, isDark ? "border-slate-800" : "border-slate-100"),
          );

        return (
          <>
            {/* HERO */}
            <Card className={heroCardClass}>
              <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr,0.9fr]">
                <div className="flex flex-col gap-2">
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    Vue globale des indexations
                  </div>
                  <div
                    className={cn(
                      "text-sm",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    {indexations.length} ligne(s) d’indexation •{" "}
                    {kpi.pending} à traiter • {kpi.validated} validées
                  </div>
                </div>

                <div className="grid gap-2 text-xs">
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
                      isDark
                        ? "bg-slate-950/40 border-slate-700 text-slate-100"
                        : "bg-slate-50 border-slate-200 text-slate-800",
                    )}
                  >
                    <span className="font-medium">À traiter</span>
                    <span className="font-semibold">{kpi.pending}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
                      isDark
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-100"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700",
                    )}
                  >
                    <span className="font-medium">Validées</span>
                    <span className="font-semibold">{kpi.validated}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
                      isDark
                        ? "bg-red-500/10 border-red-500/40 text-red-100"
                        : "bg-red-50 border-red-200 text-red-700",
                    )}
                  >
                    <span className="font-medium">Erreurs / suspendues</span>
                    <span className="font-semibold">
                      {kpi.error + kpi.suspended}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI mini */}
            <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-5">
              <MiniKpi
                label="À traiter"
                value={kpi.pending}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                tone="warning"
                isDark={isDark}
              />
              <MiniKpi
                label="Validées"
                value={kpi.validated}
                icon={<CheckCircle className="h-3.5 w-3.5" />}
                tone="success"
                isDark={isDark}
              />
              <MiniKpi
                label="Erreurs"
                value={kpi.error}
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                tone="danger"
                isDark={isDark}
              />
              <MiniKpi
                label="Suspendues"
                value={kpi.suspended}
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
              <MiniKpi
                label="Lignes totales"
                value={indexations.length}
                icon={<FileText className="h-3.5 w-3.5" />}
                isDark={isDark}
              />
            </div>

            <Tabs defaultValue="indexations" className="space-y-4">
              <TabsList
                className={cn(
                  "flex gap-6 bg-transparent px-0 pb-0",
                  isDark ? "border-b border-slate-800" : "border-b border-slate-200",
                )}
              >
                <TabsTrigger
                  value="indexations"
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
                  <span>Indexations</span>
                  <span className="ml-1 text-xs text-slate-400">
                    ({indexations.length})
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

              {/* Onglet principal */}
              <TabsContent value="indexations" className="space-y-4">
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
                          placeholder="Contrat, formule, période…"
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
                        value={periodFilter}
                        onValueChange={(v) => setPeriodFilter(v as any)}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-[150px]",
                            isDark
                              ? "border-slate-700 bg-slate-950 text-slate-50"
                              : "border-slate-200 bg-white text-slate-900",
                          )}
                        >
                          <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes périodes</SelectItem>
                          {distinctPeriods.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
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

                {/* Tableau */}
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
                          Indexations ({filteredIndexations.length})
                        </CardTitle>
                        <div className={cn("text-[11px]", secondaryText)}>
                          Suivi détaillé des lignes d’indexation.
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-2 text-xs",
                          mutedText,
                        )}
                      >
                        <span>{indexations.length} ligne(s) au total</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[70vh]">
                      <Table>
                        <TableHeader className={tableHeaderClass}>
                          <TableRow>
                            <TableHead className="w-[140px] text-[11px]">
                              Contrat
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Formule
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Période
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Statut
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Date run
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Création
                            </TableHead>
                            <TableHead className="text-[11px]">
                              Message
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredIndexations.length === 0 && !isLoading && (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className={cn(
                                  "py-10 text-center text-sm",
                                  mutedText,
                                )}
                              >
                                Aucune indexation ne correspond aux filtres.
                              </TableCell>
                            </TableRow>
                          )}

                          {filteredIndexations.map((i) => (
                            <TableRow
                              key={i.id}
                              className={tableRowClass()}
                              onClick={() =>
                                openContract(i.contractNumber || i.contract_id)
                              }
                            >
                              <TableCell
                                className={cn(
                                  "font-mono text-xs",
                                  primaryText,
                                )}
                              >
                                {i.contractNumber || i.contract_id || "N/A"}
                              </TableCell>
                              <TableCell>
                                <div
                                  className={cn(
                                    "text-sm",
                                    primaryText,
                                  )}
                                >
                                  {i.formulaCode || i.formula || "-"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div
                                  className={cn(
                                    "text-xs",
                                    primaryText,
                                  )}
                                >
                                  {i.period || "-"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                                    (i.status || "").toLowerCase() ===
                                      "validated"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : (i.status || "").toLowerCase() ===
                                          "pending"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : (i.status || "").toLowerCase() ===
                                        "error"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-slate-50 text-slate-700 border border-slate-200",
                                  )}
                                >
                                  {i.status || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-[11px]",
                                  primaryText,
                                )}
                              >
                                {formatDate(i.runDate)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-[11px]",
                                  primaryText,
                                )}
                              >
                                {formatDate(i.createdAt)}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-[11px] max-w-xs truncate",
                                  mutedText,
                                )}
                              >
                                {i.errorMessage || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Historique placeholder */}
              <TabsContent value="history">
                <Card className={tableCardClass}>
                  <CardContent className="p-6 text-sm">
                    <p className={mutedText}>
                      Historique agrégé des campagnes d’indexation (à connecter
                      à vos logs / audit-trail).
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

/* Mini KPI pour Indexations */

function MiniKpi({
  label,
  value,
  icon,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  tone?: "default" | "success" | "danger" | "warning";
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
      : tone === "warning"
      ? isDark
        ? "text-amber-300"
        : "text-amber-600"
      : isDark
      ? "text-slate-100"
      : "text-slate-800";

  return (
    <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] bg-slate-50/60">
      {icon && <div className={cn("h-4 w-4", color)}>{icon}</div>}
      <div className="flex flex-col">
        <span className="truncate text-[10px] text-slate-500">{label}</span>
        <span className={cn("text-sm font-semibold", color)}>
          {value ?? 0}
        </span>
      </div>
    </div>
  );
}
