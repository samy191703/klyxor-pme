import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import { SearchIcon } from "lucide-react";
import { STATUS_OPTIONS } from "../domain/constants";

export interface TerminationFiltersValue {
  period: "all" | "30days" | "90days" | "year";
  effectiveFrom: string;
  status: "all" | "draft" | "to_validate" | "validated" | "rejected";
  search: string;
  contract: string;
  requester: string;
  validator: string;
}

export default function TerminationFilters({
  value,
  onChange,
}: {
  value: TerminationFiltersValue;
  onChange: (patch: Partial<TerminationFiltersValue>) => void;
}) {
  return (
    <>
      {/* Recherche ID/Contrat/Motif */}
      <TextField
        label="ID / Contrat / Motif"
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
            status: e.target.value as TerminationFiltersValue["status"],
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

      {/* Période de demande */}
      <TextField
        select
        label="Période de demande"
        value={value.period ?? "all"}
        onChange={(e) =>
          onChange({
            period: e.target.value as TerminationFiltersValue["period"],
          })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        <MenuItem value="30days">30 jours</MenuItem>
        <MenuItem value="90days">90 jours</MenuItem>
        <MenuItem value="year">Cette année</MenuItem>
      </TextField>

      {/* Date d'effet min. */}
      <TextField
        type="date"
        label="Date d'effet min."
        value={value.effectiveFrom ?? ""}
        onChange={(e) => onChange({ effectiveFrom: e.target.value })}
        size="small"
        fullWidth
        color="primary"
        InputLabelProps={{ shrink: true }}
      />

      {/* Contrat */}
      <TextField
        label="Contrat (N° ou intitulé)"
        value={value.contract ?? ""}
        onChange={(e) => onChange({ contract: e.target.value })}
        size="small"
        fullWidth
        color="primary"
      />

      {/* Demandeur */}
      <TextField
        label="Demandeur"
        value={value.requester ?? ""}
        onChange={(e) => onChange({ requester: e.target.value })}
        size="small"
        fullWidth
        color="primary"
      />

      {/* Valideur assigné */}
      <TextField
        label="Valideur assigné"
        value={value.validator ?? ""}
        onChange={(e) => onChange({ validator: e.target.value })}
        size="small"
        fullWidth
        color="primary"
      />
    </>
  );
}
