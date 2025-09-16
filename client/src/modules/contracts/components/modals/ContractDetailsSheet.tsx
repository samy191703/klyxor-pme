import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function fmtAmount(n: number | string, currency = "EUR") {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    v || 0
  );
}
function fmtDate(d?: string) {
  return d ? new Intl.DateTimeFormat("fr-FR").format(new Date(d)) : "—";
}

export default function ContractDetailsSheet({
  open,
  onOpenChange,
  contract,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contract: any;
}) {
  if (!contract) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[600px] lg:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {contract.number} — {contract.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <h4>Financier</h4>
            </CardHeader>
            <CardContent>
              Montant: {fmtAmount(contract.amount, contract.currency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <h4>Dates</h4>
            </CardHeader>
            <CardContent>
              Début: {fmtDate(contract.startDate)}
              <br />
              Fin: {fmtDate(contract.endDate)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <h4>Client</h4>
            </CardHeader>
            <CardContent>{contract.clientName || "—"}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <h4>Indexation</h4>
            </CardHeader>
            <CardContent>{contract.indexationFormula || "Aucune"}</CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
