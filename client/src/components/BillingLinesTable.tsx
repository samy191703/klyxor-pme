import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { BillingLine, BillingLineStatus } from "@/types/billing";

interface BillingLinesTableProps {
  lines: BillingLine[];
}

type SortField = "dueDate" | "amountHt" | null;
type SortDirection = "asc" | "desc";

export function BillingLinesTable({ lines }: BillingLinesTableProps) {
  const [statusFilter, setStatusFilter] = useState<"ALL" | BillingLineStatus>("ALL");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filter lines by status
  const filteredLines = useMemo(() => {
    if (statusFilter === "ALL") return lines;
    return lines.filter((line) => line.status === statusFilter);
  }, [lines, statusFilter]);

  // Sort lines
  const sortedLines = useMemo(() => {
    if (!sortField) return filteredLines;

    return [...filteredLines].sort((a, b) => {
      let comparison = 0;

      if (sortField === "dueDate") {
        comparison =
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortField === "amountHt") {
        comparison = parseFloat(a.amountHt) - parseFloat(b.amountHt);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredLines, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMMM yyyy", { locale: fr });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeVariant = (status: BillingLineStatus) => {
    return status === "FACTUREE" ? "default" : "secondary";
  };

  const getStatusLabel = (status: BillingLineStatus) => {
    return status === "FACTUREE" ? "Facturée" : "À facturer";
  };

  return (
    <div className="space-y-4">
      {/* Filter and count */}
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="A_FACTURER">À facturer</SelectItem>
            <SelectItem value="FACTUREE">Facturée</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {sortedLines.length} {sortedLines.length === 1 ? "échéance" : "échéances"} affichée{sortedLines.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      {sortedLines.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucune échéance générée pour ce contrat
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("dueDate")}
                >
                  <div className="flex items-center gap-2">
                    Date d'échéance
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("amountHt")}
                >
                  <div className="flex items-center gap-2">
                    Montant HT
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Référence facture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{formatDate(line.dueDate)}</TableCell>
                  <TableCell className="font-medium">
                    {formatAmount(line.amountHt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(line.status)}>
                      {getStatusLabel(line.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {line.invoiceReference || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

