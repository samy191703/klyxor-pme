import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUpdateAmendment } from "../queries/useUpdateAmendment";
import type { Amendment, AmendmentUpdateDto } from "../domain/types";
import { AMENDMENT_STATUS_LABELS } from "../domain/constants";

export function EditAmendmentDialog({
  open,
  onOpenChange,
  a,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  a?: Amendment | null;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const mutation = useUpdateAmendment();
  const [form, setForm] = useState<AmendmentUpdateDto>({});

  useEffect(() => {
    if (a) {
      setForm({
        title: a.title,
        description: a.description ?? "",
        status: a.status,
        effectiveDate: a.effectiveDate.split("T")[0],
        originalAmount: a.originalAmount ?? "",
        newAmount: a.newAmount ?? "",
        impactDescription: a.impactDescription ?? "",
      });
    }
  }, [a?.id]);

  const submit = async () => {
    if (!a) return;
    try {
      await mutation.mutateAsync({ id: a.id, payload: form });
      toast({ title: "Avenant modifié", description: "L'avenant a été modifié avec succès" });
      onOpenChange(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier l'avenant", variant: "destructive" });
    }
  };

  if (!a) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier l'avenant</DialogTitle>
          <DialogDescription>Modifiez les informations de l'avenant</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Titre</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="edit-title" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} data-testid="edit-description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Statut</Label>
              <Select value={form.status ?? "draft"} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger data-testid="edit-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AMENDMENT_STATUS_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date d'effet</Label>
              <Input type="date" value={form.effectiveDate ?? ""} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} data-testid="edit-effective-date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Montant original</Label>
              <Input type="number" value={form.originalAmount ?? ""} onChange={(e) => setForm({ ...form, originalAmount: e.target.value })} data-testid="edit-original-amount" />
            </div>
            <div>
              <Label>Nouveau montant</Label>
              <Input type="number" value={form.newAmount ?? ""} onChange={(e) => setForm({ ...form, newAmount: e.target.value })} data-testid="edit-new-amount" />
            </div>
          </div>
          <div>
            <Label>Description de l'impact</Label>
            <Textarea value={form.impactDescription ?? ""} onChange={(e) => setForm({ ...form, impactDescription: e.target.value })} rows={2} data-testid="edit-impact" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!canEdit} data-testid="button-save">Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
