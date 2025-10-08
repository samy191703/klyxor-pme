// server/services/amendmentNumberGenerator.ts

import { db } from "../../db";
import { contracts, amendments } from "@shared/schema";
import { eq, and, like, desc, count } from "drizzle-orm";

/**
 * Amendment number format:
 *   AVN-[TYPE]–[ENTITY]–[YEAR]–[CT_SEQ]-[AMEND_SEQ_2]
 * Example:
 *   Contract: CT-GAZ–EG–2025–0002
 *   Amendments: AVN-GAZ–EG–2025–0002-01, AVN-GAZ–EG–2025–0002-02, ...
 */

const HYPHEN = "-";
const ENDASH = "–"; // U+2013
const SEP = ENDASH; // we standardize on EN DASH for mid-separators

type ParsedContractNumber = {
  typeCode: string; // e.g., GAZ
  entityCode: string; // e.g., EG
  year: string; // e.g., 2025
  sequence: string; // e.g., 0002
};

function normalizeDashes(input: string): string {
  if (!input) return input;
  // normalize any consecutive ASCII hyphens/hodgepodge to a single hyphen, then replace with EN DASH where applicable
  const s = input.replace(/\u2013/g, HYPHEN); // en-dash -> hyphen (normalize first)
  // We only want to keep the contract’s canonical “CT-XXX–YYY–YYYY–NNNN” shape,
  // but some data may contain all hyphens. So after normalization, rebuild using EN DASH for main separators.
  // First split on hyphen to find "CT" and the rest; then for the internal sections use EN DASH.
  // If string already uses the exact target shape, this is a no-op effectively.
  return s;
}

function parseContractNumber(raw: string): ParsedContractNumber | null {
  if (!raw) return null;

  // Accept both `-` and `–` as separators; normalize then re-split robustly.
  const n = raw.replace(/\u2013/g, HYPHEN); // EN DASH -> hyphen
  // Expected shapes:
  //   CT-GAZ–EG–2025–0002  (mixed)
  //   CT-GAZ-EG-2025-0002  (all hyphens)
  //   CT–GAZ–EG–2025–0002  (all en dashes)
  // Strategy: remove the "CT" prefix, then split by hyphen or en-dash.
  const noPrefix = n.startsWith("CT-") ? n.slice(3) : n.replace(/^CT[\-–]/, "");
  const parts = noPrefix.split(/[\-–]/g).filter(Boolean);

  // We now expect exactly 4 parts: [typeCode, entityCode, year, sequence]
  if (parts.length !== 4) return null;

  const [typeCode, entityCode, year, seq] = parts;

  // Basic guards
  if (!/^\d{4}$/.test(year)) return null;
  if (!/^\d{1,4}$/.test(seq)) return null; // sequence can be 1-4 digits before padding

  const sequence = seq.padStart(4, "0");
  return { typeCode, entityCode, year, sequence };
}

export class AmendmentNumberGenerator {
  /**
   * Generates the next amendment number for a given contractId.
   * Output format:
   *   AVN-[TYPE]–[ENTITY]–[YEAR]–[CT_SEQ]-[AMEND_SEQ_2]
   */
  static async generateAmendmentNumber(contractId: string): Promise<string> {
    // 1) Load the contract
    const rows = await db
      .select({ id: contracts.id, number: contracts.number })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (!rows.length || !rows[0].number) {
      throw new Error("Contract not found or has no number");
    }

    const contractNumber = rows[0].number;
    const parsed = parseContractNumber(contractNumber);
    if (!parsed) {
      // Fallback: fail loudly so the caller can decide a default strategy
      throw new Error(`Invalid contract number format: ${contractNumber}`);
    }

    const { typeCode, entityCode, year, sequence } = parsed;

    // 2) Count existing amendments for this contract (strictly by contractId)
    const cnt = await db
      .select({ total: count() })
      .from(amendments)
      .where(eq(amendments.contractId, contractId));

    const existing = Number(cnt?.[0]?.total ?? 0);
    const nextIndex = existing + 1;

    // 3) Format amendment sequence on 2 digits
    const amendSeq = String(nextIndex).padStart(2, "0");

    // 4) Return canonical number using EN DASH as mid-separator, ASCII hyphen before amend suffix
    //    AVN-GAZ–EG–2025–0002-01
    return `AVN-${typeCode}${SEP}${entityCode}${SEP}${year}${SEP}${sequence}-${amendSeq}`;
  }

  /**
   * Validates an amendment number string against the canonical pattern.
   * Accepts EN DASH separators inside the body.
   * Example: AVN-GAZ–EG–2025–0002-03
   */
  static validateAmendmentNumber(num: string): boolean {
    if (!num) return false;
    // Use a permissive regex: TYPE and ENTITY are uppercase letters; YEAR 4 digits; CT_SEQ 4 digits; AMEND_SEQ 2 digits
    const pattern = new RegExp(
      String.raw`^AVN-[A-Z]+${ENDASH}[A-Z]+${ENDASH}\d{4}${ENDASH}\d{4}-\d{2}$`
    );
    return pattern.test(num);
  }

  /**
   * Build a preview without touching the DB, useful for UI/UX.
   * You provide the contract number (CT-...), and how many amendments currently exist.
   */
  static previewFromContractNumber(
    contractNumber: string,
    existingCount: number
  ): string {
    const parsed = parseContractNumber(contractNumber);
    if (!parsed) {
      // Basic fallback for display
      return `AVN-XXXX${ENDASH}XXX${ENDASH}${new Date().getFullYear()}${ENDASH}0000-${String(
        existingCount + 1
      ).padStart(2, "0")}`;
    }
    const { typeCode, entityCode, year, sequence } = parsed;
    const amendSeq = String(existingCount + 1).padStart(2, "0");
    return `AVN-${typeCode}${ENDASH}${entityCode}${ENDASH}${year}${ENDASH}${sequence}-${amendSeq}`;
  }
}
