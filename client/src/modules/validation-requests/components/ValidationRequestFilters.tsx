import * as React from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import { Search as SearchIcon } from "lucide-react";
import { STATUS_OPTIONS } from "../domain/constants";

export type ValidationRequestFiltersValue = {
  status: "all" | "pending" | "approved" | "rejected" | "redirected";
  search: string;
  type: string; // contract, amendment, …
  referenceId: string; // id technique lié
  createdFrom: string; // yyyy-mm-dd
};

type Props = {
  value: ValidationRequestFiltersValue;
  onChange: (patch: Partial<ValidationRequestFiltersValue>) => void;
};

export default function ValidationRequestFilters({ value, onChange }: Props) {
  return (
    <>
      {/* Recherche libre (référence/sujet/ID + noms/emails utilisateurs) */}
      <TextField
        label="Référence / Sujet / ID / Utilisateur…"
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
            status: e.target.value as ValidationRequestFiltersValue["status"],
          })
        }
        size="small"
        fullWidth
        color="primary"
      >
        {STATUS_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      {/* Type */}
      <TextField
        label="Type (contract / amendment …)"
        value={value.type ?? ""}
        onChange={(e) => onChange({ type: e.target.value })}
        size="small"
        fullWidth
        color="primary"
      />

      {/* Reference ID */}
      <TextField
        label="Reference ID"
        value={value.referenceId ?? ""}
        onChange={(e) => onChange({ referenceId: e.target.value })}
        size="small"
        fullWidth
        color="primary"
      />

      {/* Créée depuis */}
      <TextField
        type="date"
        label="Créée depuis"
        value={value.createdFrom ?? ""}
        onChange={(e) => onChange({ createdFrom: e.target.value })}
        size="small"
        fullWidth
        color="primary"
        InputLabelProps={{ shrink: true }}
      />
    </>
  );
}
