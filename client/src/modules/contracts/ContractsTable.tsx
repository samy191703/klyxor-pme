import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

type ContractsTableProps = {
  items: any[];
  total: number;
  pageSize: number;
  onChangePageSize: (size: number) => void;
  isLoading?: boolean;

  onView?: (contract: any) => void;
  onValidate?: (contract: any) => void;
  onSubmitForValidation?: (contract: any) => Promise<void> | void;

  onEditGeneral?: (contract: any) => void;
  onEditPeriods?: (contract: any) => void;
  onEditIndexation?: (contract: any) => void;
  onOpenGed?: (contract: any) => void;
};

function orDash(value: any): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDate(value: any): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function formatMoney(amount: any, currency?: string | null): string {
  if (amount === null || amount === undefined || amount === "") return "-";
  const num = Number(amount);
  if (Number.isNaN(num)) return String(amount);
  const cur = currency || "EUR";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toLocaleString("fr-FR")} ${cur}`;
  }
}

function StatusPill({ status }: { status?: string }) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600">
        -
      </Badge>
    );
  }

  const normalized = status.toLowerCase();

  if (normalized.includes("actif")) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
        Actif
      </Badge>
    );
  }

  if (normalized.includes("valider") || normalized.includes("pending")) {
    return (
      <Badge className="bg-amber-50 text-amber-800 border-amber-200">
        À valider
      </Badge>
    );
  }

  if (normalized.includes("brouillon") || normalized.includes("draft")) {
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200">
        Brouillon
      </Badge>
    );
  }

  if (normalized.includes("résili")) {
    return (
      <Badge className="bg-rose-50 text-rose-700 border-rose-200">
        Résilié
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-700">
      {status}
    </Badge>
  );
}

export default function ContractsTable({
  items,
  total,
  pageSize,
  onChangePageSize,
  isLoading,
  onView,
}: ContractsTableProps) {
  const hasData = (items?.length ?? 0) > 0;
  const pageSizeOptions = useMemo(() => [10, 25, 50, 100], []);
  const [, setLocation] = useLocation();

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-0">
        {/* Header liste */}
        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Contrats ({total})
            </h2>
            <p className="text-xs text-slate-500">
              Vue consolidée des contrats, avenants et résiliations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Lignes par page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onChangePageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/60 border-slate-200">
                <TableHead className="whitespace-nowrap">N° contrat</TableHead>
                <TableHead>Intitulé</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-16" />
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && !hasData && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-sm text-slate-500"
                  >
                    Aucun contrat ne correspond aux filtres sélectionnés.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                hasData &&
                items.map((c: any) => {
                  const id = c.id || c.contractId || c.contract_id;
                  const number =
                    c.number || c.contractNumber || c.contract_number;
                  const title = c.title || c.name || c.contractTitle;
                  const client =
                    c.clientName ||
                    c.client_name ||
                    c.clientDisplayName ||
                    c.client_display_name;
                  const currency = c.currency || c.devise || "EUR";
                  const amount =
                    c.amount ||
                    c.totalAmount ||
                    c.total_amount ||
                    c.initialAmount ||
                    c.initial_amount;
                  const status =
                    c.status || c.state || c.contractStatus || c.contract_status;
                  const startDate =
                    c.startDate ||
                    c.start_date ||
                    c.effectiveDate ||
                    c.effective_date;
                  const endDate =
                    c.endDate ||
                    c.end_date ||
                    c.expiryDate ||
                    c.expiry_date ||
                    c.terminationDate;

                  const handleRowClick = () => {
                    if (!id) return;
                    setLocation(`/contracts/${id}`);
                  };

                  return (
                    <TableRow
                      key={id ?? number}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={handleRowClick}
                    >
                      <TableCell className="whitespace-nowrap text-sm font-medium text-slate-900">
                        {orDash(number)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-800">
                        {orDash(title)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {orDash(client)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm font-medium text-slate-900">
                        {formatMoney(amount, currency)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {orDash(currency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <StatusPill status={status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-700">
                        {formatDate(startDate)}{" "}
                        <span className="text-slate-400">→</span>{" "}
                        {formatDate(endDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onView?.(c);
                          }}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--klyxor-bleu-nuit)] hover:underline"
                        >
                          Voir
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
