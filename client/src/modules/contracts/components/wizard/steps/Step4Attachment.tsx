// components/wizard/steps/Step4Attachment.tsx
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Info,
  Upload as UploadIcon,
  X,
  FileText,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  listContractUploads,
  uploadMultipleContractFiles,
  deleteUpload,
  openUploadDownload,
} from "@/services/uploads.api";

import { LocalFileSelection, UploadDocument } from "@shared/models/uploads";
import { DocumentCategory, DocumentTypes } from "@shared/enums/uploads.enum";
import { WizardMode } from "../ContractWizard";

type Props = {
  data: any;
  setData: (upd: any) => void;
  contractId?: string | number;
  mode?: WizardMode;
};

const ACCEPTED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "odt",
  "ods",
  "jpg",
  "jpeg",
  "png",
];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}
function isAllowed(file: File) {
  return (
    ACCEPTED_EXTENSIONS.includes(extOf(file.name)) &&
    file.size <= MAX_SIZE_BYTES
  );
}
function prettyBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

export default function Step4Attachment({
  data,
  setData,
  contractId,
  mode = "create",
}: Props) {
  const showStepPrefix = mode !== "edit";
  const title = showStepPrefix ? "Étape 4 — Pièces jointes" : "Pièces jointes";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [docs, setDocs] = useState<UploadDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // batch metadata for uploads
  const [docType, setDocType] = useState<DocumentTypes>(DocumentTypes.CONTRACT);
  const [docCategory, setDocCategory] = useState<DocumentCategory>(
    DocumentCategory.ADMINISTRATIVE
  );
  const [confidential, setConfidential] = useState<boolean>(false);

  const canUse = Boolean(contractId);

  // Load existing documents for the contract
  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await listContractUploads(contractId);
        if (!cancelled) setDocs(list);
      } catch (e: any) {
        if (!cancelled)
          setError(e?.message || "Échec du chargement des pièces jointes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const browse = () => inputRef.current?.click();

  const handleFileInput = async (files: FileList | null) => {
    if (!files || !contractId) return;
    const picked: LocalFileSelection[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((f) => {
      if (isAllowed(f)) picked.push({ file: f });
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

    try {
      setUploading(true);
      setError(null);

      // build selections with batch metadata
      const selections = picked.map((sel) => ({
        ...sel,
        type: docType,
        category: docCategory,
        isConfidential: confidential,
      }));

      await uploadMultipleContractFiles(contractId, selections);
      // refresh list
      const list = await listContractUploads(contractId);
      setDocs(list);
    } catch (e: any) {
      setError(e?.message || "Échec de l’upload des fichiers.");
    } finally {
      setUploading(false);
      // clear file input value so same file can be re-chosen later
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUse) return;
    const dt = e.dataTransfer;
    const files = dt?.files || null;
    void handleFileInput(files);
  };

  const handleDelete = async (id: string) => {
    if (!contractId) return;
    try {
      setLoading(true);
      setError(null);
      await deleteUpload(id);
      const list = await listContractUploads(contractId);
      setDocs(list);
    } catch (e: any) {
      setError(e?.message || "Échec de la suppression.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>

      {!canUse && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Créez d’abord le brouillon (Étape 1) pour obtenir un{" "}
            <b>ID de contrat</b> puis revenez ici pour joindre des fichiers.
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

      {/* Batch metadata (applied to all files selected in one operation) */}
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
            onValueChange={(v) => setDocCategory(v as DocumentCategory)}
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
          accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",")}
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
          disabled={!canUse || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi…
            </>
          ) : (
            "Parcourir"
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          {`Extensions: ${ACCEPTED_EXTENSIONS.join(", ")}`}
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-600 whitespace-pre-line">{error}</div>
      )}

      {/* List of uploaded docs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Fichiers déjà ajoutés</h3>
          {loading && (
            <span className="inline-flex items-center text-xs text-gray-500">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Chargement…
            </span>
          )}
        </div>

        {docs.length === 0 ? (
          <div className="text-sm text-gray-500">
            Aucun document pour l’instant.
          </div>
        ) : (
          <div className="divide-y rounded-md border bg-white">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-gray-500">
                      {d.type} • {d.category} • {prettyBytes(d.size)} •{" "}
                      {d.mimeType}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openUploadDownload(d.id)}
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

      {/* Legacy single-attachment preview (kept for compatibility) */}
      {data.attachment && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{data.attachment.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setData({ ...data, attachment: null })}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
