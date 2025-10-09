"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Download, Trash2 } from "lucide-react";
import { formatBytesIEC, fmtDateFR } from "../utils/formatters";
import { openUploadDownload } from "../services/uploads.api";
import { UploadDocument } from "../domain/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc?: UploadDocument | null;
  onDelete?: (doc: UploadDocument) => void;
};

export default function GEDDetailsSheet({
  open,
  onOpenChange,
  doc,
  onDelete,
}: Props) {
  if (!doc) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[540px] lg:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{doc.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Type:</span> {String(doc.type)}
          </div>
          <div>
            <span className="text-gray-500">Catégorie:</span>{" "}
            {String(doc.category)}
          </div>
          <div>
            <span className="text-gray-500">Taille:</span>{" "}
            {formatBytesIEC(doc.size)}
          </div>
          <div>
            <span className="text-gray-500">MIME:</span> {doc.mimeType}
          </div>
          <div>
            <span className="text-gray-500">Ajouté le:</span>{" "}
            {fmtDateFR(doc.uploadedAt)}
          </div>
          <div>
            <span className="text-gray-500">Ajouté par:</span>{" "}
            {doc.uploadedBy || "—"}
          </div>

          <div className="pt-4 flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => openUploadDownload(doc.url)}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
            {onDelete && (
              <Button variant="destructive" onClick={() => onDelete(doc)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
