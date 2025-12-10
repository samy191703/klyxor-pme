// src/modules/clients/components/ClientsPage.tsx
import { useState, useMemo } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useClients } from "../queries/useClients";

import type { Client } from "../domain/types";
import ClientFilters, { ClientFiltersValue } from "./ClientFilters";
import { ClientsTable } from "./ClientsTable";
import { CreateClientDialog } from "./Dialogs/CreateClientDialog";
// import { CreateClientDialog } from "./CreateClientDialog";
// import { ViewClientDialog } from "./ViewClientDialog";
// import { EditClientDialog } from "./EditClientDialog";

export default function ClientsPage() {
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();

  const {
    data: clients = [],
    isLoading,
    error,
    refetch,
  } = useClients();

  const [filters, setFilters] = useState<ClientFiltersValue>({
    search: "",
    status: "all",
    type: "all",
  });

  const [selected, setSelected] = useState<Client | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  // KPI visibility + table expansion (copié de AmendmentsPage)
  const [showKpis, setShowKpis] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return clients.filter((c) => {
      if (filters.status === "active" && !c.isActive) return false;
      if (filters.status === "inactive" && c.isActive) return false;
      if (
        filters.type !== "all" &&
        c.typeClient !== filters.type
      )
        return false;

      if (q) {
        const label =
          c.typeClient === "professionnel"
            ? c.companyName
            : [c.lastName, c.firstName].filter(Boolean).join(" ");

        const haystack = [
          label,
          c.email,
          c.siret,
          c.city,
          c.postalCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [clients, filters]);

  const handleDelete = async (id: string) => {
    if (
      !canDeleteContract() ||
      !confirm("Êtes-vous sûr de vouloir supprimer ce client ?")
    )
      return;
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete_failed");
      toast({
        title: "Client supprimé",
        description: "Le client a été supprimé avec succès",
      });
      await refetch();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client",
        variant: "destructive",
      });
    }
  };

  const toggleExpand = () => {
    setExpanded((e) => {
      const next = !e;
      setShowKpis(!next ? true : false); // cacher les KPI en mode étendu
      // même logique que dans Amendments (itemsPerPage si tu le réactives)
      setFilters((s) => ({ ...s, itemsPerPage: next ? 25 : 100 } as any));
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
    setShowKpis(false);
    setExpanded(true);
    setFilters((s) => ({ ...s }));
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Chargement des clients...
      </div>
    );

  if (error) {
    console.log(error);
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Erreur lors du chargement des clients {(error as Error).message}
      </div>
    );
  }

  const kpi = {
    total: clients.length,
    pros: clients.filter((c) => c.typeClient === "professionnel").length,
    indiv: clients.filter((c) => c.typeClient === "particulier").length,
    active: clients.filter((c) => c.isActive).length,
    inactive: clients.filter((c) => !c.isActive).length,
  };

  return (
    <div
      className="flex flex-col h-full bg-gray-50"
      data-testid="clients-main"
    >
      <Header />
      <main className="h-[calc(100vh-64px)] px-4 py-2 lg:px-6 lg:py-1">
        <div className="w-full">
          <div className="mb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestion des Clients
                </h1>
                <p className="text-gray-600 mt-1">
                  Gérer vos clients et leurs informations contractuelles
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setOpenCreate(true)}
                  data-testid="button-new-client"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau client
                </Button>
                <Button
                  variant="outline"
                  onClick={toggleExpand}
                  title={expanded ? "Réduire" : "Agrandir le tableau"}
                >
                  {expanded ? (
                    <EyeIcon className="w-4 h-4 mr-2" />
                  ) : (
                    <EyeOffIcon className="w-4 h-4 mr-2" />
                  )}
                  Statistiques
                </Button>
              </div>
            </div>
          </div>

          {/* KPI – cachés en mode étendu, comme pour Amendments */}
          {showKpis && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-3">
              {[
                { v: kpi.total, l: "Total clients", c: "" },
                { v: kpi.pros, l: "Professionnels", c: "text-blue-600" },
                { v: kpi.indiv, l: "Particuliers", c: "text-purple-600" },
                { v: kpi.active, l: "Actifs", c: "text-green-600" },
                { v: kpi.inactive, l: "Inactifs", c: "text-gray-600" },
              ].map((x, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className={`text-2xl font-bold ${x.c}`}>{x.v}</div>
                    <div className="text-sm text-gray-600">{x.l}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Filtres */}
          <Card className="mb-3">
            <CardContent className="p-4 flex justify-between items-center gap-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <ClientFilters
                  value={filters}
                  onChange={(patch) =>
                    setFilters((s) => ({ ...s, ...patch }))
                  }
                />
              </div>

              <div className="flex items-center space-x-2 justify-end">
                <Button variant="outline" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tableau */}
          <Card>
            <CardContent className="p-0">
              <ClientsTable
                rows={filtered}
                height={expanded ? "500px" : "400px"}
                onView={(c) => {
                  setSelected(c);
                  setOpenView(true);
                }}
                onEdit={(c) => {
                  setSelected(c);
                  setOpenEdit(true);
                }}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialogs – mêmes signatures que pour Amendments, mais adaptés au client */}
       <CreateClientDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        canCreate={canCreateContract()}
      />
      {/*<ViewClientDialog
        open={openView}
        onOpenChange={setOpenView}
        client={selected}
      />
      <EditClientDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        client={selected}
        canEdit={canModifyContract()}
      /> */}
    </div>
  );
}
