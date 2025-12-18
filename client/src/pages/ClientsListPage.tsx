// client/src/pages/ClientsListPage.tsx

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  AlertCircle,
  RefreshCw,
  Filter,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function toDisplayName(c: any): string {
  return (
    c.name ||
    c.legalName ||
    c.raison_sociale ||
    [c.prenom, c.nom].filter(Boolean).join(" ") ||
    c.code ||
    "Client (sans nom)"
  );
}

function toContactName(c: any): string {
  return c.contactName || [c.prenom, c.nom].filter(Boolean).join(" ") || "";
}

function toEmail(c: any): string {
  return c.email || c.contactEmail || "";
}

function toPhone(c: any): string {
  return c.telephone || c.phone || c.contactPhone || "";
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

function ClientStatusBadge({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();

  if (!status) {
    return (
      <Badge
        variant="outline"
        className="text-xs border-slate-200 bg-slate-50 text-slate-700"
      >
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
    <Badge
      variant="outline"
      className="text-xs border-slate-200 bg-white text-slate-700"
    >
      {status}
    </Badge>
  );
}

function KpiChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}) {
  const box =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 text-[11px]",
        box,
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="font-semibold">{value ?? 0}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function ClientsListPage() {
  const [, navigate] = useLocation();

  const { data: clientsData, isLoading, error } = useQuery<any>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement des clients.");
      return res.json();
    },
  });

  const raw = clientsData;
  const clients: any[] = Array.isArray(raw)
    ? raw
    : raw?.data ?? raw?.rows ?? [];
  const totalClients: number =
    raw && typeof raw.total === "number" ? raw.total : clients.length;

  // UI state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c: any) => {
      const s = toStatusString(c);
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [clients]);

  const segmentOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c: any) => {
      const seg = toSegment(c);
      if (seg) set.add(seg);
    });
    return Array.from(set).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();

    return clients.filter((c: any) => {
      const status = toStatusString(c);
      const segment = toSegment(c);

      if (
        statusFilter !== "all" &&
        status.toLowerCase() !== statusFilter.toLowerCase()
      )
        return false;

      if (segmentFilter !== "all" && (!segment || segment !== segmentFilter))
        return false;

      if (q) {
        const haystack = [
          toDisplayName(c),
          toContactName(c),
          toEmail(c),
          toPhone(c),
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

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSegmentFilter("all");
  };

  const handleNewClient = () => navigate("/clients/new");
  const handleOpenClient = (client: any) =>
    client?.id && navigate(`/clients/${client.id}`);

  return (
    <div className="w-full space-y-4" data-testid="clients-main">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Base clients
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestion des clients, contacts et segments.
          </p>
        </div>

        <Button className="gap-2" onClick={handleNewClient}>
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      {/* Bandeau état */}
      {(isLoading || error) && (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs",
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-600",
          )}
        >
          <div className="min-w-0">
            {error ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  Erreur lors du chargement des clients.
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                <span className="truncate">Chargement des clients…</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4 lg:grid-cols-6">
        <KpiChip label="Total" value={kpi.total} />
        <KpiChip label="Actifs" value={kpi.active} tone="success" />
        <KpiChip label="Prospects" value={kpi.prospect} tone="warning" />
      </div>

      {/* Filtres */}
      <Card className="border-slate-200 bg-white">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher un client, contact, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Filtres</span>
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-[170px] border-slate-200 bg-white text-slate-900">
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

            <Select value={segmentFilter} onValueChange={(v) => setSegmentFilter(v)}>
              <SelectTrigger className="w-[170px] border-slate-200 bg-white text-slate-900">
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

      {/* Table */}
      <Card className="border-slate-200 bg-white">
        <CardHeader className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Clients ({filteredClients.length})
              </CardTitle>
              <div className="text-[11px] text-slate-500">
                Cliquez sur une ligne pour ouvrir la fiche client.
              </div>
            </div>
            <div className="text-[11px] text-slate-500">{totalClients} au total</div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!isLoading && filteredClients.length === 0 ? (
            <div className="py-10 text-center">
              <p className="mb-2 text-sm text-slate-900">
                Aucun client ne correspond aux filtres.
              </p>
              <p className="text-xs text-slate-500">
                Ajustez vos filtres ou créez un nouveau client.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[11px]">Client</TableHead>
                    <TableHead className="text-[11px]">Contact</TableHead>
                    <TableHead className="text-[11px]">Email</TableHead>
                    <TableHead className="text-[11px]">Téléphone</TableHead>
                    <TableHead className="text-[11px]">Segment</TableHead>
                    <TableHead className="text-[11px]">Statut</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading && (
                    <>
                      <SkeletonRow colSpan={6} />
                      <SkeletonRow colSpan={6} />
                      <SkeletonRow colSpan={6} />
                    </>
                  )}

                  {!isLoading &&
                    filteredClients.map((c: any) => {
                      const name = toDisplayName(c);
                      const contactName = toContactName(c);
                      const email = toEmail(c);
                      const phone = toPhone(c);
                      const segment = toSegment(c);
                      const statusLabel = toStatusString(c);

                      return (
                        <TableRow
                          key={c.id}
                          className="border-slate-100 hover:bg-slate-50 cursor-pointer"
                          onClick={() => handleOpenClient(c)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                <Building2 className="h-4 w-4 text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">
                                  {name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {c.code || c.number || ""}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-slate-900">
                            {contactName || "—"}
                          </TableCell>

                          <TableCell className="text-sm text-slate-900">
                            <div className="flex items-center gap-1 min-w-0">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="truncate">{email || "—"}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-slate-900">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span className="truncate">{phone || "—"}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs text-slate-900">
                            {segment || "—"}
                          </TableCell>

                          <TableCell>
                            <ClientStatusBadge status={statusLabel} />
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
}

function SkeletonRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow className="border-slate-100">
      <TableCell colSpan={colSpan} className="py-3">
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      </TableCell>
    </TableRow>
  );
}
