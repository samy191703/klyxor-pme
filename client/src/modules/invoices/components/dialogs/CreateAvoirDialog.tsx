import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
import { useToast } from "@/hooks/use-toast";
import { Invoice } from "@shared/schema";

interface CreateAvoirDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSuccess?: () => void;
}

export const CreateAvoirDialog: React.FC<CreateAvoirDialogProps> = ({ open, onOpenChange, invoice, onSuccess }) => {
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (invoice) {
      setDescription(`Avoir pour ${invoice.invoiceNumber}`);
      setDueDate(new Date().toISOString().split("T")[0]);
    }
  }, [invoice]);

  const handleSubmit = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Créer un avoir pour {invoice?.invoiceNumber}</DialogTitle>
      <DialogContent className="flex flex-col gap-4 pt-2">

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Date d'échéance <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dueDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full border rounded px-2 py-1"
          />
          <p className="text-xs text-gray-500">La date d'échéance doit être dans le futur</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description
          </label>
          <input
            id="description"
            type="text"
            placeholder="Entrez la description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} disabled={loading}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={loading} variant="contained">
          {loading ? "Création..." : "Créer l'avoir"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
