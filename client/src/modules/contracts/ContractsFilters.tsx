import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

export type ContractsFiltersValue = {
  period: "all" | "creation" | "effect";
  status:
    | "all"
    | "draft"
    | "pending_validation"
    | "active"
    | "terminated"
    | "closed";
  type: "all" | string;
  businessUnit: "all" | string;
  search: string;
  itemsPerPage: number;
};

export default function ContractsFilters({
  value,
  onChange,
}: {
  value: ContractsFiltersValue;
  onChange: (patch: Partial<ContractsFiltersValue>) => void;
}) {
  return (
    <>
      {/* Période */}
      <TextField
        select
        label="Période"
        value={value.period ?? "all"}
        onChange={(e) =>
          onChange({ period: e.target.value as typeof value.period })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        <MenuItem value="creation">Création</MenuItem>
        <MenuItem value="effect">Effet</MenuItem>
      </TextField>

      {/* Statut */}
      <TextField
        select
        label="Statut"
        value={value.status ?? "all"}
        onChange={(e) =>
          onChange({ status: e.target.value as typeof value.status })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        <MenuItem value="draft">Brouillon</MenuItem>
        <MenuItem value="pending_validation">À valider</MenuItem>
        <MenuItem value="active">Actif</MenuItem>
        <MenuItem value="terminated">Résilié</MenuItem>
        <MenuItem value="closed">Clôturé</MenuItem>
      </TextField>

      {/* Type */}
      <TextField
        select
        label="Type"
        value={value.type ?? "all"}
        onChange={(e) =>
          onChange({ type: e.target.value as typeof value.type })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        <MenuItem value="electricity">Électricité</MenuItem>
        <MenuItem value="gas">Gaz</MenuItem>
        <MenuItem value="renewable_ppa">PPA</MenuItem>
        <MenuItem value="maintenance">Maintenance</MenuItem>
        <MenuItem value="OMSA">OMSA</MenuItem>
        <MenuItem value="LTSA">LTSA</MenuItem>
        <MenuItem value="OMGC">OMGC</MenuItem>
      </TextField>

      {/* BU / Entité */}
      <TextField
        select
        label="BU/Entité"
        value={value.businessUnit ?? "all"}
        onChange={(e) =>
          onChange({
            businessUnit: e.target.value as typeof value.businessUnit,
          })
        }
        size="small"
        fullWidth
        color="primary"
      >
        <MenuItem value="all">Tout</MenuItem>
        {/* Replace with a dynamic list if you have one */}
        <MenuItem value="ENGIE Solutions France">
          ENGIE Solutions France
        </MenuItem>
        <MenuItem value="ENGIE Green">ENGIE Green</MenuItem>
        <MenuItem value="ENGIE Flex">ENGIE Flex</MenuItem>
        <MenuItem value="ENGIE Global Energy Management">
          ENGIE Global Energy Management
        </MenuItem>
      </TextField>

      {/* Recherche N°/titre */}
      <TextField
        label="N° / titre"
        value={value.search ?? ""}
        onChange={(e) => onChange({ search: e.target.value })}
        size="small"
        fullWidth
        color="primary"
      />
    </>
  );
}
