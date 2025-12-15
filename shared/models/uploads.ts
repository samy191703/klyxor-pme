// src/shared/models/uploads.ts
import {
  DocumentCategory,
  DocumentStatus,
  DocumentTypes,
} from "@shared/enums/uploads.enum";

/** DB row shape for a stored document (GED) */
export interface UploadDocument {
  id: string;
  contractId?: string | null;

  name: string;
  type: DocumentTypes;
  category: DocumentCategory;

  size: number; // bytes
  mimeType: string; // e.g. "application/pdf"
  url: string; // server path: "/uploads/2025/03/uuid_filename.pdf"

  metadata?: Record<string, unknown> | null;
  tags?: string[] | null;

  status: DocumentStatus;
  version: number;

  uploadedBy: string; // user id
  uploadedAt: string; // ISO datetime
  lastAccessedAt?: string | null;

  isConfidential: boolean;
  retentionDate?: string | null;

  /** Optional convenience: absolute URL if server returns it (or compute client-side) */
  publicUrl?: string;
}

/** Response shape from POST /api/contracts/:id/uploads (local upload) */
export interface UploadCreateResponse {
  document: UploadDocument;
  publicUrl?: string; // e.g. "https://your-host/uploads/2025/03/uuid_file.pdf"
  message?: string;
}

/** Simple alias for GET list endpoints that return an array */
export type UploadListResponse = UploadDocument[];

/** Helper for front-only state when a user picks a file to upload */
export interface LocalFileSelection {
  file: File;
  category?: DocumentCategory;
  type?: DocumentTypes;
  isConfidential?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
