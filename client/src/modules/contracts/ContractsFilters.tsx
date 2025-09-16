import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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
      <Select
        value={value.period}
        onValueChange={(v) => onChange({ period: v as any })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Période" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les périodes</SelectItem>
          <SelectItem value="creation">Création</SelectItem>
          <SelectItem value="effect">Effet</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.status}
        onValueChange={(v) => onChange({ status: v as any })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="draft">Brouillon</SelectItem>
          <SelectItem value="pending_validation">À valider</SelectItem>
          <SelectItem value="active">Actif</SelectItem>
          <SelectItem value="terminated">Résilié</SelectItem>
          <SelectItem value="closed">Clôturé</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value.type} onValueChange={(v) => onChange({ type: v })}>
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          <SelectItem value="electricity">Électricité</SelectItem>
          <SelectItem value="gas">Gaz</SelectItem>
          <SelectItem value="renewable_ppa">PPA</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
          <SelectItem value="OMSA">OMSA</SelectItem>
          <SelectItem value="LTSA">LTSA</SelectItem>
          <SelectItem value="OMGC">OMGC</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.businessUnit}
        onValueChange={(v) => onChange({ businessUnit: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="BU/Entité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les BU</SelectItem>
          {/* Replace with dynamic BU list if needed */}
          <SelectItem value="ENGIE Solutions France">
            ENGIE Solutions France
          </SelectItem>
          <SelectItem value="ENGIE Green">ENGIE Green</SelectItem>
          <SelectItem value="ENGIE Flex">ENGIE Flex</SelectItem>
          <SelectItem value="ENGIE Global Energy Management">
            ENGIE Global Energy Management
          </SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="N°/titre..."
        value={value.search}
        onChange={(e) => onChange({ search: e.target.value })}
      />
    </>
  );
}
