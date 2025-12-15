export const ACCEPTED_EXTENSIONS = [
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
] as const;

export const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",");

export const DEFAULT_PAGE_SIZE = 25;

// If you already have these in @shared/enums/uploads.enum, you can re-export them.
// Kept local here for portability.
export enum DocumentTypes {
  CONTRACT = "contract",
  AMENDMENT = "amendment",
  INVOICE = "invoice",
  ATTESTATION = "attestation",
  OTHER = "other",
}

export enum DocumentCategory {
  LEGAL = "legal",
  FINANCIAL = "financial",
  TECHNICAL = "technical",
  ADMINISTRATIVE = "administrative",
}
