// src/modules/billing/components/BillingScheduleFilters.tsx
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import { Search as SearchIcon } from "lucide-react";
import {
  BILLING_FREQUENCY_LABELS,
  BILLING_TYPE_LABELS,
} from "../domain/constants";

export type BillingScheduleFiltersValue = {
  search: string;
  status: "all" | "draft" | "active" | "archived";
  frequency: "all" | keyof typeof BILLING_FREQUENCY_LABELS;
  billingType: "all" | keyof typeof BILLING_TYPE_LABELS;
  version: string;
};

// Options locales
const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "draft", label: "Brouillon" },
  { value: "active", label: "Actif" },
  { value: "archived", label: "Archivé" },
];

export default function BillingScheduleFilters({
  value,
  onChange,
}: {
  value: BillingScheduleFiltersValue;
  onChange: (patch: Partial<BillingScheduleFiltersValue>) => void;
}) {
  return (
    <>
      {/* Recherche ID/Contrat */}
      <TextField
        label="ID échéancier / N° contrat"
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
            status: e.target.value as BillingScheduleFiltersValue["status"],
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

      {/* Fréquence */}
      <TextField
        select
        label="Fréquence"
        value={value.frequency ?? "all"}
        onChange={(e) =>
          onChange({
            frequency: e.target
              .value as BillingScheduleFiltersValue["frequency"],
          })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Toutes</MenuItem>
        {Object.entries(BILLING_FREQUENCY_LABELS).map(([key, label]) => (
          <MenuItem key={key} value={key}>
            {label}
          </MenuItem>
        ))}
      </TextField>

      {/* Type */}
      <TextField
        select
        label="Type de facturation"
        value={value.billingType ?? "all"}
        onChange={(e) =>
          onChange({
            billingType: e.target
              .value as BillingScheduleFiltersValue["billingType"],
          })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tous</MenuItem>
        {Object.entries(BILLING_TYPE_LABELS).map(([key, label]) => (
          <MenuItem key={key} value={key}>
            {label}
          </MenuItem>
        ))}
      </TextField>

      {/* Version */}
      <TextField
        label="Version"
        value={value.version ?? ""}
        onChange={(e) => onChange({ version: e.target.value })}
        size="small"
        fullWidth
        color="primary"
        placeholder="Ex. 1, 2, 3..."
      />
    </>
  );
}
