// src/modules/amendments/components/AmendmentFilters.tsx
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import {
  AMENDMENT_STATUS_LABELS,
  AMENDMENT_TYPE_LABELS,
} from "../domain/constants";
import InputAdornment from "@mui/material/InputAdornment";
import { SearchIcon } from "lucide-react";

export type AmendmentFiltersValue = {
  status: "all" | "draft" | "pending_signature" | "active" | "rejected";
  type:
    | "all"
    | "price_revision"
    | "duration_extension"
    | "scope_change"
    | "indexation_change";
  search: string;
  itemsPerPage: number; // now numeric, like your Contracts filters
};

export default function AmendmentFilters({
  value,
  onChange,
}: {
  value: AmendmentFiltersValue;
  onChange: (patch: Partial<AmendmentFiltersValue>) => void;
}) {
  return (
    <>
      {/* Recherche N°/titre */}
      <TextField
        label="N° Avenant / Contrat / Titre"
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
            status: e.target.value as AmendmentFiltersValue["status"],
          })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        <MenuItem value="draft">{AMENDMENT_STATUS_LABELS.draft}</MenuItem>
        <MenuItem value="pending_signature">
          {AMENDMENT_STATUS_LABELS.pending_signature}
        </MenuItem>
        <MenuItem value="active">{AMENDMENT_STATUS_LABELS.active}</MenuItem>
        <MenuItem value="rejected">{AMENDMENT_STATUS_LABELS.rejected}</MenuItem>
      </TextField>

      {/* Type*/}
      <TextField
        select
        label="Type"
        value={value.type ?? "all"}
        onChange={(e) =>
          onChange({ type: e.target.value as AmendmentFiltersValue["type"] })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        <MenuItem value="price_revision">
          {AMENDMENT_TYPE_LABELS.price_revision}
        </MenuItem>
        <MenuItem value="duration_extension">
          {AMENDMENT_TYPE_LABELS.duration_extension}
        </MenuItem>
        <MenuItem value="scope_change">
          {AMENDMENT_TYPE_LABELS.scope_change}
        </MenuItem>
        <MenuItem value="indexation_change">
          {AMENDMENT_TYPE_LABELS.indexation_change}
        </MenuItem>
      </TextField>

      {/* Afficher (pagination) */}
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
    </>
  );
}
