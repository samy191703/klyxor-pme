import { useMemo, useState } from "react";
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
import type { BillingLine, BillingLineStatus } from "@/types/billing";

export interface BillingLinesTableProps {
  lines: BillingLine[];
  isLoading?: boolean;
  error?: Error | null;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

export interface SortState {
  field: "dueDate" | "amountHt" | null;
  order: "asc" | "desc" | null;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function BillingLinesTable({
  lines,
  isLoading,
  error,
}: BillingLinesTableProps) {
  const [statusFilter, setStatusFilter] = useState<"ALL" | BillingLineStatus>(
    "ALL",
  );
  const [sort, setSort] = useState<SortState>({
    field: null,
    order: null,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 25,
    totalItems: lines.length,
  });

  // Filter + sort
  const processedLines = useMemo(() => {
    const filtered =
      statusFilter === "ALL"
        ? lines
        : lines.filter((line) => line.status === statusFilter);

    if (!sort.field || !sort.order) return filtered;

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sort.field === "dueDate") {
        comparison =
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sort.field === "amountHt") {
        comparison =
          parseFloat(a.amountHt || "0") - parseFloat(b.amountHt || "0");
      }

      return sort.order === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [lines, statusFilter, sort.field, sort.order]);

  const totalAmount = useMemo(
    () =>
      processedLines.reduce((sum, line) => {
        const value = parseFloat(line.amountHt || "0");
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [processedLines],
  );

  const totalItems = processedLines.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / pagination.itemsPerPage || 1),
  );

  const currentPage = Math.min(pagination.currentPage, totalPages);
  const startIndex = (currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const paginatedLines = processedLines.slice(startIndex, endIndex);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as "ALL" | BillingLineStatus);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleItemsPerPageChange = (value: string) => {
    const itemsPerPage = Number(value) || 25;
    setPagination((prev) => ({
      ...prev,
      itemsPerPage,
      currentPage: 1,
    }));
  };

  const cycleSort = (field: SortState["field"]) => {
    setSort((prev) => {
      if (prev.field !== field) {
        return { field, order: "asc" };
      }
      if (prev.order === "asc") {
        return { field, order: "desc" };
      }
      if (prev.order === "desc") {
        return { field: null, order: null };
      }
      return { field, order: "asc" };
    });
  };

  const renderSortIcon = (field: SortState["field"]) => {
    if (sort.field !== field || !sort.order) {
      return <span aria-hidden="true">↕</span>;
    }
    if (sort.order === "asc") {
      return <span aria-hidden="true">↑</span>;
    }
    return <span aria-hidden="true">↓</span>;
  };

  const getStatusBadgeVariant = (status: BillingLineStatus) =>
    status === "FACTUREE" ? "default" : "secondary";

  const getStatusLabel = (status: BillingLineStatus) =>
    status === "FACTUREE" ? "Facturée" : "À facturer";

  const hasLines = lines.length > 0;
  const hasResults = processedLines.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-label="Chargement"
        />
        <p className="text-sm text-muted-foreground">
          Chargement des échéances...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    // Cas fonctionnel : aucun échéancier actif pour ce contrat → même design que l’état vide
    if (
      error instanceof Error &&
      error.message.includes("No active billing schedule found for this contract")
    ) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          Aucune échéance générée pour ce contrat
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-6 text-sm">
        <p className="font-medium text-destructive">
          Erreur lors du chargement des échéances
        </p>
        <p className="text-destructive/80">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => window.location.reload()}
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Empty / filtered-empty states
  if (!hasLines) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune échéance générée pour ce contrat
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Select
            value={statusFilter}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              <SelectItem value="A_FACTURER">À facturer</SelectItem>
              <SelectItem value="FACTUREE">Facturée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Aucune échéance ne correspond aux filtres
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & page size */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Filtrer:</span>
          <Select
            value={statusFilter}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              <SelectItem value="A_FACTURER">À facturer</SelectItem>
              <SelectItem value="FACTUREE">Facturée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive overflow-x-auto rounded-md border">
        <Table className="w-full table table-striped table-hover">
          <TableHeader className="table-light">
            <TableRow>
              <TableHead className="w-12 text-xs sm:text-sm">#</TableHead>
              <TableHead
                className="cursor-pointer text-xs sm:text-sm hover:bg-muted/50"
                onClick={() => cycleSort("dueDate")}
              >
                <div className="flex items-center gap-1">
                  <span>Échéance</span>
                  {renderSortIcon("dueDate")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-xs sm:text-sm hover:bg-muted/50"
                onClick={() => cycleSort("amountHt")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Montant HT</span>
                  {renderSortIcon("amountHt")}
                </div>
              </TableHead>
              <TableHead className="text-xs sm:text-sm">Statut</TableHead>
              <TableHead className="text-xs sm:text-sm">
                Réf. facture
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLines.map((line, index) => (
              <TableRow key={line.id}>
                <TableCell>{startIndex + index + 1}</TableCell>
                <TableCell>
                  {dateFormatter.format(new Date(line.dueDate))}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {currencyFormatter.format(parseFloat(line.amountHt || "0"))}
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
          <tfoot className="table-light">
            <TableRow className="font-semibold border-t">
              <TableCell colSpan={2} className="text-right">
                Total:
              </TableCell>
              <TableCell className="text-right">
                {currencyFormatter.format(totalAmount)}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </tfoot>
        </Table>
      </div>

      {/* Pagination summary & controls */}
      <div className="flex items-center justify-end gap-4 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Lignes par page</span>
          <Select
            value={String(pagination.itemsPerPage)}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          {startIndex + 1}–{Math.min(endIndex, totalItems)} sur {totalItems}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                currentPage: Math.max(1, currentPage - 1),
              }))
            }
            disabled={currentPage === 1}
            aria-label="Page précédente"
          >
            {"<"}
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                currentPage: Math.min(totalPages, currentPage + 1),
              }))
            }
            disabled={currentPage === totalPages}
            aria-label="Page suivante"
          >
            {">"}
          </button>
        </div>
      </div>
    </div>
  );
}
