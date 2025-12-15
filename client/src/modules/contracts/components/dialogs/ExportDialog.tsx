import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExport: (opts: { format: string; range: string }) => void;
};

export default function ExportDialog({ open, onOpenChange, onExport }: Props) {
  const [format, setFormat] = useState("excel");
  const [range, setRange] = useState("current");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="export-modal">
        <DialogHeader>
          <DialogTitle>Exporter les contrats</DialogTitle>
          <DialogDescription>
            Configurez les options d'export pour générer votre fichier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="export-format">Format d'export</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="export-range">Période</Label>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger id="export-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Filtres actuels</SelectItem>
                <SelectItem value="last_30d">30 derniers jours</SelectItem>
                <SelectItem value="last_quarter">Dernier trimestre</SelectItem>
                <SelectItem value="year_to_date">YTD</SelectItem>
                <SelectItem value="all">Tout exporter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              onExport({ format, range });
              onOpenChange(false);
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
