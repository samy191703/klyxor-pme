// src/modules/invoice/components/GenerateInvoiceModal.tsx
import { useState, useEffect } from "react";
import { createInvoice } from "@/modules/invoice/api/invoice.api";
import type { BillingLine } from "@/modules/billing/domain/types";

type Props = {
  open: boolean;
  onClose: () => void;
  contractId: string;
  billingScheduleId: string;
  line: BillingLine;
  onSuccess?: () => void; // callback après génération
};

export function GenerateInvoiceModal({ open, onClose, contractId, billingScheduleId, line, onSuccess }: Props) {
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Pré-remplir les valeurs par défaut
  useEffect(() => {
    if (line) {
      setDescription(line.description || "");
      setDueDate(line.dueDate || "");
    }
  }, [line]);

  const handleGenerateInvoice = async () => {
    try {
      await createInvoice({
        contractId,
        billingScheduleId,
        billingLineId: line.id,
        description,
        dueDate,
      });
      alert("Facture générée avec succès !");
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération de la facture");
    }
  };

  if (!open || !line) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded p-6 w-96 shadow-lg">
        <h2 className="text-lg font-bold mb-4">Générer une facture</h2>
        <p className="mb-2"><strong>Contract ID:</strong> {contractId}</p>
        <p className="mb-4"><strong>Billing Schedule ID:</strong> {billingScheduleId}</p>

        <label className="block mb-2">
          Description
          <input
            type="text"
            className="mt-1 w-full border rounded px-2 py-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="block mb-4">
          Due Date
          <input
            type="date"
            className="mt-1 w-full border rounded px-2 py-1"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-300 rounded"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={handleGenerateInvoice}
          >
            Générer
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenerateInvoiceModal;
