// src/modules/invoices/_views/InvoiceModulePage.tsx
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

import type { Invoice } from "../domain/types";
import { useQuery } from "@tanstack/react-query";
import { fetchInvoices, deleteInvoice, downloadInvoicePdf } from "../api/invoice.api";
import { INVOICE_QK, DEFAULT_INVOICE_FILTERS } from "../domain/constants";

import { InvoiceTable } from "../components/InvoiceTable";
import InvoiceFiltersCard from "../components/InvoiceFiltersCard";
import InvoiceKpi from "../components/InvoiceKpi";
import ViewInvoiceDialog from "../components/dialogs/ViewInvoiceDialog";
import EditInvoiceDialog from "../components/dialogs/EditInvoiceDialog";
import { ConfirmDeleteDialog } from "../components/dialogs/ConfirmDeleteDialog";

export default function InvoiceModulePage() {
  const { canCreateContract, canModifyContract, canDeleteContract } = usePermissions();
  const { toast } = useToast();

  const [filters, setFilters] = useState(DEFAULT_INVOICE_FILTERS);
  const { data: invoicesData, isLoading, error, refetch } = useQuery({
    queryKey: INVOICE_QK.invoices.list(filters),
    queryFn: () => fetchInvoices(filters),
  });

  const invoices = invoicesData?.rows ?? [];
  const totalInvoices = invoicesData?.total ?? 0;

  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  const customerOptions = useMemo(() => {
    if (!invoices) return [];
    return Array.from(new Set(invoices.map((inv) => inv.clientName).filter(Boolean)));
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

  // ✅ Nouveau state pour le dialog de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

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
        description: e?.message || "Impossible de télécharger la facture en PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const customerOptionsClean: string[] = customerOptions.filter(
    (c): c is string => typeof c === "string" && c.trim() !== ""
  );

  if (error)
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Erreur lors du Chargement {(error as Error).message}
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-gray-50" data-testid="invoices-main">
      <Header />
      <main className="h-[calc(100vh-64px)] px-4 py-2 lg:px-6 lg:py-1">
        <div className="w-full">
          <div className="mb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Factures</h1>
                <p className="text-gray-600 mt-1">Gérer les factures et leurs lignes</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={toggleExpand}
                  title={expanded ? "Réduire" : "Agrandir le tableau"}
                >
                  {expanded ? <EyeIcon className="w-4 h-4 mr-2" /> : <EyeOffIcon className="w-4 h-4 mr-2" />}
                  Statistiques
                </Button>
              </div>
            </div>
          </div>

          {showKpis && (
            <div className="mb-4">
              <InvoiceKpi />
            </div>
          )}

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

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-4 text-gray-500">
                  Chargement des factures...
                </div>
              ) : (
                <InvoiceTable
                  rows={invoices}
                  total={totalInvoices}
                  limit={limit}
                  offset={offset}
                  onChangePage={(newLimit, newOffset) =>
                    setFilters((prev) => ({ ...prev, limit: newLimit, offset: newOffset }))
                  }
                  onView={handleViewInvoice}
                  onEdit={handleEditInvoice}
                  onDelete={(inv) => {
                    if (!canDeleteContract()) return;
                    setInvoiceToDelete(inv);
                    setDeleteDialogOpen(true);
                  }}
                  onDownload={handleDownloadInvoice}
                  downloadingId={downloadingId}
                  refresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialogs */}
      <ViewInvoiceDialog
        open={!!viewingInvoiceId}
        onOpenChange={(open) => { if (!open) setViewingInvoiceId(null); }}
        invoiceId={viewingInvoiceId}
      />
      <EditInvoiceDialog
        open={!!editingInvoiceId}
        onOpenChange={(open) => { if (!open) setEditingInvoiceId(null); }}
        invoiceId={editingInvoiceId}
        refresh={refetch}
      />

      {/* ✅ Dialog confirmation suppression */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteInvoice}
        title="Supprimer la facture"
        description="Êtes-vous sûr de vouloir supprimer cette facture ?"
      />
    </div>
  );
}
