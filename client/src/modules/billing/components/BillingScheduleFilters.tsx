// src/modules/billing/components/BillingScheduleFilters.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BillingScheduleFiltersValue = {
  search: string;
  status: "all" | "draft" | "active" | "archived";
};

export default function BillingScheduleFilters({
  value,
  onChange,
}: {
  value: BillingScheduleFiltersValue;
  onChange: (patch: Partial<BillingScheduleFiltersValue>) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label htmlFor="search">Recherche</Label>
        <Input
          id="search"
          placeholder="ID échéancier / N° contrat"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="status">Statut</Label>
        <Select
          value={value.status}
          onValueChange={(v) =>
            onChange({ status: v as BillingScheduleFiltersValue["status"] })
          }
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="archived">Archivé</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
