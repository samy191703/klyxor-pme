// src/client/services/uploads.api.ts
import {
  LocalFileSelection,
  UploadCreateResponse,
  UploadDocument,
  UploadListResponse,
} from "@shared/models/uploads";
import { DocumentCategory, DocumentTypes } from "@shared/enums/uploads.enum";

/** Small helper to read JSON or throw a clean Error */
async function readJsonOrThrow(res: Response) {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore parse error; we'll fall back to status text
  }
  if (!res.ok) {
    const message =
      data?.error || data?.message || `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(message) as Error & { status?: number; data?: any };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Build URL with optional query params */
function withParams(url: string, params?: Record<string, any>) {
  if (!params) return url;
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.set(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `${url}?${qs}` : url;
}

/** Absolute download URL for a given upload id (uses the secure API route) */
export function getUploadDownloadUrl(id: string) {
  return `/api/uploads/${encodeURIComponent(id)}/download`;
}

/** Open browser download for a given upload id */
export function openUploadDownload(id: string) {
  window.open(getUploadDownloadUrl(id), "_blank", "noopener,noreferrer");
}

/* =========================================================
 * LIST / READ
 * =======================================================*/

/** List all uploads (optionally filtered by contractId) */
export async function listUploads(opts?: {
  contractId?: string | number;
}): Promise<UploadListResponse> {
  const url = withParams("/api/uploads", {
    contractId: opts?.contractId,
  });
  const res = await fetch(url, { credentials: "include" });
  return readJsonOrThrow(res);
}

/** Convenience: list uploads for a specific contract */
export async function listContractUploads(
  contractId: string | number
): Promise<UploadListResponse> {
  const res = await fetch(`/api/contracts/${contractId}/uploads`, {
    credentials: "include",
  });
  return readJsonOrThrow(res);
}

/** Get a single upload/document by id */
export async function getUpload(id: string): Promise<UploadDocument> {
  const res = await fetch(`/api/uploads/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  return readJsonOrThrow(res);
}

/* =========================================================
 * CREATE (UPLOAD)
 * =======================================================*/

/**
 * Upload a single file to a contract.
 * Uses the local multer endpoint: POST /api/contracts/:id/uploads (multipart/form-data)
 */
export async function uploadContractFile(
  contractId: string | number,
  selection: LocalFileSelection & {
    /** Optional override for stored name (defaults to file.name) */
    name?: string;
    /** Optional explicit type/category if not set on selection */
    type?: DocumentTypes;
    category?: DocumentCategory;
  }
): Promise<UploadCreateResponse> {
  const fd = new FormData();
  fd.append("file", selection.file);

  // Optional metadata fields
  const name = selection.name ?? selection.file.name;
  if (name) fd.append("name", name);
  if (selection.type) fd.append("type", String(selection.type));
  if (selection.category) fd.append("category", String(selection.category));
  if (typeof selection.isConfidential === "boolean") {
    fd.append("isConfidential", String(selection.isConfidential));
  }
  if (selection.tags?.length) {
    for (const tag of selection.tags) fd.append("tags", tag);
  }
  if (selection.metadata) {
    fd.append("metadata", JSON.stringify(selection.metadata));
  }

  const res = await fetch(`/api/contracts/${contractId}/uploads`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  return readJsonOrThrow(res);
}

/** Upload multiple files to a contract (sequential to get per-file responses) */
export async function uploadMultipleContractFiles(
  contractId: string | number,
  selections: Array<
    LocalFileSelection & {
      name?: string;
      type?: DocumentTypes;
      category?: DocumentCategory;
    }
  >
): Promise<UploadCreateResponse[]> {
  const out: UploadCreateResponse[] = [];
  for (const sel of selections) {
    // eslint-disable-next-line no-await-in-loop
    const r = await uploadContractFile(contractId, sel);
    out.push(r);
  }
  return out;
}

/* =========================================================
 * UPDATE / DELETE
 * =======================================================*/

/** Update a document's metadata (name, type, category, tags, isConfidential, metadata, contractId re-link, version) */
export async function updateUpload(
  id: string,
  patch: Partial<
    Pick<
      UploadDocument,
      | "name"
      | "type"
      | "category"
      | "isConfidential"
      | "tags"
      | "metadata"
      | "contractId"
      | "version"
    >
  >
): Promise<UploadDocument> {
  const res = await fetch(`/api/uploads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    credentials: "include",
  });
  return readJsonOrThrow(res);
}

/** Soft-delete a document (status -> deleted) */
export async function deleteUpload(id: string): Promise<{ message?: string }> {
  const res = await fetch(`/api/uploads/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return readJsonOrThrow(res);
}
