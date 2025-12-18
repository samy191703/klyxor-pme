// client/src/pages/ContractDetailPage.tsx

import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

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
  if (Number(amount) === 0) return "—";
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
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
        -
      </Badge>
    );
  }

  const normalized = String(status).toLowerCase();

  if (normalized.includes("actif") || normalized === "active") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        Actif
      </Badge>
    );
  }

  if (
    normalized.includes("valider") ||
    normalized.includes("pending") ||
    normalized.includes("pending_validation")
  ) {
    return (
      <Badge className="bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="mr-1 h-3 w-3" />
        À valider
      </Badge>
    );
  }

  if (normalized.includes("brouillon") || normalized.includes("draft")) {
    return (
      <Badge className="bg-sky-50 text-sky-700 border border-sky-200">
        Brouillon
      </Badge>
    );
  }

  if (normalized.includes("résili") || normalized.includes("terminated")) {
    return (
      <Badge className="bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="mr-1 h-3 w-3" />
        Résilié
      </Badge>
    );
  }

  if (normalized.includes("clôturé") || normalized.includes("closed")) {
    return (
      <Badge className="bg-slate-50 text-slate-700 border border-slate-200">
        Clôturé
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-sm text-slate-900 truncate">{value}</p>
        </div>
        <div className="rounded-full bg-slate-50 p-2">{icon}</div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

export default function ContractDetailPage() {
  const [match, params] = useRoute("/contracts/:id");
  const id = params?.id;

  const invalidId = !match || !id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["contract-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Impossible de charger le contrat");
      return res.json();
    },
  });

  const c: any = data || {};

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

  const currency = c.currency || c.devise || c.currency_code || "EUR";
  const amount =
    c.amount || c.totalAmount || c.total_amount || c.initialAmount || c.initial_amount;

  const status = c.status || c.state || c.contractStatus || c.contract_status;
  const normalizedStatus = String(status || "").toLowerCase();

  const isDraftStatus =
    normalizedStatus.includes("draft") || normalizedStatus.includes("brouillon");
  const isPendingStatus = ["pending", "pending_validation", "à valider", "a valider"].some((k) =>
    normalizedStatus.includes(k),
  );
  const isActiveStatus = normalizedStatus === "active" || normalizedStatus.includes("actif");
  const isTerminatedStatus = normalizedStatus.includes("terminated") || normalizedStatus.includes("résili");

  const { isAdmin, isManager, canValidate } = usePermissions();

  const canEditThisContract = isAdmin || (isManager && isDraftStatus);
  const canSubmitForValidation = (isAdmin || isManager) && isDraftStatus;
  const canValidateContract = canValidate && isPendingStatus;
  const canTerminateContract = isAdmin && isActiveStatus;
  const canCloseContract = isAdmin && isTerminatedStatus;

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

  const billingLines: any[] = c.billingLines || c.billing_lines || [];
  const documents: any[] = c.documents || c.files || [];
  const historyEvents: any[] = c.historyEvents || c.history_events || c.auditTrail || [];

  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const handleAction = async (action: string, confirmMessage?: string) => {
    if (!id) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setIsStatusUpdating(true);
    try {
      const res = await fetch(`/api/contracts/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Erreur changement statut", res.status, txt);
        window.alert(
          "Impossible de changer le statut du contrat. Détail: " +
            (txt || res.statusText),
        );
      } else {
        await refetch();
      }
    } catch (e) {
      console.error("Erreur réseau changement statut", e);
      window.alert("Erreur réseau lors du changement de statut.");
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Actions workflow
  const handleSubmitForValidation = () => handleAction("submit");
  const handleApprove = () => handleAction("approve");
  const handleReject = () =>
    handleAction("reject", "Confirmez-vous le refus de ce contrat ? Il repassera en brouillon.");
  const handleTerminate = () =>
    handleAction("terminate", "Confirmez-vous la résiliation de ce contrat ?");
  const handleClose = () =>
    handleAction("close", "Confirmez-vous la clôture définitive de ce contrat ?");

  // États
  if (invalidId) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>Identifiant de contrat invalide.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !data) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6 flex items-center gap-2 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Chargement du contrat…
        </CardContent>
      </Card>
    );
  }

  if ((error || !data) && !isLoading) {
    return (
      <Card className="border-slate-200 bg-white">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Impossible de charger ce contrat.
              </span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // UI
  return (
    <div className="w-full">
      {/* Breadcrumb + Title */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Link href="/contracts" className="hover:underline">
              Contrats
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-700 truncate">
              {orDash(contractNumber)}
            </span>
          </div>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {orDash(title)}
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Contrat {orDash(contractNumber)} • Client : {orDash(clientName)}
          </p>
        </div>

        {/* Actions (sales-ready) */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              onClick={() => window.alert("PDF (à brancher)")}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>

            {canEditThisContract && (
              <Button size="sm" className="gap-2" onClick={() => window.alert("Modifier (à brancher)")}>
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <StatusBadge status={status} />
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
              Devise : {currency}
            </Badge>
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border-blue-200"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Indexation : {indexationLabel ? String(indexationLabel) : "Non paramétrée"}
            </Badge>
          </div>

          {(canSubmitForValidation || canValidateContract || canTerminateContract || canCloseContract) && (
            <div className="flex flex-wrap justify-end gap-2">
              {canSubmitForValidation && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isStatusUpdating}
                  onClick={handleSubmitForValidation}
                  className="gap-2 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                >
                  <Clock className="h-4 w-4" />
                  Soumettre en validation
                </Button>
              )}

              {canValidateContract && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isStatusUpdating}
                    onClick={handleReject}
                    className="gap-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Refuser
                  </Button>
                  <Button
                    size="sm"
                    disabled={isStatusUpdating}
                    onClick={handleApprove}
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Valider
                  </Button>
                </>
              )}

              {canTerminateContract && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isStatusUpdating}
                  onClick={handleTerminate}
                  className="gap-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  <XCircle className="h-4 w-4" />
                  Résilier
                </Button>
              )}

              {canCloseContract && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isStatusUpdating}
                  onClick={handleClose}
                  className="gap-2 border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100"
                >
                  <CheckCircle className="h-4 w-4" />
                  Clôturer
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <InfoSummaryCard
          label="Montant contrat"
          value={formatMoney(amount, currency)}
          icon={<Euro className="h-4 w-4 text-slate-500" />}
        />
        <InfoSummaryCard
          label="Période"
          value={
            <>
              {formatDate(startDate)} <span className="text-slate-400">→</span>{" "}
              {formatDate(endDate)}
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

      {/* Tabs */}
      <Card className="mt-6 border-slate-200 bg-white">
        <CardContent className="p-0">
          <Tabs defaultValue="infos" className="flex flex-col">
            <div className="border-b bg-slate-50 px-4 pt-3">
              <TabsList className="mb-2 h-9 gap-1 rounded-xl bg-slate-100 p-1">
                <TabsTrigger value="infos" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  Infos
                </TabsTrigger>
                <TabsTrigger value="indexation" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  Indexation
                </TabsTrigger>
                <TabsTrigger value="billing" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  Facturation
                </TabsTrigger>
                <TabsTrigger value="ged" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  GED
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg px-3 text-xs font-medium md:px-4 md:text-sm">
                  Historique
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 space-y-6">
              {/* INFOS */}
              <TabsContent value="infos" className="m-0 space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Détails du contrat
                  </h3>
                  <Separator className="mb-3" />
                  <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                    <DetailItem label="N° contrat" value={orDash(contractNumber)} />
                    <DetailItem label="Client" value={orDash(clientName)} />
                    <DetailItem label="Statut" value={<StatusBadge status={status} />} />
                    <DetailItem label="Date de début" value={formatDate(startDate)} />
                    <DetailItem label="Date de fin" value={formatDate(endDate)} />
                    <DetailItem label="Devise" value={orDash(currency)} />
                    <DetailItem label="Montant" value={formatMoney(amount, currency)} />
                  </div>
                </div>
              </TabsContent>

              {/* INDEXATION */}
              <TabsContent value="indexation" className="m-0 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Paramètres d&apos;indexation
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Formule et paramètres appliqués à ce contrat.
                      </p>
                    </div>
                    <div className="rounded-full bg-blue-50 p-2">
                      <TrendingUp className="h-4 w-4 text-blue-700" />
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailItem label="Formule" value={orDash(indexationLabel)} />
                    <DetailItem
                      label="Fréquence"
                      value={orDash(
                        c.indexationFrequency ||
                          c.indexation_frequency ||
                          c.revisionFrequency ||
                          c.revision_frequency,
                      )}
                    />
                    <DetailItem
                      label="Indice de référence"
                      value={orDash(
                        c.indexReference ||
                          c.index_reference ||
                          c.indexCode ||
                          c.index_code,
                      )}
                    />
                    <DetailItem
                      label="Dernière indexation"
                      value={formatDate(c.lastIndexationDate || c.last_indexation_date)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* FACTURATION */}
              <TabsContent value="billing" className="m-0 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Échéancier de facturation
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Synthèse des lignes de facturation associées à ce contrat.
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-50 p-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>

                  {billingLines.length > 0 ? (
                    <div className="rounded-lg border border-slate-200">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Libellé</TableHead>
                            <TableHead className="text-right">Montant</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billingLines.map((line, idx) => (
                            <TableRow key={line.id ?? idx} className="border-slate-100">
                              <TableCell className="whitespace-nowrap">
                                {formatDate(
                                  line.dueDate ||
                                    line.due_date ||
                                    line.billingDate ||
                                    line.billing_date,
                                )}
                              </TableCell>
                              <TableCell>
                                {orDash(line.label || line.description || line.reference)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right">
                                {formatMoney(line.amount || line.total || line.total_amount, currency)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={line.status || line.state || line.billingStatus || line.billing_status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Aucun échéancier n&apos;est encore associé à ce contrat.
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* GED */}
              <TabsContent value="ged" className="m-0 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Documents associés
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Contrat signé, annexes, avenants, conditions particulières…
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-50 p-2">
                      <Folder className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>

                  {documents.length > 0 ? (
                    <div className="rounded-lg border border-slate-200">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Nom du document</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map((doc, idx) => (
                            <TableRow key={doc.id ?? idx} className="border-slate-100">
                              <TableCell>
                                {orDash(doc.name || doc.fileName || doc.filename || doc.title)}
                              </TableCell>
                              <TableCell>{orDash(doc.type || doc.category)}</TableCell>
                              <TableCell>
                                {formatDate(doc.uploadedAt || doc.uploaded_at || doc.createdAt || doc.created_at)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.alert("Téléchargement (à brancher)")}
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
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* HISTORIQUE */}
              <TabsContent value="history" className="m-0 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Historique des actions
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Journal des événements sur ce contrat.
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-50 p-2">
                      <History className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>

                  {historyEvents.length > 0 ? (
                    <div className="rounded-lg border border-slate-200">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Utilisateur</TableHead>
                            <TableHead>Détail</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyEvents.map((evt, idx) => (
                            <TableRow key={evt.id ?? idx} className="border-slate-100">
                              <TableCell className="whitespace-nowrap">
                                {formatDate(evt.date || evt.createdAt || evt.created_at)}
                              </TableCell>
                              <TableCell>{orDash(evt.action || evt.eventType || evt.event_type)}</TableCell>
                              <TableCell>{orDash(evt.userName || evt.username || evt.user || evt.user_email)}</TableCell>
                              <TableCell className="max-w-xs text-xs text-slate-600">
                                {orDash(evt.detail || evt.description || evt.comment)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      L&apos;historique sera alimenté automatiquement (création, validations, indexations, factures, etc.).
                    </p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
