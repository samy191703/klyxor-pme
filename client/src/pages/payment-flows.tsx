// client/src/pages/payment-flows.tsx

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  TrendingUp,
  Search,
  Calendar,
  RefreshCw,
  Database,
  ArrowUpRight,
  Clock,
  Ban,
} from "lucide-react";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";

interface PaymentFlow {
  id: string;
  planId?: string;
  contractId?: string;
  contractNumber?: string;
  contractName?: string;
  contractTitle?: string;
  dueDate?: string;
  amount?: number;
  currency?: string;
  invoiceRef?: string;
  status?: "generated" | "exported_erp" | "completed" | "blocked";
  lastERPEvent?: string;
  blockReason?: string;
}

export default function PaymentFlows() {
  const [selectedFlow, setSelectedFlow] = useState<PaymentFlow | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Permissions
  const { hasPermission } = usePermissions();
  const canBlockFlow = hasPermission("/payment-flows");
  const canExportFlow = hasPermission("/payment-flows");

  /**
   * Récupération des flux de paiement
   * Rafraîchissement automatique toutes les 30s
   */
  const { data: flowsData = [], isLoading: flowsLoading } = useQuery<
    PaymentFlow[]
  >({
    queryKey: ["/api/admin/billing/flows"],
    refetchInterval: 30000,
  });

  /**
   * Mutation pour bloquer un flux de paiement
   */
  const blockFlowMutation = useMutation({
    mutationFn: async ({ flowId, oldAmount, newAmount, reason }: any) => {
      return await apiRequest("POST", `/api/payment-flows/${flowId}/block`, {
        oldAmount,
        newAmount,
        reason,
        modifiedBy: "Admin",
      });
    },
    onSuccess: () => {
      toast({
        title: "Flux bloqué",
        description: "Le flux de paiement a été bloqué",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/flows"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de bloquer le flux",
        variant: "destructive",
      });
    },
  });

  const flows: PaymentFlow[] = flowsData || [];

  const kpis = useMemo(() => {
    const total = flows.length;
    const generated = flows.filter((f) => f.status === "generated").length;
    const exported = flows.filter((f) => f.status === "exported_erp").length;
    const completed = flows.filter((f) => f.status === "completed").length;
    const blocked = flows.filter((f) => f.status === "blocked").length;

    return { total, generated, exported, completed, blocked };
  }, [flows]);

  const filteredFlows = flows.filter((flow) => {
    const matchesStatus =
      statusFilter === "all" || flow.status === statusFilter;
    const contractDisplay = flow.contractName || flow.contractTitle || "";
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      contractDisplay.toLowerCase().includes(q) ||
      (flow.id || "").toLowerCase().includes(q) ||
      (flow.invoiceRef || "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">—</Badge>;

    switch (status) {
      case "generated":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            Généré
          </Badge>
        );
      case "exported_erp":
        return (
          <Badge variant="outline" className="border-green-500 text-green-600">
            Exporté ERP
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-green-700 text-green-700 bg-green-50"
          >
            Effectué
          </Badge>
        );
      case "blocked":
        return <Badge variant="destructive">Bloqué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <Button
        className={cn(
          "gap-2 text-xs",
          isDark
            ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
            : "border-slate-300 bg-[var(--klyxor-bleu-nuit,#111827)] text-white hover:bg-slate-900",
        )}
        onClick={() => {
          // TODO: brancher la relance réelle des exports en erreur
          toast({
            title: "Relance des exports",
            description: "Relance des exports en erreur (à brancher).",
          });
        }}
      >
        <RefreshCw className="w-4 h-4" />
        Relancer exports en erreur
      </Button>
    );
  };

  return (
    <KlyxorPageLayout
      title="Flux de paiement"
      subtitle="Suivi des flux générés et export vers l'ERP."
      actions={renderHeaderActions}
    >
      {(theme) => {
        const {
          heroCardClass,
          sectionCardClass,
          primaryText,
          secondaryText,
          mutedText,
          tableHeaderClass,
          tableRowHoverClass,
          isDark,
        } = theme;

        const tableRowClass = (base?: string) =>
          tableRowHoverClass(
            cn(base, isDark ? "border-slate-800" : "border-slate-100"),
          );

        return (
          <>
            {/* HERO */}
            <Card className={heroCardClass}>
              <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr,1fr]">
                <div className="flex flex-col gap-2">
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    Vue globale des flux de paiement
                  </div>
                  <div
                    className={cn(
                      "text-sm",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    {kpis.total} flux au total • {kpis.generated} générés •{" "}
                    {kpis.exported} exportés ERP • {kpis.completed} effectués •{" "}
                    {kpis.blocked} bloqués
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <HeroKpi
                    label="Flux générés"
                    value={kpis.generated}
                    isDark={isDark}
                  />
                  <HeroKpi
                    label="Exportés ERP"
                    value={kpis.exported}
                    isDark={isDark}
                  />
                  <HeroKpi
                    label="Effectués"
                    value={kpis.completed}
                    tone="success"
                    isDark={isDark}
                  />
                  <HeroKpi
                    label="Bloqués"
                    value={kpis.blocked}
                    tone="danger"
                    isDark={isDark}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Filtres */}
            <Card className={sectionCardClass}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="generated">Généré</SelectItem>
                      <SelectItem value="exported_erp">Exporté ERP</SelectItem>
                      <SelectItem value="completed">Effectué</SelectItem>
                      <SelectItem value="blocked">Bloqué</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Période d'échéance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">
                        Mois en cours
                      </SelectItem>
                      <SelectItem value="next_month">Mois prochain</SelectItem>
                      <SelectItem value="last_30_days">
                        30 derniers jours
                      </SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Contrat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les contrats</SelectItem>
                      <SelectItem value="KLX-2024-034">KLX-2024-034</SelectItem>
                      <SelectItem value="KLX-2024-089">KLX-2024-089</SelectItem>
                      <SelectItem value="KLX-2024-012">KLX-2024-012</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Input placeholder="Min" type="number" className="w-24" />
                    <Input placeholder="Max" type="number" className="w-24" />
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher flux/facture..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tableau des flux */}
            <Card className={sectionCardClass}>
              <CardContent className="p-0">
                {flowsLoading ? (
                  <div
                    className={cn(
                      "flex items-center justify-center p-4 text-sm",
                      mutedText,
                    )}
                  >
                    Chargement des flux de paiement...
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className={tableHeaderClass}>
                          <tr>
                            <TableHeadCell>Flow ID</TableHeadCell>
                            <TableHeadCell>Plan ID</TableHeadCell>
                            <TableHeadCell>Contrat</TableHeadCell>
                            <TableHeadCell>Échéance</TableHeadCell>
                            <TableHeadCell>Montant / Devise</TableHeadCell>
                            <TableHeadCell>Réf. facture</TableHeadCell>
                            <TableHeadCell>Statut</TableHeadCell>
                            <TableHeadCell>Dernier événement ERP</TableHeadCell>
                            <TableHeadCell>Actions</TableHeadCell>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredFlows.map((flow) => (
                            <tr
                              key={flow.id}
                              className={tableRowClass("hover:bg-slate-50")}
                            >
                              <td className="px-4 py-3 text-sm font-medium text-[#0F2A43]">
                                {flow.id}
                              </td>
                              <td className="px-4 py-3 text-sm text-[#C9A646]">
                                {flow.planId}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div>
                                  <div className="font-medium">
                                    {flow.contractId}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    {flow.contractName}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  {flow.dueDate}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">
                                {(flow.amount ?? 0).toLocaleString("fr-FR")}{" "}
                                {flow.currency}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {flow.invoiceRef}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="space-y-1">
                                  {getStatusBadge(flow.status)}
                                  {flow.status === "blocked" &&
                                    flow.blockReason && (
                                      <div className="flex items-center gap-1 text-red-600">
                                        <TrendingUp className="w-3 h-3" />
                                        <span className="text-xs">
                                          {flow.blockReason}
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {flow.lastERPEvent}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedFlow(flow)}
                                >
                                  Détails
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredFlows.length === 0 && !flowsLoading && (
                      <div className="text-center py-12">
                        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className={cn("text-sm mb-2", primaryText)}>
                          Aucun flux pour la période sélectionnée.
                        </p>
                        <p className={cn("text-xs mb-4", mutedText)}>
                          Ajustez vos filtres pour voir les flux.
                        </p>
                        <Button variant="outline" className="mt-2">
                          Changer les filtres
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Panneau latéral de détail */}
            <Sheet
              open={!!selectedFlow}
              onOpenChange={() => setSelectedFlow(null)}
            >
              <SheetContent className="w-full sm:max-w-xl">
                {selectedFlow && (
                  <>
                    <SheetHeader>
                      <SheetTitle>
                        Détail du flux {selectedFlow.id}
                      </SheetTitle>
                      <SheetDescription>
                        Échéance : {selectedFlow.dueDate}
                      </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                      {/* En-tête */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Statut</span>
                          {getStatusBadge(selectedFlow.status)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">
                            Montant
                          </span>
                          <span className="text-lg font-bold text-[#0F2A43]">
                            {(selectedFlow.amount ?? 0).toLocaleString(
                              "fr-FR"
                            )}{" "}
                            {selectedFlow.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Devise</span>
                          <span className="text-sm">
                            {selectedFlow.currency}
                          </span>
                        </div>
                      </div>

                      {/* Liens */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Liens</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              Contrat
                            </span>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-[#0F2A43]"
                            >
                              {selectedFlow.contractId}
                              <ArrowUpRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              Plan d&apos;origine
                            </span>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-[#0F2A43]"
                            >
                              {selectedFlow.planId}
                              <ArrowUpRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                              Réf. facture
                            </span>
                            <span className="text-sm font-medium">
                              {selectedFlow.invoiceRef}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Journal ERP */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Journal ERP</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  Export réussi
                                </p>
                                <p className="text-xs text-gray-500">
                                  2025-01-21 09:00 - SAP
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  Tentative d&apos;export
                                </p>
                                <p className="text-xs text-gray-500">
                                  2025-01-21 08:55 - SAP
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  Création du flux
                                </p>
                                <p className="text-xs text-gray-500">
                                  2025-01-20 15:45
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Bloc blocage si présent */}
                      {selectedFlow.status === "blocked" && (
                        <Alert className="border-red-200 bg-red-50">
                          <Ban className="h-4 w-4 text-red-600" />
                          <AlertDescription>
                            <strong>Motif du blocage :</strong>{" "}
                            {selectedFlow.blockReason}
                            <br />
                            <span className="text-xs text-gray-600">
                              Date de blocage : 2025-01-22 10:15
                            </span>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {selectedFlow.status === "generated" && (
                          <Button className="flex-1 bg-[#0F2A43] hover:bg-[#0F2A43]/90">
                            <Database className="w-4 h-4 mr-2" />
                            Renvoyer à l&apos;ERP
                          </Button>
                        )}
                        {selectedFlow.status === "blocked" && (
                          <Button
                            variant="outline"
                            className="flex-1 border-[#C9A646] text-[#C9A646] hover:bg-[#C9A646]/10"
                          >
                            Accéder au blocage
                          </Button>
                        )}
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
  );
}

/* === Petits composants pour KPI / tableaux === */

function HeroKpi({
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
  const bg =
    tone === "danger"
      ? isDark
        ? "bg-red-500/10 border-red-500/40 text-red-100"
        : "bg-red-50 border-red-200 text-red-700"
      : tone === "success"
      ? isDark
        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-100"
        : "bg-emerald-50 border-emerald-200 text-emerald-700"
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
      <span className="font-medium">{label}</span>
      <span className="font-semibold">
        {value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}

function TableHeadCell({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase">
      {children}
    </th>
  );
}
