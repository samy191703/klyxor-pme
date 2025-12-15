import React, { useEffect, useState } from "react";

type InvoiceValidationRow = {
  id: string;
  status: string;
  subject: string;
  referenceId: string;
  reference: string;
  createdAt: string;

  invoiceId: string;
  invoiceNumber: string;
  invoiceBaseAmount: string | number;
  invoiceTotalAmount: string | number;
  invoiceCreatedAt: string;

  contractNumber: string | null;
  clientName: string | null;

  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR");
};

const formatAmount = (value: string | number | null | undefined) => {
  const n = Number(value ?? 0);
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
};

export const InvoicesToValidatePage: React.FC = () => {
  const [rows, setRows] = useState<InvoiceValidationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices/validation-requests");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement des factures à valider");
      }
      const data = await res.json();
      setRows(data.rows || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleValidate = async (row: InvoiceValidationRow) => {
    try {
      setSubmittingId(row.invoiceId);
      setError(null);
      const res = await fetch(`/api/invoices/${row.invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceAction: "validate" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erreur lors de la validation de la facture");
      }
      await loadData();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erreur inconnue");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (row: InvoiceValidationRow) => {
    try {
      setSubmittingId(row.invoiceId);
      setError(null);
      const res = await fetch(`/api/invoices/${row.invoiceId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erreur lors du refus de la facture");
      }
      await loadData();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erreur inconnue");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleView = (row: InvoiceValidationRow) => {
    // Adaptation selon tes routes front (ex: /invoices/:id)
    window.location.href = `/invoices/${row.invoiceId}`;
  };

  const handleDownloadPdf = (row: InvoiceValidationRow) => {
    window.open(`/api/invoices/${row.invoiceId}/pdf`, "_blank");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Factures à valider</h1>
        <button
          onClick={loadData}
          className="px-3 py-1 text-sm border rounded-md"
          disabled={loading}
        >
          {loading ? "Chargement..." : "Rafraîchir"}
        </button>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">N° Facture</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-right">Montant HT</th>
              <th className="px-4 py-2 text-right">Montant TTC</th>
              <th className="px-4 py-2 text-left">Date de création</th>
              <th className="px-4 py-2 text-left">Date de début</th>
              <th className="px-4 py-2 text-left">Date de fin</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  Aucune facture à valider.
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">
                  {row.invoiceNumber || row.reference}
                </td>
                <td className="px-4 py-2">
                  {row.clientName || "-"}
                  {row.contractNumber
                    ? ` (${row.contractNumber})`
                    : ""}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatAmount(row.invoiceBaseAmount)}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatAmount(row.invoiceTotalAmount)}
                </td>
                <td className="px-4 py-2">
                  {formatDate(row.invoiceCreatedAt || row.createdAt)}
                </td>
                <td className="px-4 py-2">
                  {formatDate(row.billingPeriodStart)}
                </td>
                <td className="px-4 py-2">
                  {formatDate(row.billingPeriodEnd)}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => handleValidate(row)}
                      disabled={submittingId === row.invoiceId}
                      className="px-2 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => handleReject(row)}
                      disabled={submittingId === row.invoiceId}
                      className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Refuser
                    </button>
                    <button
                      onClick={() => handleView(row)}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(row)}
                      className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                    >
                      Télécharger PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
