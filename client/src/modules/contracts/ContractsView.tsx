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

/** Types très souples pour ne pas casser le build si la forme du contrat évolue */
type ContractDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
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

function StatusBadge({ status }: { status?: string }) {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-700">
        -
      </Badge>
    );
  }

  const normalized = status.toLowerCase();

  if (normalized.includes("actif")) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        Actif
      </Badge>
    );
  }

  if (normalized.includes("valider") || normalized.includes("pending")) {
    return (
      <Badge className="bg-amber-50 text-amber-800 border-amber-200">
        <Clock className="mr-1 h-3 w-3" />
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
        <XCircle className="mr-1 h-3 w-3" />
        Résilié
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-slate-100 text-slate-700">
      {status}
    </Badge>
  );
}

export default function ContractDetailsSheet({
  open,
  onOpenChange,
  contract,
}: ContractDetailsSheetProps) {
  const c = contract || {};

  const contractNumber =
    c.number || c.contractNumber || c.contract_number || c.code;
  const title =
    c.title || c.name || c.contractTitle || c.contract_title || "Contrat";

  const clientName =
    c.clientName ||
    c.client_name ||
    c.clientDisplayName ||
    c.client_display_name ||
    c.customerName ||
    c.customer_name;

  const bu =
    c.businessUnit ||
    c.business_unit ||
    c.bu ||
    c.entity ||
    c.entity_name ||
    c.buLabel;

  const currency = c.currency || c.devise || c.currency_code || "EUR";

  const amount =
    c.amount ||
    c.totalAmount ||
    c.total_amount ||
    c.initialAmount ||
    c.initial_amount;

  const status = c.status || c.state || c.contractStatus || c.contract_status;

  const startDate =
    c.startDate || c.start_date || c.effectiveDate || c.effective_date;
  const endDate =
    c.endDate || c.end_date || c.expiryDate || c.expiry_date || c.terminationDate;

  const indexationLabel =
    c.indexationFormulaLabel ||
    c.indexation_formula_label ||
    c.indexationFormula ||
    c.indexation_formula ||
    c.indexationName ||
    c.indexation_name;

  const durationLabel = useMemo(() => {
    if (!startDate || !endDate) return "-";
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "-";

      const years = e.getFullYear() - s.getFullYear();
      const months = e.getMonth() - s.getMonth() + years * 12;

      if (months <= 0) return "-";
      if (months < 12) return `${months} mois`;
      const y = Math.floor(months / 12);
      const m = months % 12;
      if (m === 0) return `${y} an${y > 1 ? "s" : ""}`;
      return `${y} an${y > 1 ? "s" : ""} ${m} mois`;
    } catch {
      return "-";
    }
  }, [startDate, endDate]);

  // Données secondaires (si dispo) – sinon placeholders PME-friendly
  const billingLines: any[] = c.billingLines || c.billing_lines || [];
  const documents: any[] = c.documents || c.files || [];

  const historyEvents: any[] =
    c.historyEvents || c.history_events || c.auditTrail || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full max-w-4xl flex-col p-0">
        {/* HEADER FICHE CONTRAT */}
        <SheetHeader className="border-b bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-semibold tracking-tight text-slate-900">
                {orDash(title)}
              </SheetTitle>
              <SheetDescription className="text-sm text-slate-500">
                {contractNumber && (
                  <span className="font-medium text-slate-600">
                    N° contrat : {contractNumber}
                  </span>
                )}
                {clientName && (
                  <>
                    {" · "}
                    <span className="text-slate-500">
                      Client : {clientName}
                    </span>
                  </>
                )}
              </SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge status={status} />
                {bu && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700">
                    BU / Entité : {bu}
                  </Badge>
                )}
                {indexationLabel && (
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border-blue-200"
                  >
                    <TrendingUp className="h-3 w-3" />
                    Indexation : {indexationLabel}
                  </Badge>
                )}
              </div>
            </div>

            {/* CTA principaux */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3 w-3" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-3 w-3" />
                  Exporter
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3 w-3" />
                  Modifier
                </Button>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                >
                  Avenant
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                >
                  Résilier
                </Button>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* CONTENU AVEC ONGLETS */}
        <div className="flex flex-1 flex-col">
          <Tabs defaultValue="infos" className="flex h-full flex-1 flex-col">
            <div className="border-b bg-slate-50 px-6 pt-3">
              <TabsList className="mb-2 h-9 gap-1 rounded-xl bg-slate-100 p-1">
                <TabsTrigger
                  value="infos"
                  className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                >
                  Infos
                </TabsTrigger>
                <TabsTrigger
                  value="indexation"
                  className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                >
                  Indexation
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                >
                  Facturation
                </TabsTrigger>
                <TabsTrigger
                  value="ged"
                  className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                >
                  GED
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm"
                >
                  Historique
                </TabsTrigger>
              </TabsList>
            </div>

            {/* BODY SCROLLABLE */}
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-6 px-6 pb-6 pt-4">

                {/* Onglet INFOS */}
                <TabsContent value="infos" className="m-0 space-y-6">
                  {/* Bandeau résumé financier */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Montant contrat
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {formatMoney(amount, currency)}
                          </p>
                        </div>
                        <div className="rounded-full bg-slate-50 p-2">
                          <Euro className="h-4 w-4 text-slate-500" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Période
                          </p>
                          <p className="mt-1 text-sm text-slate-900">
                            {formatDate(startDate)}{" "}
                            <span className="text-slate-400">→</span>{" "}
                            {formatDate(endDate)}
                          </p>
                        </div>
                        <div className="rounded-full bg-slate-50 p-2">
                          <Clock className="h-4 w-4 text-slate-500" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Durée estimée
                          </p>
                          <p className="mt-1 text-sm text-slate-900">
                            {durationLabel}
                          </p>
                        </div>
                        <div className="rounded-full bg-slate-50 p-2">
                          <Clock className="h-4 w-4 text-slate-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grille de détails */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">
                      Détails du contrat
                    </h3>
                    <Separator className="mb-3" />
                    <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                      <DetailItem label="N° contrat" value={orDash(contractNumber)} />
                      <DetailItem label="Client" value={orDash(clientName)} />
                      <DetailItem label="BU / Entité" value={orDash(bu)} />
                      <DetailItem label="Statut" value={<StatusBadge status={status} />} />
                      <DetailItem
                        label="Date de début"
                        value={formatDate(startDate)}
                      />
                      <DetailItem
                        label="Date de fin"
                        value={formatDate(endDate)}
                      />
                      <DetailItem label="Devise" value={orDash(currency)} />
                      <DetailItem
                        label="Montant initial"
                        value={formatMoney(amount, currency)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Onglet INDEXATION */}
                <TabsContent value="indexation" className="m-0 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Paramètres d&apos;indexation
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Vue consolidée de la formule d&apos;indexation appliquée
                          à ce contrat.
                        </p>
                      </div>
                      <div className="rounded-full bg-blue-50 p-2">
                        <TrendingUp className="h-4 w-4 text-blue-700" />
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid gap-3 md:grid-cols-2">
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
                        label="Dernière indexation appliquée"
                        value={formatDate(
                          c.lastIndexationDate || c.last_indexation_date
                        )}
                      />
                    </div>
                  </div>

                  {/* Table éventuelle des historiques d’indexation */}
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500">
                    Cette section peut être alimentée par une table dédiée aux
                    calculs d&apos;indexation (historique des révisions, indices
                    utilisés, pourcentage appliqué, nouveau montant, etc.).
                  </div>
                </TabsContent>

                {/* Onglet FACTURATION */}
                <TabsContent value="billing" className="m-0 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Échéancier de facturation
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Synthèse des lignes de facturation associées à ce
                          contrat.
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-50 p-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>

                    {billingLines && billingLines.length > 0 ? (
                      <div className="rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Libellé</TableHead>
                              <TableHead className="text-right">Montant</TableHead>
                              <TableHead>Statut</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {billingLines.map((line, idx) => (
                              <TableRow key={line.id ?? idx}>
                                <TableCell className="whitespace-nowrap">
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
                                <TableCell className="whitespace-nowrap text-right">
                                  {formatMoney(
                                    line.amount || line.total ||
                                      line.total_amount,
                                    currency
                                  )}
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
                    ) : (
                      <p className="text-xs text-slate-500">
                        Aucun échéancier n&apos;est encore associé à ce
                        contrat. Dès que les lignes de facturation seront créées
                        (module Facturation), elles apparaîtront ici.
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Onglet GED */}
                <TabsContent value="ged" className="m-0 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Documents associés
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Contrat signé, annexes, avenants, conditions
                          particulières…
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-50 p-2">
                        <Folder className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>

                    {documents && documents.length > 0 ? (
                      <div className="rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom du document</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
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
                                <TableCell>
                                  {orDash(doc.type || doc.category)}
                                </TableCell>
                                <TableCell>
                                  {formatDate(
                                    doc.uploadedAt ||
                                      doc.uploaded_at ||
                                      doc.createdAt ||
                                      doc.created_at
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Aucun document n&apos;est encore rattaché à ce contrat.
                        Utilisez le module GED pour déposer le contrat signé et
                        les annexes.
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Onglet HISTORIQUE */}
                <TabsContent value="history" className="m-0 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Historique des actions
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Journal des événements sur ce contrat : création,
                          validations, avenants, résiliations, exports, etc.
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-50 p-2">
                        <History className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>

                    {historyEvents && historyEvents.length > 0 ? (
                      <div className="rounded-lg border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Utilisateur</TableHead>
                              <TableHead>Détail</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historyEvents.map((evt, idx) => (
                              <TableRow key={evt.id ?? idx}>
                                <TableCell className="whitespace-nowrap">
                                  {formatDate(
                                    evt.date ||
                                      evt.createdAt ||
                                      evt.created_at
                                  )}
                                </TableCell>
                                <TableCell>
                                  {orDash(
                                    evt.action ||
                                      evt.eventType ||
                                      evt.event_type
                                  )}
                                </TableCell>
                                <TableCell>
                                  {orDash(
                                    evt.userName ||
                                      evt.username ||
                                      evt.user ||
                                      evt.user_email
                                  )}
                                </TableCell>
                                <TableCell className="max-w-xs text-xs text-slate-600">
                                  {orDash(
                                    evt.detail ||
                                      evt.description ||
                                      evt.comment
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        L&apos;historique sera alimenté automatiquement par le
                        moteur d&apos;audit (création, changement de statut,
                        indexations, factures générées, etc.).
                      </p>
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

/** Petit composant utilitaire pour la grille de détails */
function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}
