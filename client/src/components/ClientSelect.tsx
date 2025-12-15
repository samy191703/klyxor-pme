// client/src/components/ClientSelect.tsx

import {
  useState,
  useEffect,
  useMemo,
  type ChangeEvent,
} from "react";

import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ClientOption {
  id: string | number;
  name: string;
  reference?: string | null;
}

interface ClientSelectProps {
  value: string;
  // onChange remonte la valeur + l'option complète (pour récupérer le nom)
  onChange: (value: string, option?: ClientOption | null) => void;
  disabled?: boolean;
}

/**
 * ClientSelect – version stable :
 *
 * - Charge /api/clients au montage (backend: { page, pageSize, total, data: [...] })
 * - Filtre en JS sur (raison_sociale, prénom, nom, email)
 * - UX : champ de recherche + Select shadcn en dessous
 */
export function ClientSelect({ value, onChange, disabled }: ClientSelectProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Chargement des clients au montage
  useEffect(() => {
    let cancelled = false;

    const loadClients = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // apiRequest renvoie un Response → on parse en JSON
        const res = await apiRequest("GET", "/api/clients");
        const json: any = await res.json();

        if (cancelled) return;

        const rawList = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];

        const mapped: ClientOption[] = rawList.map((c: any) => {
          const fullName = [c.prenom, c.nom].filter(Boolean).join(" ").trim();
          const displayName =
            c.raison_sociale && c.raison_sociale.trim().length > 0
              ? c.raison_sociale
              : fullName || c.email || "Client sans nom";

          return {
            id: c.id ?? "",
            name: displayName,
            reference: c.type_Client ?? null,
          };
        });

        setClients(mapped);
      } catch (err) {
        console.error("[ClientSelect] Erreur chargement /api/clients", err);
        if (!cancelled) {
          setLoadError("Impossible de charger la liste des clients.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadClients();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filtrage côté front
  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((c) => {
      const haystack = [c.name, c.reference]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, search]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const noResults =
    !loading && !loadError && filteredClients.length === 0 && search.trim() !== "";

  return (
    <div className="space-y-2">
      {/* Champ de recherche (filtre local uniquement) */}
      <Input
        placeholder="Rechercher un client (nom, raison sociale, email...)"
        value={search}
        onChange={handleSearchChange}
        disabled={disabled}
      />

      {/* Select shadcn pour le choix final */}
      <Select
        value={value}
        onValueChange={(val) => {
          const selected =
            filteredClients.find((c) => String(c.id) === String(val)) ?? null;
          onChange(val, selected);
        }}
        disabled={disabled || !!loadError || loading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              loadError
                ? loadError
                : loading
                ? "Chargement de la liste..."
                : noResults
                ? `Aucun client pour "${search.trim()}"`
                : "Sélectionner un client"
            }
          />
        </SelectTrigger>

        <SelectContent>
          {filteredClients.map((client) => (
            <SelectItem key={String(client.id)} value={String(client.id)}>
              {client.name}
              {client.reference ? ` (${client.reference})` : ""}
            </SelectItem>
          ))}

          {noResults && (
            <div className="px-3 py-2 text-xs text-slate-500">
              Aucun client pour &quot;{search.trim()}&quot;
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
