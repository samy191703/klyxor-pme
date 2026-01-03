// src/modules/contracts/components/ContractsTable.tsx
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  CheckCircle2,
  MoreHorizontal,
  FileStack,
  Settings2,
  CalendarRange,
  GaugeCircle,
  Send,
} from "lucide-react";

// Pills
import { StatusPill } from "@/components/pills/contract-status-pill";
import { FormulaTypePill } from "@/components/pills/indexation-formula-type-pill";

// Schema type (Drizzle-inferrred)
import type { Contract } from "@shared/schema";
import {
  BILLING_PERIOD_LABELS,
  BillingPeriods,
  BUSINESS_UNIT_LABELS,
  BusinessUnits,
  CONTRACT_TYPE_LABELS,
  ContractTypes,
  Languages,
  PAYMENT_TYPE_LABELS,
  PaymentTypes,
  Technologies,
  TECHNOLOGY_LABELS,
} from "@shared/enums/contracts";
// ───────────────────────────── helpers ─────────────────────────────
function fmtAmount(
  amount: number | string | null | undefined,
  currency: string | null | undefined = "EUR"
) {
  const v =
    amount === null || amount === undefined || amount === ""
      ? 0
      : typeof amount === "string"
      ? Number(amount)
      : amount;
  const cur = currency ?? "EUR";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: cur,
  }).format(isFinite(v as number) ? (v as number) : 0);
}

function toNumberOrNull(n: string | number | null | undefined): number | null {
  if (n === null || n === undefined || n === "") return null;
  if (typeof n === "number") return isFinite(n) ? n : null;
  const parsed = Number(n);
  return isFinite(parsed) ? parsed : null;
}

function fmtNum(n: string | number | null | undefined) {
  const v = toNumberOrNull(n);
  if (v === null) return "—";
  return new Intl.NumberFormat("fr-FR").format(v);
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? String(d) : date.toLocaleDateString("fr-FR");
}

function yesNo(v?: boolean | null) {
  return v ? "Oui" : "Non";
}

function short(v?: string | null, n = 8) {
  if (!v) return "—";
  return v.length > n ? v.slice(0, n) + "…" : v;
}

function seriesSummary(series: any): string {
  if (!series) return "—";
  if (series.mode === "FIXED") return `FIXED ${fmtNum(series.fixed)}`;
  if (series.mode === "VARIABLE")
    return `VAR ${Array.isArray(series.items) ? series.items.length : 0} pts`;
  return typeof series === "object" ? "Obj" : String(series);
}

function indicesSeriesSummary(s: Record<string, any> | undefined | null) {
  if (!s) return "—";
  const keys = Object.keys(s);
  if (!keys.length) return "—";
  const parts = keys.slice(0, 3).map((k) => {
    const it = (s as any)[k];
    if (it?.mode === "FIXED") return `${k}: FIXED ${fmtNum(it.fixed)}`;
    if (it?.mode === "VARIABLE")
      return `${k}: VAR ${Array.isArray(it.items) ? it.items.length : 0}`;
    return k;
  });
  return `${parts.join(", ")}${keys.length > 3 ? ` +${keys.length - 3}` : ""}`;
}

function indicesValuesSummary(v: Record<string, number> | undefined | null) {
  if (!v) return "—";
  const keys = Object.keys(v);
  if (!keys.length) return "—";
  const parts = keys.slice(0, 3).map((k) => `${k}:${fmtNum((v as any)[k])}`);
  return `${parts.join(", ")}${keys.length > 3 ? ` +${keys.length - 3}` : ""}`;
}

// ───────────────────────────── component ─────────────────────────────
type RowAction = (c: Contract) => void;

export default function ContractsTable({
  items,
  onView,
  onValidate,
  onSubmitForValidation,
  total,
  pageSize,
  onChangePageSize,
  isLoading,
  // optional edit shortcuts
  onEditGeneral,
  onEditPeriods,
  onEditIndexation,
  onOpenGed,
}: {
  items: Contract[];
  onView: RowAction;
  onValidate: RowAction;
  onSubmitForValidation?: RowAction;
  total: number;
  pageSize: number;
  onChangePageSize: (n: number) => void;
  isLoading?: boolean;
  onEditGeneral?: RowAction;
  onEditPeriods?: RowAction;
  onEditIndexation?: RowAction;
  onOpenGed?: RowAction;
}) {
  const LANGUAGE_LABELS: Record<Languages, string> = {
    FR: "Français",
    EN: "Anglais",
  };

  function labelOf<T extends string>(
    map: Record<T, string>,
    value?: string | null
  ) {
    if (!value) return "—";
    return (map as any)[value as T] ?? value; // fallback to raw if unknown
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">Chargement…</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Core identifiers */}
              <TableHead>N°</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Langue</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Technologie</TableHead>
              <TableHead>Mainteneur</TableHead>
              <TableHead>BU</TableHead>

              {/* Money */}
              <TableHead>Montant</TableHead>
              <TableHead>Devise</TableHead>

              {/* Billing */}
              {/*  <TableHead>Période de fact.</TableHead> */}
              <TableHead>Fréquence fact.</TableHead>
              <TableHead>Type de paiement</TableHead>

              {/* Domain extras (strings in DB, shown as numbers if parseable) */}
              <TableHead>Prod. annuelle max</TableHead>
              <TableHead># Turbines</TableHead>
              <TableHead>Prix / MWh</TableHead>

              {/* Dates */}
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>

              {/* Indexation overview */}
              <TableHead>Indexation</TableHead>
              <TableHead>Fréq. indexation</TableHead>
              <TableHead>Date base</TableHead>
              <TableHead>Prochaine index.</TableHead>
              <TableHead>Formule</TableHead>
              <TableHead>Cap</TableHead>
              <TableHead>Seuil</TableHead>
              <TableHead>Mode calc.</TableHead>
              <TableHead>Règle prise indice</TableHead>
              <TableHead>Date prise indice</TableHead>
              <TableHead>Revised req.</TableHead>
              <TableHead>Base (montant)</TableHead>
              <TableHead>Montant courant</TableHead>

              {/* Series / Indices compact */}
              {/*  <TableHead>Série base montant</TableHead>
              <TableHead>Série indices</TableHead> */}
              <TableHead>Valeurs indices</TableHead>

              {/* Misc */}
              <TableHead>Parc</TableHead>
              <TableHead>Niveaux tarifaires</TableHead>
              <TableHead>Dernier chgt palier</TableHead>
              <TableHead>Année chgt palier</TableHead>
              <TableHead>Taux TVA</TableHead>

              {/* Audit */}
              <TableHead>Créé par</TableHead>
              <TableHead>Validé par</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead>Maj le</TableHead>

              {/* Status & actions */}
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                {/* Core identifiers */}
                <TableCell className="max-w-[220px] truncate">{c.number}</TableCell>
                <TableCell className="max-w-[240px] truncate">
                  {c.title}
                </TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {c.clientName}
                </TableCell>
                {/* Language → label */}
                <TableCell>
                  {labelOf(LANGUAGE_LABELS, c.language as Languages)}
                </TableCell>
                {/* Type → label */}
                <TableCell>
                  {labelOf(CONTRACT_TYPE_LABELS, c.type as ContractTypes)}
                </TableCell>
                {/* Technology → label (nullable) */}
                <TableCell>
                  {c.technology
                    ? labelOf(TECHNOLOGY_LABELS, c.technology as Technologies)
                    : "—"}
                </TableCell>

                {/* Maintainer stays as-is (free text) */}
                <TableCell>{c.maintainer ?? "—"}</TableCell>
                {/* BU → label */}
                <TableCell className="max-w-[220px] truncate">
                  {labelOf(
                    BUSINESS_UNIT_LABELS,
                    c.businessUnit as BusinessUnits
                  )}
                </TableCell>

                {/* Money */}
                <TableCell>{fmtAmount(c.amount, c.currency)}</TableCell>
                <TableCell>{c.currency}</TableCell>

                {/* Billing frequency*/}

                {/*   <TableCell>
                  {labelOf(
                    BILLING_PERIOD_LABELS,
                    c.billingPeriod as BillingPeriods
                  )}
                </TableCell> */}
                <TableCell>
                  {labelOf(
                    BILLING_PERIOD_LABELS,
                    c.billingFrequency as BillingPeriods
                  )}
                </TableCell>
                {/* Payment type → label */}
                <TableCell>
                  {labelOf(PAYMENT_TYPE_LABELS, c.paymentType as PaymentTypes)}
                </TableCell>

                {/* Domain extras (text in DB) */}
                <TableCell>{fmtNum(c.maxAnnualProduction)}</TableCell>
                <TableCell>{fmtNum(c.numberOfTurbines)}</TableCell>
                <TableCell>{fmtNum(c.pricePerMWh)}</TableCell>

                {/* Dates */}
                <TableCell>{fmtDate(c.startDate as any)}</TableCell>
                <TableCell>{fmtDate(c.endDate as any)}</TableCell>

                {/* Indexation overview */}
                <TableCell>{yesNo(c.indexationEnabled)}</TableCell>
                <TableCell>{c.indexationFrequency ?? "—"}</TableCell>
                <TableCell>{fmtDate(c.indexationDate as any)}</TableCell>
                <TableCell>{fmtDate(c.nextIndexationDate as any)}</TableCell>

                {/* Formula pill */}
                <TableCell>
                  {c.indexationEnabled && c.indexationFormula ? (
                    <FormulaTypePill type={c.indexationFormula} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell>{fmtNum(c.indexationCap as any)}</TableCell>
                <TableCell>{fmtNum(c.indexationThreshold as any)}</TableCell>
                <TableCell>{c.calculationMode ?? "—"}</TableCell>
                <TableCell>{c.indexTakingDateRule ?? "—"}</TableCell>
                <TableCell>{fmtDate(c.indexTakingDate as any)}</TableCell>
                <TableCell>{c.requireRevised ?? "—"}</TableCell>
                <TableCell>
                  {fmtAmount(c.indexationBaseAmount ?? 0, c.currency)}
                </TableCell>
                <TableCell>
                  {fmtAmount(c.indexationCurrentAmount ?? 0, c.currency)}
                </TableCell>

                {/* Series / Indices compact */}
                {/* <TableCell
                  title={JSON.stringify(
                    c.indexationBaseAmountSeries ?? undefined
                  )}
                >
                  {seriesSummary(c.indexationBaseAmountSeries as any)}
                </TableCell>
                <TableCell
                  title={JSON.stringify(
                    c.indexationBaseIndicesSeries ?? undefined
                  )}
                >
                  {indicesSeriesSummary(c.indexationBaseIndicesSeries as any)}
                </TableCell> */}
                <TableCell
                  title={JSON.stringify(
                    c.indexationBaseIndicesValues ?? undefined
                  )}
                >
                  {indicesValuesSummary(c.indexationBaseIndicesValues as any)}
                </TableCell>

                {/* Misc */}
                <TableCell>{c.parkCode ?? "—"}</TableCell>
                <TableCell>
                  {c.tariffTiers
                    ? typeof c.tariffTiers === "object"
                      ? "Obj"
                      : String(c.tariffTiers)
                    : "—"}
                </TableCell>
                <TableCell>{fmtDate(c.lastTierChangeDate as any)}</TableCell>
                <TableCell>{fmtNum(c.lastTierChangeYear as any)}</TableCell>

                <TableCell>{(Number(c.tvaRate) * 100).toFixed(0)}%</TableCell>  
                {/* Audit */}
                <TableCell title={c.createdBy ?? undefined}>
                  {short(c.createdBy)}
                </TableCell>
                <TableCell title={c.validatedBy ?? undefined}>
                  {short(c.validatedBy)}
                </TableCell>
                <TableCell>{fmtDate(c.createdAt as any)}</TableCell>
                <TableCell>{fmtDate(c.updatedAt as any)}</TableCell>

                {/* Status */}
                <TableCell>
                  <StatusPill status={c.status} />
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ouvrir le menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>

                      <DropdownMenuItem onClick={() => onView(c)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>Voir le contrat</span>
                      </DropdownMenuItem>

                      {onEditGeneral && (
                        <DropdownMenuItem onClick={() => onEditGeneral(c)}>
                          <Settings2 className="mr-2 h-4 w-4" />
                          <span>Mettre à jour les infos</span>
                        </DropdownMenuItem>
                      )}
                      {onEditPeriods && (
                        <DropdownMenuItem onClick={() => onEditPeriods(c)}>
                          <CalendarRange className="mr-2 h-4 w-4" />
                          <span>Modifier périodes & tarifs</span>
                        </DropdownMenuItem>
                      )}
                      {onEditIndexation && (
                        <DropdownMenuItem onClick={() => onEditIndexation(c)}>
                          <GaugeCircle className="mr-2 h-4 w-4" />
                          <span>Modifier l’indexation</span>
                        </DropdownMenuItem>
                      )}
                      {onOpenGed && (
                        <DropdownMenuItem onClick={() => onOpenGed(c)}>
                          <FileStack className="mr-2 h-4 w-4" />
                          <span>Accéder au GED</span>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {c.status === "draft" && onSubmitForValidation && (
                        <DropdownMenuItem
                          className="text-blue-600 focus:text-blue-700"
                          onClick={() => onSubmitForValidation(c)}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          <span>Soumettre pour validation</span>
                        </DropdownMenuItem>
                      )}

                      {c.status === "pending_validation" && (
                        <DropdownMenuItem
                          className="text-green-600 focus:text-green-700"
                          onClick={() => onValidate(c)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          <span>Valider</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
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
            <SelectTrigger className="h-8 w-[84px]">
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
