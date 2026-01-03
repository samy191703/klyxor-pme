import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: any;
  setData: (d: any) => void;
  onCreate: () => void;
  pending?: boolean;
};

export default function AmendmentDialog({
  open,
  onOpenChange,
  data,
  setData,
  onCreate,
  pending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un avenant</DialogTitle>
          <DialogDescription>
            Spécifiez les détails de l'avenant à créer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea
              rows={3}
              value={data.description}
              onChange={(e) =>
                setData({ ...data, description: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Date d'effet *</Label>
            <Input
              type="date"
              value={data.effectiveDate}
              onChange={(e) =>
                setData({ ...data, effectiveDate: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Nouveau montant (optionnel)</Label>
            <Input
              type="number"
              value={data.newAmount}
              onChange={(e) => setData({ ...data, newAmount: e.target.value })}
            />
          </div>
          <div>
            <Label>Impact (optionnel)</Label>
            <Textarea
              rows={2}
              value={data.impactDescription}
              onChange={(e) =>
                setData({ ...data, impactDescription: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onCreate}
            disabled={pending || !data.title || !data.description}
          >
            {pending ? "Création..." : "Créer l'avenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
