import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchInvoices, deleteInvoice } from "../api/invoice.api";  
import { INVOICE_QK } from "../domain/constants"; 
import { toast } from "@/hooks/use-toast";
import InvoiceKpi from "../components/InvoiceKpi";

export default function InvoiceModulePage() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, error } = useQuery<{ rows: any[] }>({
    queryKey: INVOICE_QK.invoices.list(),
    queryFn: () => fetchInvoices(),
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette facture ?")) return;
    try {
      await deleteInvoice(id);
      toast({
        title: "Facture supprimée",
        description: "La facture a été supprimée avec succès.",
      });
      refetch();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erreur",
        description: err?.message || "Erreur lors de la suppression de la facture.",
      });
    }
  };

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        <span className="mt-4 text-blue-600 font-medium text-lg">Chargement des factures...</span>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <span className="text-red-600 font-medium text-lg">
          {error instanceof Error ? error.message : "Erreur lors du chargement des factures."}
        </span>
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4" data-testid="billing-main">
      <h1 className="text-2xl font-bold mb-4">Module Factures</h1>

      <InvoiceKpi />

      {data?.rows?.length === 0 ? (
        <div className="text-center text-gray-500 p-4">Aucune facture trouvée</div>
      ) : (
        <table className="table-auto w-full border border-gray-200 mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">N° Facture</th>
              <th className="px-4 py-2 border">Contrat</th>
              <th className="px-4 py-2 border">Client</th>
              <th className="px-4 py-2 border">Montant Total</th>
              <th className="px-4 py-2 border">Statut</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{inv.invoiceNumber}</td>
                <td className="px-4 py-2 border">{inv.contractNumber}</td>
                <td className="px-4 py-2 border">{inv.clientName}</td>
                <td className="px-4 py-2 border">{inv.totalAmount}</td>
                <td className="px-4 py-2 border">{inv.status}</td>
                <td className="px-4 py-2 border space-x-2">
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    onClick={() => setSelectedInvoiceId(inv.id)}
                  >
                    Voir
                  </button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    onClick={() => handleDelete(inv.id)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal “fait maison” */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-30"
            onClick={() => setSelectedInvoiceId(null)}
          />
          {/* Contenu modal */}
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Détails facture {selectedInvoiceId}
            </h3>
            <div>
              {/* Ici tu peux ajouter <InvoiceDetail id={selectedInvoiceId} /> */}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                onClick={() => setSelectedInvoiceId(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
