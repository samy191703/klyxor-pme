import { DocumentTypes, DocumentCategory } from "./constants";

export type ID = string | number;

export type LocalFileSelection = {
  file: File;
};

export type UploadDocument = {
  id: string;
  contractId?: string | null;
  name: string;
  type: DocumentTypes | string;
  category: DocumentCategory | string;
  size: number;
  mimeType: string;
  url: string; // served by /uploads/:file or remote S3
  uploadedAt?: string;
  uploadedBy?: string;
  status?: "active" | "deleted";
  version?: number;
  tags?: string[];
  isConfidential?: boolean;
  metadata?: Record<string, any>;
};

export type UploadBatchMeta = {
  type: DocumentTypes | string;
  category: DocumentCategory | string;
  isConfidential?: boolean;
  // optional
  tags?: string[]; // or JSON stringifiable
  metadata?: Record<string, any>;
  // optional: names[] mapping
  names?: string[];
};

export type GEDEntityScope = { scope: "contract"; id: ID };
// you can extend later:
// | { scope: "amendment"; id: ID }
// | { scope: "termination"; id: ID }

export type GEDFilters = {
  search?: string;
  type?: string | "all";
  format?: string | "all";
  author?: string | "all";
};
