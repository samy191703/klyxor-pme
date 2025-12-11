// src/modules/clients/components/ClientFilters.tsx
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import { SearchIcon } from "lucide-react";

import { CLIENT_STATUS_LABELS, CLIENT_TYPE_LABELS } from "../domain/constants";

export type ClientFiltersValue = {
  status: "all" | "active" | "inactive";
  type: "all" | "professionnel" | "particulier";
  search: string;
};

export default function ClientFilters({
  value,
  onChange,
}: {
  value: ClientFiltersValue;
  onChange: (patch: Partial<ClientFiltersValue>) => void;
}) {
  return (
    <>
      {/* Recherche client */}
      <TextField
        label="Client / Email / SIRET / Ville"
        value={value.search ?? ""}
        onChange={(e) => onChange({ search: e.target.value })}
        size="small"
        fullWidth
        color="primary"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon size={18} />
            </InputAdornment>
          ),
        }}
      />

      {/* Statut */}
      <TextField
        select
        label="Statut"
        value={value.status ?? "all"}
        onChange={(e) =>
          onChange({
            status: e.target.value as ClientFiltersValue["status"],
          })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        <MenuItem value="active">{CLIENT_STATUS_LABELS.active}</MenuItem>
        <MenuItem value="inactive">{CLIENT_STATUS_LABELS.inactive}</MenuItem>
      </TextField>

      {/* Type de client */}
      <TextField
        select
        label="Type de client"
        value={value.type ?? "all"}
        onChange={(e) =>
          onChange({ type: e.target.value as ClientFiltersValue["type"] })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        <MenuItem value="professionnel">
          {CLIENT_TYPE_LABELS.professionnel}
        </MenuItem>
        <MenuItem value="particulier">
          {CLIENT_TYPE_LABELS.particulier}
        </MenuItem>
      </TextField>

      {/* Afficher (pagination) – même logique que dans Amendments, si tu veux le réactiver plus tard */}
      {/* 
      <TextField
        select
        label="Afficher"
        value={value.itemsPerPage ?? 25}
        onChange={(e) => onChange({ itemsPerPage: Number(e.target.value) })}
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value={25}>25</MenuItem>
        <MenuItem value={50}>50</MenuItem>
        <MenuItem value={100}>100</MenuItem>
      </TextField>
      */}
    </>
  );
}