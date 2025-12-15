// src/modules/invoices/_views/InvoiceModulePage.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

import {
  deleteInvoice,
  downloadInvoicePdf,
  updateInvoice,
  createInvoiceCreditNote,
  fetchInvoices,
  fetchInvoiceValidationRequests,
} from "../api/invoice.api";
import { INVOICE_QK, DEFAULT_INVOICE_FILTERS } from "../domain/constants";

import {
  InvoiceAction,
  type Invoice,
  type InvoiceValidationRequest,
} from "../domain/types";

import { InvoiceTable } from "../components/InvoiceTable";
import InvoiceFiltersCard from "../components/InvoiceFiltersCard";
import InvoiceKpi from "../components/InvoiceKpi";
import ViewInvoiceDialog from "../components/dialogs/ViewInvoiceDialog";
import EditInvoiceDialog from "../components/dialogs/EditInvoiceDialog";
import { ConfirmDeleteDialog } from "../components/dialogs/ConfirmDeleteDialog";

import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";
import { cn } from "@/lib/utils";

// 🔄 On étend InvoiceValidationRequest pour inclure la période de facturation
type InvoiceValidationRequestWithPeriod = InvoiceValidationRequest & {
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
};

export default function InvoiceModulePage() {
  const { canCreateContract, canModifyContract, canDeleteContract } =
    usePermissions();
  const { toast } = useToast();

  const [location] = useLocation();

  const formatDateFRNullable = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR");
  };

  // Récupérer le paramètre ln depuis l'URL (ligne à surligner)
  const highlightLn = useMemo(() => {
    if (location.includes("?")) {
      const queryString = location.split("?")[1];
      const params = new URLSearchParams(queryString);
      return params.get("ln");
    }
    return null;
  }, [location]);

  const [filters, setFilters] = useState(DEFAULT_INVOICE_FILTERS);

  const {
    data: invoicesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: INVOICE_QK.invoices.list(filters),
    queryFn: () => fetchInvoices(filters),
  });

  const {
    data: validationRequestsData,
    isLoading: isLoadingValidations,
    error: validationError, // dispo si besoin
    refetch: refetchValidationRequests,
  } = useQuery({
    queryKey: INVOICE_QK.validations.list(),
    queryFn: () => fetchInvoiceValidationRequests(),
  });

  const validationRequests: InvoiceValidationRequestWithPeriod[] =
    (validationRequestsData as InvoiceValidationRequestWithPeriod[] | undefined) ??
    [];

  const formatMoneyEUR = (value: number | string): string => {
    const n = Number(value || 0);
    return n.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });
  };

  const invoices = invoicesData?.rows ?? [];
  const totalInvoices = invoicesData?.total ?? 0;

  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  const customerOptions = useMemo(() => {
    if (!invoices) return [];
    return Array.from(
      new Set(invoices.map((inv) => inv.clientName).filter(Boolean))
    );
  }, [invoices]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  useEffect(() => {
    const handler = () => setShowCustomerList(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const [showKpis, setShowKpis] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Dialog suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // State pour les actions de validation/refus dans le bloc "Factures à valider"
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pop-up décision validation / refus
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [decisionMode, setDecisionMode] =
    useState<"validate" | "reject" | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<InvoiceValidationRequestWithPeriod | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoice(invoiceToDelete.id);
      toast({
        title: "Facture supprimée",
        description: "La facture a été supprimée avec succès",
      });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de supprimer la facture",
        variant: "destructive",
      });
    } finally {
      setInvoiceToDelete(null);
    }
  };

  const toggleExpand = () => {
    setExpanded((e) => {
      const next = !e;
      setShowKpis(!next ? true : false);
      return next;
    });
  };

  const handleRefresh = async () => {
    await refetch();
    setShowKpis(false);
    setExpanded(true);
    setFilters(DEFAULT_INVOICE_FILTERS);
    setCustomerSearch("");
  };

  const handleViewInvoice = (invoice: Invoice) => setViewingInvoiceId(invoice.id);
  const handleEditInvoice = (invoice: Invoice) => setEditingInvoiceId(invoice.id);

  const handleOpenInvoice = (invoiceId: string | null | undefined) => {
    if (!invoiceId) return;
    setViewingInvoiceId(invoiceId);
  };

  const getErrorMessage = (err: any) => {
    try {
      if (typeof err === "string") {
        const parsed = JSON.parse(err);
        if (parsed?.error) return parsed.error;
      }
      if (err?.response?.data?.error) return err.response.data.error;
      if (err?.error) return err.error;
      if (err?.message) return err.message;
    } catch {
      return String(err);
    }
    return "Une erreur est survenue";
  };

  const handleValidate = async (invoice: Invoice) => {
    try {
      await updateInvoice(invoice.id, { invoiceAction: InvoiceAction.Validate });
      toast({
        title: "Facture validée",
        description: `La facture ${invoice.invoiceNumber} a été validée.`,
      });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  const handleRevert = async (invoice: Invoice) => {
    try {
      await updateInvoice(invoice.id, {
        invoiceAction: InvoiceAction.RevertToDraft,
      });
      toast({
        title: "Facture remise en brouillon",
        description: `La facture ${invoice.invoiceNumber} a été remise en brouillon.`,
      });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  const handleCreateAvoir = async (invoice: Invoice) => {
    try {
      await createInvoiceCreditNote(
        invoice.id,
        `Avoir pour ${invoice.invoiceNumber}`,
        invoice.dueDate
      );
      toast({
        title: "Avoir créé",
        description: `L'avoir pour la facture ${invoice.invoiceNumber} a été créé.`,
      });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      setDownloadingId(invoice.id);
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
      toast({
        title: "Téléchargement",
        description: "La facture a été téléchargée avec succès",
      });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description:
          e?.message || "Impossible de télécharger la facture en PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // 🔧 Actions pour le bloc "Factures à valider"
  const handleValidateFromRequest = async (
    vr: InvoiceValidationRequestWithPeriod
  ) => {
    if (!vr.invoiceId) return;
    try {
      setActionLoadingId(vr.invoiceId);
      await updateInvoice(vr.invoiceId, {
        invoiceAction: InvoiceAction.Validate,
      });
      toast({
        title: "Facture validée",
        description: `La facture ${vr.invoiceNumber} a été validée.`,
      });
      await refetchValidationRequests();
      await refetch();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectFromRequest = async (
    vr: InvoiceValidationRequestWithPeriod,
    reason?: string
  ) => {
    if (!vr.invoiceId) return;
    try {
      setActionLoadingId(vr.invoiceId);
      const res = await fetch(`/api/invoices/${vr.invoiceId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason ?? "" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Impossible de refuser la facture");
      }

      toast({
        title: "Facture refusée",
        description: `La demande de validation pour la facture ${vr.invoiceNumber} a été refusée.`,
      });
      await refetchValidationRequests();
      await refetch();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadFromRequest = async (
    vr: InvoiceValidationRequestWithPeriod
  ) => {
    if (!vr.invoiceId) return;
    try {
      setActionLoadingId(vr.invoiceId);
      await downloadInvoicePdf(vr.invoiceId, vr.invoiceNumber);
      toast({
        title: "Téléchargement",
        description: "La facture a été téléchargée avec succès",
      });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description:
          e?.message || "Impossible de télécharger la facture en PDF",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDecisionDialog = (
    mode: "validate" | "reject",
    vr: InvoiceValidationRequestWithPeriod
  ) => {
    setDecisionMode(mode);
    setSelectedRequest(vr);
    setRejectReason("");
    setDecisionError(null);
    setDecisionDialogOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!selectedRequest || !decisionMode) return;

    if (decisionMode === "reject" && !rejectReason.trim()) {
      setDecisionError("Merci de saisir un motif de refus.");
      return;
    }

    try {
      setDecisionSubmitting(true);
      if (decisionMode === "validate") {
        await handleValidateFromRequest(selectedRequest);
      } else {
        await handleRejectFromRequest(selectedRequest, rejectReason);
      }

      setDecisionDialogOpen(false);
      setDecisionMode(null);
      setSelectedRequest(null);
      setRejectReason("");
      setDecisionError(null);
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const customerOptionsClean: string[] = customerOptions.filter(
    (c): c is string => typeof c === "string" && c.trim() !== ""
  );

  if (error)
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Erreur lors du chargement : {(error as Error).message}
      </div>
    );

  const renderHeaderActions = (theme: KlyxorThemeTokens) => {
    const { isDark } = theme;
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={toggleExpand}
          title={expanded ? "Réduire" : "Afficher les statistiques"}
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
        >
          {expanded ? (
            <EyeIcon className="w-4 h-4" />
          ) : (
            <EyeOffIcon className="w-4 h-4" />
          )}
          Statistiques
        </Button>

        <Button
          variant="outline"
          className={cn(
            "gap-2 text-xs",
            isDark
              ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
          )}
          onClick={handleRefresh}
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>
    );
  };

  return (
    <>
      <KlyxorPageLayout
        title="Gestion des factures"
        subtitle="Suivi des factures, statuts et lignes de facturation."
        actions={renderHeaderActions}
      >
        {(theme) => {
          const {
            heroCardClass,
            sectionCardClass,
            primaryText,
            secondaryText,
            mutedText,
            isDark,
          } = theme;

          return (
            <div className="space-y-4" data-testid="invoices-main">
              {/* HERO – résumé global */}
              <Card className={heroCardClass}>
                <CardContent className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <div
                      className={cn(
                        "text-xs font-medium",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      Vue globale des factures
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      {totalInvoices} facture
                      {totalInvoices > 1 ? "s" : ""} correspondant aux filtres
                      actuels.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
                    <HeroKpi
                      label="Factures filtrées"
                      value={totalInvoices}
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="Factures à valider"
                      value={validationRequests.length}
                      tone="warning"
                      isDark={isDark}
                    />
                    <HeroKpi
                      label="Clients distincts"
                      value={customerOptionsClean.length}
                      tone="muted"
                      isDark={isDark}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* KPI détaillés */}
              {showKpis && (
                <Card className={sectionCardClass}>
                  <CardContent className="p-4">
                    <InvoiceKpi />
                  </CardContent>
                </Card>
              )}

              {/* FILTRES */}
              <Card className={sectionCardClass}>
                <CardContent className="p-4">
                  <InvoiceFiltersCard
                    filters={filters}
                    setFilters={setFilters}
                    customerOptions={customerOptionsClean}
                    showCustomerList={showCustomerList}
                    setShowCustomerList={setShowCustomerList}
                    handleRefresh={handleRefresh}
                    customerSearch={customerSearch}
                    setCustomerSearch={setCustomerSearch}
                  />
                </CardContent>
              </Card>

              {/* BLOC FACTURES À VALIDER */}
              {validationRequests.length > 0 && (
                <Card className={sectionCardClass}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2
                          className={cn(
                            "text-sm font-semibold",
                            primaryText,
                          )}
                        >
                          Factures à valider
                        </h2>
                        <p className={cn("text-xs", secondaryText)}>
                          {validationRequests.length} facture
                          {validationRequests.length > 1 ? "s" : ""} en attente
                          de validation.
                        </p>
                      </div>
                    </div>

                    {isLoadingValidations ? (
                      <div className={cn("text-xs", mutedText)}>
                        Chargement…
                      </div>
                    ) : (
                      <div className="overflow-auto max-h-64 rounded-lg border border-slate-200">
                        <table className="w-full text-xs">
                          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-2 py-1 text-left">
                                N° facture
                              </th>
                              <th className="px-2 py-1 text-left">Contrat</th>
                              <th className="px-2 py-1 text-left">Client</th>
                              <th className="px-2 py-1 text-right">
                                Montant TTC
                              </th>
                              <th className="px-2 py-1 text-left">
                                Période de facturation
                              </th>
                              <th className="px-2 py-1 text-left">Demande</th>
                              <th className="px-2 py-1 text-left">
                                Créée le
                              </th>
                              <th className="px-2 py-1 text-right">Actions</th>
                            </tr>
                          </thead>

                          <tbody>
                            {validationRequests.map((vr) => (
                              <tr
                                key={vr.id}
                                className="border-b border-slate-100 hover:bg-slate-50"
                              >
                                <td className="px-2 py-1 font-medium">
                                  {vr.invoiceNumber}
                                </td>

                                <td className="px-2 py-1">
                                  {vr.contractNumber ?? "—"}
                                </td>

                                <td className="px-2 py-1">
                                  {vr.clientName ?? "—"}
                                </td>

                                <td className="px-2 py-1 text-right">
                                  {formatMoneyEUR(
                                    Number(
                                      (vr as any).totalAmount ?? 0 // @ts-ignore
                                    )
                                  )}
                                </td>

                                <td className="px-2 py-1 whitespace-nowrap">
                                  {formatDateFRNullable(vr.billingPeriodStart)}
                                  {vr.billingPeriodStart || vr.billingPeriodEnd
                                    ? " – "
                                    : ""}
                                  {formatDateFRNullable(vr.billingPeriodEnd)}
                                </td>

                                <td className="px-2 py-1">{vr.subject}</td>

                                <td className="px-2 py-1">
                                  {formatDateFRNullable(
                                    (vr as any).createdAt ?? null
                                  )}
                                </td>

                                <td className="px-2 py-1">
                                  <div className="flex items-center justify-end gap-3">
                                    {/* Voir */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenInvoice(
                                          vr.invoiceId as any
                                        )
                                      }
                                      className="text-xs text-[var(--klyxor-or,#D8B24A)] hover:underline"
                                    >
                                      Voir
                                    </button>

                                    {/* PDF */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadFromRequest(vr)
                                      }
                                      className="text-xs text-slate-600 hover:underline"
                                      disabled={
                                        actionLoadingId ===
                                        (vr.invoiceId as any)
                                      }
                                    >
                                      PDF
                                    </button>

                                    {/* Valider */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openDecisionDialog("validate", vr)
                                      }
                                      className="text-xs text-emerald-600 hover:underline"
                                    >
                                      Valider
                                    </button>

                                    {/* Refuser */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openDecisionDialog("reject", vr)
                                      }
                                      className="text-xs text-red-500 hover:underline"
                                    >
                                      Refuser
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* TABLEAU PRINCIPAL DES FACTURES */}
              <Card className={sectionCardClass}>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div
                      className={cn(
                        "flex items-center justify-center p-4 text-sm",
                        mutedText,
                      )}
                    >
                      Chargement des factures...
                    </div>
                  ) : (
                    <InvoiceTable
                      rows={invoices}
                      highlightLn={highlightLn}
                      total={totalInvoices}
                      limit={limit}
                      offset={offset}
                      onChangePage={(newLimit, newOffset) =>
                        setFilters((prev) => ({
                          ...prev,
                          limit: newLimit,
                          offset: newOffset,
                        }))
                      }
                      onView={handleViewInvoice}
                      onEdit={handleEditInvoice}
                      onDelete={(invoice) => {
                        if (!canDeleteContract()) return;
                        setInvoiceToDelete(invoice);
                        setDeleteDialogOpen(true);
                      }}
                      onDownload={handleDownloadInvoice}
                      downloadingId={downloadingId}
                      refresh={refetch}
                      onValidate={handleValidate}
                      onRevert={handleRevert}
                      onCreateAvoir={handleCreateAvoir}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </KlyxorPageLayout>

      {/* Dialogs de consultation / édition */}
      <ViewInvoiceDialog
        open={!!viewingInvoiceId}
        onOpenChange={(open) => {
          if (!open) setViewingInvoiceId(null);
        }}
        invoiceId={viewingInvoiceId}
      />
      <EditInvoiceDialog
        open={!!editingInvoiceId}
        onOpenChange={(open) => {
          if (!open) setEditingInvoiceId(null);
        }}
        invoiceId={editingInvoiceId}
        refresh={refetch}
      />

      {/* Dialog confirmation suppression */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteInvoice}
        title="Supprimer la facture"
        description="Êtes-vous sûr de vouloir supprimer cette facture ?"
      />

      {/* Pop-up décision validation / refus */}
      {decisionDialogOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="kly-card-soft w-full max-w-lg p-4">
            <h2 className="text-lg font-semibold mb-2 text-kly-text-primary">
              {decisionMode === "validate"
                ? "Valider la facture"
                : "Refuser la facture"}
            </h2>
            <p className="text-sm text-kly-text-secondary mb-4">
              {decisionMode === "validate"
                ? "Merci de confirmer la validation de la facture suivante :"
                : "Merci de confirmer le refus de la facture suivante :"}
            </p>

            <div className="mb-4 text-sm space-y-1 text-kly-text-primary">
              <div>
                <span className="font-medium">Facture : </span>
                {selectedRequest.invoiceNumber}
              </div>
              <div>
                <span className="font-medium">Client : </span>
                {selectedRequest.clientName ?? "—"}
              </div>
              <div>
                <span className="font-medium">Montant TTC : </span>
                {formatMoneyEUR(
                  Number((selectedRequest as any).totalAmount ?? 0)
                )}
              </div>
              <div>
                <span className="font-medium">Période : </span>
                {formatDateFRNullable(selectedRequest.billingPeriodStart)}{" "}
                –{" "}
                {formatDateFRNullable(selectedRequest.billingPeriodEnd)}
              </div>
            </div>

            {decisionMode === "reject" && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-kly-text-primary">
                  Motif du refus <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="kly-input min-h-[90px] resize-none"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (decisionError) setDecisionError(null);
                  }}
                  placeholder="Ex : Montant incorrect, période de facturation à revoir..."
                />
                {decisionError && (
                  <p className="mt-1 text-xs text-red-400">{decisionError}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (decisionSubmitting) return;
                  setDecisionDialogOpen(false);
                  setDecisionMode(null);
                  setSelectedRequest(null);
                  setRejectReason("");
                  setDecisionError(null);
                }}
                disabled={decisionSubmitting}
              >
                Annuler
              </Button>
              <Button
                variant={decisionMode === "validate" ? "default" : "destructive"}
                onClick={handleConfirmDecision}
                disabled={decisionSubmitting}
              >
                {decisionSubmitting
                  ? decisionMode === "validate"
                    ? "Validation..."
                    : "Refus..."
                  : decisionMode === "validate"
                  ? "Confirmer la validation"
                  : "Confirmer le refus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* === Petits composants KPI pour le hero === */

function HeroKpi({
  label,
  value,
  tone = "default",
  isDark,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "muted";
  isDark: boolean;
}) {
  const bg =
    tone === "warning"
      ? isDark
        ? "bg-amber-500/10 border-amber-500/40 text-amber-100"
        : "bg-amber-50 border-amber-200 text-amber-700"
      : tone === "muted"
      ? isDark
        ? "bg-slate-950/40 border-slate-700 text-slate-200"
        : "bg-slate-50 border-slate-200 text-slate-700"
      : isDark
      ? "bg-slate-950/40 border-slate-700 text-slate-100"
      : "bg-slate-50 border-slate-200 text-slate-800";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 border text-[11px]",
        bg,
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="font-semibold">
        {value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}
