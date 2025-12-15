import type {
  ID,
  LocalFileSelection,
  UploadBatchMeta,
  UploadDocument,
} from "../domain/types";
import { ACCEPTED_EXTENSIONS } from "../domain/constants";

/** GET all docs (optionally by contractId) */
export async function listDocuments(params?: { contractId?: ID }) {
  const q = params?.contractId ? `?contractId=${params.contractId}` : "";
  const res = await fetch(`/api/documents${q}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as UploadDocument[];
}

/** GET docs for a single contract (helper) */
export async function listContractUploads(contractId: ID) {
  return listDocuments({ contractId });
}

/** POST multipart upload to /api/contracts/:id/uploads */
export async function uploadMultipleContractFiles(
  contractId: ID,
  selections: (LocalFileSelection & UploadBatchMeta)[]
) {
  const fd = new FormData();

  // attach files
  selections.forEach((sel) => fd.append("files", sel.file));

  // batch metadata: use first selection (by design of Step4)
  const first = selections[0];
  if (first) {
    fd.append("type", String(first.type));
    fd.append("category", String(first.category));
    fd.append("isConfidential", String(!!first.isConfidential));
    if (first.tags) fd.append("tags", JSON.stringify(first.tags));
    if (first.metadata) fd.append("metadata", JSON.stringify(first.metadata));
    if (first.names?.length) first.names.forEach((n) => fd.append("name", n));
  }

  const res = await fetch(`/api/contracts/${contractId}/uploads`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Upload failed (HTTP ${res.status})`);
  }
  return res.json();
}

/** Soft delete a document */
export async function deleteUpload(docId: string) {
  const res = await fetch(`/api/documents/${docId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Open a document url in a new tab (helper) */
export function openUploadDownload(docIdOrUrl: string) {
  // If you store only /uploads/file.ext in url, you should look up the doc to resolve url. Here we accept a direct URL as well.
  const isUrl =
    /^https?:\/\//i.test(docIdOrUrl) || docIdOrUrl.startsWith("/uploads/");
  const url = isUrl ? docIdOrUrl : `/api/documents/${docIdOrUrl}`;
  window.open(url, "_blank", "noopener");
}

/** Validate an input file quickly on client side */
export function validateLocalFile(
  file: File,
  maxBytes: number = 20 * 1024 * 1024
) {
  const okExt = ACCEPTED_EXTENSIONS.includes(
    file.name.split(".").pop()?.toLowerCase() as any
  );
  const okSize = file.size <= maxBytes;
  return okExt && okSize;
}

/** Update document metadata */
export async function updateDocument(id: string, data: any) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
