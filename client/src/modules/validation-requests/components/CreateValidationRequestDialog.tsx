"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { useCreateValidationRequest } from "../queries/hooks";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CreateValidationRequestDialog({ open, onClose }: Props) {
  const [form, setForm] = useState({
    type: "",
    referenceId: "",
    reference: "",
    subject: "",
    assignedTo: "",
    reason: "",
  });
  const [error, setError] = useState<string | null>(null);
  const create = useCreateValidationRequest();

  const submit = async () => {
    setError(null);
    try {
      await create.mutateAsync(form);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de validation</DialogTitle>
          <DialogDescription>Créer une demande et l’assigner si nécessaire.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Type (contract, amendment…)" value={form.type}
                     onChange={(e) => setForm({ ...form, type: e.target.value })} fullWidth size="small"/>
          <TextField label="Reference ID" value={form.referenceId}
                     onChange={(e) => setForm({ ...form, referenceId: e.target.value })} fullWidth size="small"/>
          <TextField label="Reference (lisible)" value={form.reference}
                     onChange={(e) => setForm({ ...form, reference: e.target.value })} fullWidth size="small"/>
          <TextField label="Sujet" value={form.subject}
                     onChange={(e) => setForm({ ...form, subject: e.target.value })} fullWidth size="small"/>
          <TextField label="Assignée à (userId)" value={form.assignedTo}
                     onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} fullWidth size="small"/>
          <TextField label="Raison" value={form.reason}
                     onChange={(e) => setForm({ ...form, reason: e.target.value })} fullWidth size="small" multiline/>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}