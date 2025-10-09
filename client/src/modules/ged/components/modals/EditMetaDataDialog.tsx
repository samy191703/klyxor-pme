"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DocumentCategory, DocumentTypes } from "@shared/enums/uploads.enum";
import { UploadDocument } from "../../domain/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc?: UploadDocument | null;
  loading?: boolean;
  onSubmit: (payload: {
    name: string;
    type: string;
    category: string;
    description?: string;
  }) => void;
};

export default function EditMetadataDialog({
  open,
  onOpenChange,
  doc,
  loading = false,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(DocumentTypes.OTHER);
  const [category, setCategory] = useState<string>(
    DocumentCategory.ADMINISTRATIVE
  );
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (!open || !doc) return;
    setName(doc.name ?? "");
    setType(String(doc.type ?? DocumentTypes.OTHER));
    setCategory(String(doc.category ?? DocumentCategory.ADMINISTRATIVE));
    setDescription(String(doc?.metadata?.description ?? ""));
  }, [open, doc]);

  const handleSubmit = () => {
    onSubmit({ name, type, category, description });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier les métadonnées</DialogTitle>
          <DialogDescription>
            Mettre à jour les informations associées au document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="doc-name">Nom</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Type de document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DocumentTypes.CONTRACT}>Contrat</SelectItem>
                <SelectItem value={DocumentTypes.AMENDMENT}>Avenant</SelectItem>
                <SelectItem value={DocumentTypes.INVOICE}>Facture</SelectItem>
                <SelectItem value={DocumentTypes.ATTESTATION}>
                  Attestation
                </SelectItem>
                <SelectItem value={DocumentTypes.OTHER}>Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DocumentCategory.LEGAL}>
                  Juridique
                </SelectItem>
                <SelectItem value={DocumentCategory.FINANCIAL}>
                  Financière
                </SelectItem>
                <SelectItem value={DocumentCategory.TECHNICAL}>
                  Technique
                </SelectItem>
                <SelectItem value={DocumentCategory.ADMINISTRATIVE}>
                  Administrative
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="doc-desc">Description</Label>
            <Textarea
              id="doc-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
