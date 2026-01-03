import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contracts: any[];
  data: any;
  setData: (d: any) => void;
  onCreate: (contractId: string) => void;
  pending?: boolean;
};

export default function TerminationDialog({
  open,
  onOpenChange,
  contracts,
  data,
  setData,
  onCreate,
  pending,
}: Props) {
  const selectedContract = contracts.find((c) => c.id === data.contractId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demande de résiliation</DialogTitle>
          <DialogDescription>
            Créer une demande de résiliation qui devra être validée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Cette action créera une demande de résiliation qui devra être
              validée.
            </AlertDescription>
          </Alert>

          <div>
            <Label>Contrat à résilier *</Label>
            <Select
              value={data.contractId}
              onValueChange={(value) => setData({ ...data, contractId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un contrat" />
              </SelectTrigger>
              <SelectContent>
                {contracts
                  .filter((c) => c.status === "active")
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.number} - {c.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedContract && (
            <div className="bg-gray-50 p-3 rounded text-sm">
              <div>Contrat : {selectedContract.number}</div>
              <div>Titre : {selectedContract.title}</div>
              <div>Type : {selectedContract.type}</div>
            </div>
          )}

          <div>
            <Label>Date de résiliation souhaitée *</Label>
            <Input
              type="date"
              value={data.terminationDate}
              onChange={(e) =>
                setData({ ...data, terminationDate: e.target.value })
              }
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <Label>Motif de résiliation *</Label>
            <Textarea
              rows={3}
              value={data.terminationReason}
              onChange={(e) =>
                setData({ ...data, terminationReason: e.target.value })
              }
              placeholder="Indiquer le motif de la résiliation."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => onCreate(String(data.contractId))}
            disabled={
              !data.contractId ||
              !data.terminationReason ||
              !data.terminationDate ||
              pending
            }
          >
            {pending ? "Création..." : "Créer la demande"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
