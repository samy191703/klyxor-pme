// client/src/pages/ClientsListPage.tsx

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

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
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";
import {
  Search,
  RefreshCw,
  Plus,
  Building2,
  Mail,
  Phone,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toDisplayName(c: any): string {
  return (
    c.name ||
    c.legalName ||
    c.raison_sociale ||
    [c.prenom, c.nom].filter(Boolean).join(" ") ||
    c.code ||
    c.id ||
    "Client"
  );
}

function toContactName(c: any): string {
  return (
    c.contactName ||
    [c.prenom, c.nom].filter(Boolean).join(" ") ||
    ""
  );
}

function toEmail(c: any): string {
  return c.email || c.contactEmail || "";
}

function toPhone(c: any): string {
  return c.telephone || c.phone || c.contactPhone || "";
}

function toCity(c: any): string {
  return c.city || c.ville || "";
}

function toPostalCode(c: any): string {
  return c.postalCode || c.zipCode || c.code_postal || "";
}

function toCountry(c: any): string {
  return c.country || c.pays || "";
}

function toSegment(c: any): string {
  return c.segment || c.type || c.type_client || "";
}

function toStatusString(c: any): string {
  if (c.status) return String(c.status);
  if (c.actif === true) return "Actif";
  if (c.actif === false) return "Inactif";
  return "";
}

function formatDate(value: any): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ClientsListPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = useQuery<any>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement des clients.");
      }
      return res.json();
    },
  });

  // ⚠️ Adaptation au format réel : { page, pageSize, total, data }
  const raw = clientsData;
  const clients: any[] = Array.isArray(raw)
    ? raw
    : raw?.data ?? raw?.rows ?? [];
  const totalClients: number =
    raw && typeof raw.total === "number" ? raw.total : clients.length;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c: any) => {
      const s = toStatusString(c);
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [clients]);

  const segmentOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c: any) => {
      const seg = toSegment(c);
      if (seg) set.add(seg);
    });
    return Array.from(set);
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return clients.filter((c: any) => {
      const status = toStatusString(c);
      const segment = toSegment(c);

      if (statusFilter !== "all") {
        if (status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      if (segmentFilter !== "all") {
        if (!segment || segment !== segmentFilter) return false;
      }

      if (q) {
        const haystack = [
          toDisplayName(c),
          toContactName(c),
          toEmail(c),
          toPhone(c),
          toCity(c),
          toCountry(c),
          segment,
          status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [clients, search, statusFilter, segmentFilter]);

  const kpi = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c: any) =>
      toStatusString(c).toLowerCase().includes("act"),
    ).length;
    const prospect = clients.filter((c: any) =>
      toStatusString(c).toLowerCase().includes("pros"),
    ).length;

    return { total, active, prospect };
  }, [clients]);

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Clients actualisés",
      description: "La liste des clients a été rafraîchie.",
    });
  };

  const handleNewClient = () => {
    navigate("/clients/new");
  };

  const handleOpenClient = (client: any) => {
    if (client.id) navigate(`/clients/${client.id}`);
  };

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleRefresh}
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
        <Button
          onClick={handleNewClient}
          className="gap-2 bg-[var(--klyxor-bleu-nuit,#111827)] text-xs text-white hover:bg-slate-900"
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </div>
    );
  };

  return (
    <KlyxorPageLayout
      title="Base clients"
      subtitle="Gestion des clients, contacts et segments."
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

        if (error) {
          return (
            <Card className={sectionCardClass}>
              <CardContent className="p-6 text-center text-sm text-red-500">
                Erreur lors du chargement des clients.
              </CardContent>
            </Card>
          );
        }

        if (isLoading && clients.length === 0) {
          return (
            <Card className={sectionCardClass}>
              <CardContent className="p-6 text-center text-sm">
                <span className={mutedText}>Chargement des clients…</span>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-4" data-testid="clients-main">
            {/* HERO KPI */}
            <Card className={heroCardClass}>
              <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr,1fr]">
                <div className="flex flex-col gap-2">
                  <div
                    className={cn(
                      "text-xs font-medium",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    Vue globale de la base clients
                  </div>
                  <div
                    className={cn(
                      "text-sm",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    {kpi.total} client(s) au total • {kpi.active} actif(s) •{" "}
                    {kpi.prospect} prospect(s).
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <HeroKpi
                    label="Total clients"
                    value={kpi.total}
                    isDark={isDark}
                  />
                  <HeroKpi
                    label="Actifs"
                    value={kpi.active}
                    tone="success"
                    isDark={isDark}
                  />
                  <HeroKpi
                    label="Prospects"
                    value={kpi.prospect}
                    tone="warning"
                    isDark={isDark}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Filtres */}
            <Card className={sectionCardClass}>
              <CardContent className="space-y-3 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr,1fr,1fr]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Rechercher un client, contact, ville, pays…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={cn(
                        "pl-9",
                        isDark
                          ? "border-slate-700 bg-slate-950 text-slate-50 placeholder:text-slate-500"
                          : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
                      )}
                    />
                  </div>

                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v)}
                  >
                    <SelectTrigger
                      className={cn(
                        isDark
                          ? "border-slate-700 bg-slate-950 text-slate-50"
                          : "border-slate-200 bg-white text-slate-900",
                      )}
                    >
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={segmentFilter}
                    onValueChange={(v) => setSegmentFilter(v)}
                  >
                    <SelectTrigger
                      className={cn(
                        isDark
                          ? "border-slate-700 bg-slate-950 text-slate-50"
                          : "border-slate-200 bg-white text-slate-900",
                      )}
                    >
                      <SelectValue placeholder="Segment / Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les segments</SelectItem>
                      {segmentOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tableau clients */}
            <Card className={sectionCardClass}>
              <CardHeader className="px-4 pt-4 pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle
                      className={cn("text-sm font-semibold", primaryText)}
                    >
                      Clients ({filteredClients.length})
                    </CardTitle>
                    <CardDescription
                      className={cn("text-[11px]", secondaryText)}
                    >
                      Liste des clients et principaux contacts.
                    </CardDescription>
                  </div>
                  <div className={cn("text-[11px]", mutedText)}>
                    {totalClients} client(s) au total
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredClients.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className={cn("mb-2 text-sm", primaryText)}>
                      Aucun client ne correspond aux filtres.
                    </p>
                    <p className={cn("text-xs", mutedText)}>
                      Ajustez vos filtres ou créez un nouveau client.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className={tableHeaderClass}>
                        <TableRow>
                          <TableHead className="text-[11px]">Client</TableHead>
                          <TableHead className="text-[11px]">
                            Contact principal
                          </TableHead>
                          <TableHead className="text-[11px]">Email</TableHead>
                          <TableHead className="text-[11px]">
                            Téléphone
                          </TableHead>
                          <TableHead className="text-[11px]">Segment</TableHead>
                          <TableHead className="text-[11px]">Statut</TableHead>
                          <TableHead className="text-[11px]">
                            Localisation
                          </TableHead>
                          <TableHead className="text-[11px]">
                            Créé le
                          </TableHead>
                          <TableHead className="text-[11px]">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map((c: any) => {
                          const name = toDisplayName(c);
                          const contactName = toContactName(c);
                          const email = toEmail(c);
                          const phone = toPhone(c);
                          const segment = toSegment(c);
                          const statusLabel = toStatusString(c);
                          const city = toCity(c);
                          const postal = toPostalCode(c);
                          const country = toCountry(c);

                          return (
                            <TableRow
                              key={c.id}
                              className={tableRowClass("cursor-pointer")}
                              onClick={() => handleOpenClient(c)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                    <Building2 className="h-4 w-4 text-slate-500" />
                                  </div>
                                  <div>
                                    <div
                                      className={cn(
                                        "text-sm font-medium",
                                        primaryText,
                                      )}
                                    >
                                      {name}
                                    </div>
                                    <div
                                      className={cn(
                                        "text-[11px]",
                                        mutedText,
                                      )}
                                    >
                                      {c.code || c.number || ""}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex flex-col">
                                  <span
                                    className={cn(
                                      "text-sm",
                                      primaryText,
                                    )}
                                  >
                                    {contactName || "—"}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  <span
                                    className={cn(
                                      "truncate",
                                      primaryText,
                                    )}
                                  >
                                    {email || "—"}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  <span
                                    className={cn(
                                      "truncate",
                                      primaryText,
                                    )}
                                  >
                                    {phone || "—"}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell>
                                <span
                                  className={cn(
                                    "text-xs",
                                    primaryText,
                                  )}
                                >
                                  {segment || "—"}
                                </span>
                              </TableCell>

                              <TableCell>
                                <ClientStatusBadge status={statusLabel} />
                              </TableCell>

                              <TableCell>
                                <span
                                  className={cn(
                                    "text-xs",
                                    primaryText,
                                  )}
                                >
                                  {[
                                    city,
                                    postal,
                                    country,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                                </span>
                              </TableCell>

                              <TableCell>
                                <span
                                  className={cn(
                                    "text-[11px]",
                                    primaryText,
                                  )}
                                >
                                  {formatDate(c.createdAt || c.created_at)}
                                </span>
                              </TableCell>

                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={cn(
                                    "text-xs",
                                    isDark
                                      ? "text-slate-100 hover:bg-slate-900"
                                      : "text-slate-700 hover:bg-slate-100",
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenClient(c);
                                  }}
                                >
                                  Voir
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      }}
    </KlyxorPageLayout>
  );
}

/* === Petits composants pour KPI / statut === */

function HeroKpi({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
  isDark: boolean;
}) {
  const bg =
    tone === "success"
      ? isDark
        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-100"
        : "bg-emerald-50 border-emerald-200 text-emerald-700"
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
        "flex items-center justify-between rounded-lg border px-3 py-2 text-[11px]",
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

function ClientStatusBadge({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();

  if (!status) {
    return (
      <Badge variant="outline" className="text-xs">
        N/A
      </Badge>
    );
  }

  if (s.includes("act")) {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
        Actif
      </Badge>
    );
  }

  if (s.includes("pros")) {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-xs text-amber-700">
        Prospect
      </Badge>
    );
  }

  if (s.includes("inact") || s.includes("close")) {
    return (
      <Badge className="border-slate-200 bg-slate-50 text-xs text-slate-700">
        Inactif
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      {status}
    </Badge>
  );
}
