"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Info,
  Upload as UploadIcon,
  Loader2,
  FileText,
  Trash2,
  Download,
} from "lucide-react";

import type { GEDEntityScope, UploadDocument } from "../domain/types";
import {
  DocumentTypes,
  DocumentCategory,
  ACCEPTED_EXTENSIONS,
  MAX_SIZE_BYTES,
  ACCEPT_ATTR,
} from "../domain/constants";
import { prettyBytes, isAllowed } from "../utils/formatters";
import { useDocuments } from "../queries/useDocuments";
import { useUploadDocuments } from "../queries/useUploadDocuments";
import { useDeleteDocument } from "../queries/useDeleteDocument";
import { openUploadDownload } from "../services/uploads.api";

type Props = {
  entity: GEDEntityScope; // { scope: "contract", id }
  title?: string;
  className?: string;
};

export default function GEDUploader({
  entity,
  title = "Pièces jointes",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [docType, setDocType] = useState<DocumentTypes>(DocumentTypes.CONTRACT);
  const [docCategory, setDocCategory] = useState<DocumentCategory>(
    DocumentCategory.ADMINISTRATIVE
  );
  const [confidential, setConfidential] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canUse = entity.scope === "contract" && !!entity.id;

  const { data: docs = [], isLoading } = useDocuments(
    entity.scope === "contract" ? entity.id : undefined
  );

  const upload = useUploadDocuments(entity.id);
  const del = useDeleteDocument(
    entity.scope === "contract" ? entity.id : undefined
  );

  const browse = () => inputRef.current?.click();

  const handleFileInput = async (files: FileList | null) => {
    if (!files || !canUse) return;

    const picked: File[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((f) => {
      if (
        isAllowed(f, ACCEPTED_EXTENSIONS as unknown as string[], MAX_SIZE_BYTES)
      )
        picked.push(f);
      else
        rejected.push(
          `${f.name} — extension ou taille invalide (max ${prettyBytes(
            MAX_SIZE_BYTES
          )})`
        );
    });

    if (rejected.length) {
      setError(
        `Fichiers rejetés:\n${rejected.slice(0, 5).join("\n")}${
          rejected.length > 5 ? "\n…" : ""
        }`
      );
    }
    if (!picked.length) return;

    setError(null);
    await upload.mutateAsync({
      selections: picked.map((f) => ({
        file: f,
        type: docType,
        category: docCategory,
        isConfidential: confidential,
      })),
    });

    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUse) return;
    const dt = e.dataTransfer;
    void handleFileInput(dt?.files || null);
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await del.mutateAsync(id);
    } catch (e: any) {
      setError(e?.message || "Échec de la suppression");
    }
  };

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <h2 className="text-xl font-semibold">{title}</h2>

      {!canUse && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Créez d’abord le brouillon pour obtenir un <b>ID</b> puis revenez
            ici pour joindre des fichiers.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Infos :</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Vous pouvez ajouter un ou plusieurs fichiers</li>
            <li>• Formats autorisés : PDF, DOCX, XLSX, ODT, ODS, JPG, PNG</li>
            <li>• Taille max : {prettyBytes(MAX_SIZE_BYTES)} par fichier</li>
            <li>• Suppression possible avant validation</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Batch metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Type</Label>
          <Select
            value={String(docType)}
            onValueChange={(v) => setDocType(v as DocumentTypes)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner un type" />
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
          <Select
            value={String(docCategory)}
            onValueChange={(v) => setDocCategory(v as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DocumentCategory.LEGAL}>Juridique</SelectItem>
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

        <div className="flex items-end gap-2">
          <input
            id="confidential"
            type="checkbox"
            className="h-4 w-4"
            checked={confidential}
            onChange={(e) => setConfidential(e.target.checked)}
          />
          <Label htmlFor="confidential">Confidentiel</Label>
        </div>
      </div>

      {/* Uploader */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          canUse ? "border-gray-300" : "border-gray-200 opacity-60"
        }`}
        onDragOver={(e) => {
          if (!canUse) return;
          e.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => handleFileInput(e.target.files)}
        />
        <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          Glisser-déposer des fichiers ici
        </p>
        <Button
          variant="outline"
          onClick={browse}
          disabled={!canUse || upload.isPending}
        >
          {upload.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi…
            </>
          ) : (
            "Parcourir"
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-2">{`Extensions: ${ACCEPTED_EXTENSIONS.join(
          ", "
        )}`}</p>
      </div>

      {error && (
        <div className="text-xs text-red-600 whitespace-pre-line">{error}</div>
      )}

      {/* List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Fichiers déjà ajoutés</h3>
          {isLoading && (
            <span className="inline-flex items-center text-xs text-gray-500">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Chargement…
            </span>
          )}
        </div>

        {!docs.length ? (
          <div className="text-sm text-gray-500">
            Aucun document pour l’instant.
          </div>
        ) : (
          <div className="divide-y rounded-md border bg-white">
            {docs.map((d: UploadDocument) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-gray-500">
                      {String(d.type)} • {String(d.category)} •{" "}
                      {prettyBytes(d.size)} • {d.mimeType}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openUploadDownload(d.url)}
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Télécharger
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(d.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
