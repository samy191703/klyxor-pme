/**
 * Common backend helpers for ENGIE modules
 * Used by contracts, amendments, terminations, validations, etc.
 */

import type { Request } from "express";

/**
 * Extracts the authenticated user ID from request (fallback: "system")
 */
export function safeUserId(req: Request): string {
  const user = (req as any).user;
  return user?.id ?? "system";
}

/**
 * Extracts the authenticated username from request (fallback: "system")
 */
export function safeUsername(req: Request): string {
  const user = (req as any).user;
  return user?.name ?? "system";
}

/**
 * Parses any date-like input into a Date object.
 * Returns `undefined` if value is falsy or invalid.
 */
export function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Parses date and returns `null` when invalid.
 * Useful for optional DB fields.
 */
export function toDateOrNull(value: any): Date | null {
  const d = toDate(value);
  return d ?? null;
}

/**
 * Safely converts a numeric string or number to a valid Number.
 * Returns `undefined` if invalid or null.
 */
export function toNumberOrUndefined(value: any): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

/**
 * Simple JSON-safe clone (for audit logs, avoids circular refs)
 */
export function safeJson(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return "{}";
  }
}
