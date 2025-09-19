import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getStatusVariant(status: string) {
  switch (status) {
    case "active":
      return "success";
    case "pending_validation":
      return "warning";
    case "draft":
      return "secondary";
    case "terminated":
      return "destructive";
    case "closed":
      return "outline";
    default:
      return "secondary";
  }
}
function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Actif";
    case "pending_validation":
      return "À valider";
    case "draft":
      return "Brouillon";
    case "terminated":
      return "Résilié";
    case "closed":
      return "Clôturé";
    default:
      return status;
  }
}
function fmtAmount(amount: number | string, currency = "EUR") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    n || 0
  );
}

export default function ContractsTable({
  items,
  onView,
  onValidate,
  total,
  pageSize,
  onChangePageSize,
  isLoading,
}: {
  items: any[];
  onView: (c: any) => void;
  onValidate: (c: any) => void;
  total: number;
  pageSize: number;
  onChangePageSize: (n: number) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Chargement…</div>;
  }
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>BU</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.number}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.clientName}</TableCell>
                <TableCell>{c.type}</TableCell>
                <TableCell>{c.businessUnit}</TableCell>
                <TableCell>{fmtAmount(c.amount, c.currency)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(c.status) as any}>
                    {getStatusLabel(c.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => onView(c)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {c.status === "pending_validation" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600"
                        onClick={() => onValidate(c)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-gray-600">
        <div>
          1-{Math.min(pageSize, total)} sur {total}
        </div>
        <div className="flex items-center space-x-2">
          <span>Afficher:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onChangePageSize(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
