// client/src/modules/contracts/components/modals/ContractDetailsSheet.tsx

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  FileText,
  Clock,
  TrendingUp,
  Euro,
  Folder,
  History,
  Download,
  Edit,
  XCircle,
  CheckCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

type ContractDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
  onEdit?: (contract: any) => void;
  onTerminate?: (contract: any) => void;
  onSubmitForValidation?: (contract: any) => Promise<void> | void;
  onDownloadPdf?: (contract: any) => void;
};

/* ------------------------------------------------------------------ */
/* UTILS */
/* ------------------------------------------------------------------ */

function orDash(value: any): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDate(value: any): string {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
}

function formatMoney(amount: any, currency?: string | null) {
  if (amount === null || amount === undefined || amount === "") return "-";
  const num = Number(amount);
  if (Number.isNaN(num)) return "-";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toLocaleString("fr-FR")} ${currency || ""}`;
  }
}

function computeDurationLabel(start: any, end: any): string {
  if (!start || !end) return "-";
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "-";

  const totalMonths =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (totalMonths <= 0) return "-";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) return `${totalMonths} mois`;
  if (months === 0) return `${years} an${years > 1 ? "s" : ""}`;
  return `${years} an${years > 1 ? "s" : ""} ${months} mois`;
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-700">
        -
      </Badge>
    );
  }

  const s = status.toLowerCase();

  if (s.includes("actif"))
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Actif
      </Badge>
    );

  if (s.includes("valider") || s.includes("pending"))
    return (
      <Badge className="bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        À valider
      </Badge>
    );

  if (s.includes("brouillon") || s.includes("draft"))
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200">
        Brouillon
      </Badge>
    );

  if (s.includes("résili"))
    return (
      <Badge className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Résilié
      </Badge>
    );

  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-700">
      {status}
    </Badge>
  );
}

function InfoSummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-sm text-slate-900">{value}</p>
        </div>
        <div className="rounded-full bg-slate-50 p-2">{icon}</div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* COMPONENT                                                          */
/* ------------------------------------------------------------------ */

export default function ContractDetailsSheet({
  open,
  onOpenChange,
  contract,
  onEdit,
  onTerminate,
  onSubmitForValidation,
  onDownloadPdf,
}: ContractDetailsSheetProps) {
  const c = contract || {};

  const contractNumber =
    c.number || c.contractNumber || c.contract_number || c.code;
  const title = c.title || c.name || "Contrat";
  const clientName =
    c.clientName ||
    c.client_name ||
    c.clientDisplayName ||
    c.client_display_name;
  const bu = c.businessUnit || c.business_unit || c.entity;
  const currency = c.currency || c.devise || "EUR";
  const amount = c.amount || c.totalAmount || c.total_amount;

  const startRaw =
    c.startDate || c.start_date || c.effectiveDate || c.effective_date;
  const endRaw =
    c.endDate || c.end_date || c.expiryDate || c.expiry_date || c.terminationDate;

  const startDate = formatDate(startRaw);
  const endDate = formatDate(endRaw);
  const durationLabel = computeDurationLabel(startRaw, endRaw);

  const status = c.status || c.state || c.contractStatus || c.contract_status;
  const indexationLabel =
    c.indexationFormulaLabel ||
    c.indexation_formula_label ||
    c.indexationFormula ||
    c.indexation_formula;

  const billingLines: any[] = c.billingLines || c.billing_lines || [];
  const documents: any[] = c.documents || c.files || [];
  const historyEvents: any[] =
    c.historyEvents || c.history_events || c.auditTrail || [];

  // Afficher "Soumettre en validation" seulement si statut = brouillon / à valider
  const needsValidation = useMemo(() => {
    const s = (status || "").toLowerCase();
    return (
      s.includes("brouillon") ||
      s.includes("draft") ||
      s.includes("à valider") ||
      s.includes("a valider") ||
      s.includes("pending")
    );
  }, [status]);

  const handlePdf = () => {
    if (!c) return;
    onDownloadPdf?.(c);
  };

  const handleEdit = () => {
    if (!c) return;
    onEdit?.(c);
  };

  const handleTerminate = () => {
    if (!c) return;
    onTerminate?.(c);
  };

  const handleSubmitValidation = async () => {
    if (!c || !onSubmitForValidation) return;
    await onSubmitForValidation(c);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-xl flex-col p-0
          data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full
          data-[state=open]:opacity-100 data-[state=closed]:opacity-0
          transition-transform transition-opacity duration-300 ease-out"
      >
        {/* HEADER QUICK VIEW COMPACT */}
        <SheetHeader className="border-b bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <SheetTitle className="text-sm font-semibold text-slate-900">
                {orDash(title)}
              </SheetTitle>
              <SheetDescription className="text-[11px] text-slate-500">
                {contractNumber && (
                  <>
                    <span className="font-medium text-slate-700">
                      {contractNumber}
                    </span>
                  </>
                )}
                {clientName && (
                  <>
                    {" · "}Client : {clientName}
                  </>
                )}
              </SheetDescription>
              <div className="flex flex-wrap gap-1 pt-1 items-center">
                <StatusBadge status={status} />
                {bu && (
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-700"
                  >
                    BU : {bu}
                  </Badge>
                )}
                {indexationLabel && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 bg-blue-50 text-blue-800 border-blue-200"
                  >
                    <TrendingUp className="h-3 w-3" />
                    Indexation : {indexationLabel}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  className="gap-1 px-2"
                  onClick={handlePdf}
                >
                  <Download className="h-3 w-3" />
                  PDF
                </Button>
                {/* Export "données" éventuel plus tard */}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="xs"
                  className="gap-1 px-2"
                  onClick={handleEdit}
                >
                  <Edit className="h-3 w-3" />
                  Modifier
                </Button>
                {needsValidation && onSubmitForValidation && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="gap-1 px-2 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    onClick={handleSubmitValidation}
                  >
                    <CheckCircle className="h-3 w-3" />
                    Soumettre
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 px-2"
                  onClick={handleTerminate}
                >
                  <XCircle className="h-3 w-3" />
                  Résilier
                </Button>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* CONTENU QUICK VIEW */}
        <div className="flex flex-1 flex-col">
          <Tabs defaultValue="infos" className="flex h-full flex-1 flex-col">
            <div className="border-b bg-slate-50 px-3 pt-2">
              <TabsList className="mb-2 h-8 gap-1 rounded-xl bg-slate-100 p-1">
                <TabsTrigger
                  value="infos"
                  className="rounded-lg px-3 text-[11px] font-medium"
                >
                  Infos
                </TabsTrigger>
                <TabsTrigger
                  value="indexation"
                  className="rounded-lg px-3 text-[11px] font-medium"
                >
                  Indexation
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="rounded-lg px-3 text-[11px] font-medium"
                >
                  Facturation
                </TabsTrigger>
                <TabsTrigger
                  value="ged"
                  className="rounded-lg px-3 text-[11px] font-medium"
                >
                  GED
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-lg px-3 text-[11px] font-medium"
                >
                  Historique
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-4 px-3 pb-4 pt-3">
                {/* INFOS */}
                <TabsContent value="infos" className="m-0 space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <InfoSummaryCard
                      label="Montant contrat"
                      value={formatMoney(amount, currency)}
                      icon={<Euro className="h-4 w-4 text-slate-500" />}
                    />
                    <InfoSummaryCard
                      label="Période"
                      value={
                        <>
                          {startDate}{" "}
                          <span className="text-slate-400">→</span>{" "}
                          {endDate}
                        </>
                      }
                      icon={<Clock className="h-4 w-4 text-slate-500" />}
                    />
                    <InfoSummaryCard
                      label="Durée estimée"
                      value={durationLabel}
                      icon={<Clock className="h-4 w-4 text-slate-500" />}
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">
                      Détails du contrat
                    </h3>
                    <Separator className="mb-2" />
                    <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
                      <DetailItem
                        label="N° contrat"
                        value={orDash(contractNumber)}
                      />
                      <DetailItem
                        label="Client"
                        value={orDash(clientName)}
                      />
                      <DetailItem label="BU / Entité" value={orDash(bu)} />
                      <DetailItem
                        label="Statut"
                        value={<StatusBadge status={status} />}
                      />
                      <DetailItem label="Date début" value={startDate} />
                      <DetailItem label="Date fin" value={endDate} />
                      <DetailItem
                        label="Montant initial"
                        value={formatMoney(amount, currency)}
                      />
                      <DetailItem
                        label="Devise"
                        value={orDash(currency)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* INDEXATION */}
                <TabsContent value="indexation" className="m-0 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Paramètres d&apos;indexation
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Vue simple pour la PME.
                        </p>
                      </div>
                      <div className="rounded-full bg-blue-50 p-2">
                        <TrendingUp className="h-4 w-4 text-blue-700" />
                      </div>
                    </div>
                    <Separator className="mb-2" />
                    <div className="grid md:grid-cols-2 gap-3">
                      <DetailItem
                        label="Formule d&apos;indexation"
                        value={orDash(indexationLabel)}
                      />
                      <DetailItem
                        label="Fréquence de révision"
                        value={orDash(
                          c.indexationFrequency ||
                            c.indexation_frequency ||
                            c.revisionFrequency ||
                            c.revision_frequency
                        )}
                      />
                      <DetailItem
                        label="Indice de référence"
                        value={orDash(
                          c.indexReference ||
                            c.index_reference ||
                            c.indexCode ||
                            c.index_code
                        )}
                      />
                      <DetailItem
                        label="Dernière indexation"
                        value={formatDate(
                          c.lastIndexationDate || c.last_indexation_date
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* FACTURATION */}
                <TabsContent value="billing" className="m-0 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Échéancier de facturation
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Lignes de facturation associées.
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-50 p-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <Separator className="mb-2" />

                    {!billingLines.length ? (
                      <p className="text-[11px] text-slate-500">
                        Aucun échéancier pour ce contrat.
                      </p>
                    ) : (
                      <div className="rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Libellé</TableHead>
                              <TableHead className="text-right">
                                Montant
                              </TableHead>
                              <TableHead>Statut</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {billingLines.map((line, idx) => (
                              <TableRow key={line.id ?? idx}>
                                <TableCell>
                                  {formatDate(
                                    line.dueDate ||
                                      line.due_date ||
                                      line.billingDate ||
                                      line.billing_date
                                  )}
                                </TableCell>
                                <TableCell>
                                  {orDash(
                                    line.label ||
                                      line.description ||
                                      line.reference
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMoney(line.amount, currency)}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge
                                    status={
                                      line.status ||
                                      line.state ||
                                      line.billingStatus ||
                                      line.billing_status
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* GED */}
                <TabsContent value="ged" className="m-0 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Documents associés
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Contrat signé, avenants, pièces jointes.
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-50 p-2">
                        <Folder className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <Separator className="mb-2" />

                    {!documents.length ? (
                      <p className="text-[11px] text-slate-500">
                        Aucun document rattaché pour le moment.
                      </p>
                    ) : (
                      <div className="rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {documents.map((doc, idx) => (
                              <TableRow key={doc.id ?? idx}>
                                <TableCell>
                                  {orDash(
                                    doc.name ||
                                      doc.fileName ||
                                      doc.filename ||
                                      doc.title
                                  )}
                                </TableCell>
                                <TableCell>{orDash(doc.type)}</TableCell>
                                <TableCell>
                                  {formatDate(
                                    doc.uploadedAt ||
                                      doc.uploaded_at ||
                                      doc.createdAt ||
                                      doc.created_at
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* HISTORIQUE */}
                <TabsContent value="history" className="m-0 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Historique des actions
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Journal des principaux événements.
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-50 p-2">
                        <History className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <Separator className="mb-2" />

                    {!historyEvents.length ? (
                      <p className="text-[11px] text-slate-500">
                        Aucun événement enregistré pour le moment.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {historyEvents.map((evt, idx) => (
                          <li
                            key={evt.id ?? idx}
                            className="flex items-start gap-2 text-[11px]"
                          >
                            <div className="mt-0.5">
                              <History className="h-3 w-3 text-slate-500" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-slate-500">
                                {formatDate(
                                  evt.date ||
                                    evt.createdAt ||
                                    evt.created_at
                                )}
                              </div>
                              <div className="font-medium text-slate-800">
                                {orDash(evt.action || evt.eventType)}
                              </div>
                              <div className="text-slate-600">
                                {orDash(
                                  evt.detail ||
                                    evt.description ||
                                    evt.comment
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
