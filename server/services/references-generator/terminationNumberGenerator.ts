// server/services/terminationNumberGenerator.ts

import { db } from "../../db";
import { contracts, terminations } from "@shared/schema";
import { eq, count } from "drizzle-orm";

/**
 * Termination number format:
 *   TRM-[TYPE]–[ENTITY]–[YEAR]–[CT_SEQ]-[TERM_SEQ_2]
 * Example:
 *   Contract:  CT-GAZ–EG–2025–0002
 *   Result:    TRM-GAZ–EG–2025–0002-01, TRM-GAZ–EG–2025–0002-02, ...
 *
 * Notes:
 * - Uses EN DASH (U+2013) for the intra-body separators and ASCII hyphen
 *   before the 2-digit termination suffix, same convention as amendments.
 */

const HYPHEN = "-";
const ENDASH = "–"; // U+2013
const SEP = ENDASH;
const PREFIX = "TRM";

type ParsedContractNumber = {
  typeCode: string; // e.g., GAZ
  entityCode: string; // e.g., EG
  year: string; // e.g., 2025
  sequence: string; // e.g., 0002
};

/** Normalize any mixed dashes to hyphen first (internal use). */
function toHyphenOnly(input: string): string {
  return input.replace(/\u2013/g, HYPHEN);
}

/**
 * Parse contract number.
 * Accepts:
 *   CT-GAZ–EG–2025–0002
 *   CT-GAZ-EG-2025-0002
 *   CT–GAZ–EG–2025–0002
 */
function parseContractNumber(raw: string): ParsedContractNumber | null {
  if (!raw) return null;

  const n = toHyphenOnly(raw);
  const noPrefix = n.startsWith("CT-") ? n.slice(3) : n.replace(/^CT[\-–]/, "");
  const parts = noPrefix.split(/[\-–]/g).filter(Boolean);

  if (parts.length !== 4) return null;

  const [typeCode, entityCode, year, seq] = parts;
  if (!/^\d{4}$/.test(year)) return null;
  if (!/^\d{1,4}$/.test(seq)) return null;

  const sequence = seq.padStart(4, "0");
  return { typeCode, entityCode, year, sequence };
}

export class TerminationNumberGenerator {
  /**
   * Generates the next termination number for a given contractId.
   * Output:
   *   TRM-[TYPE]–[ENTITY]–[YEAR]–[CT_SEQ]-[TERM_SEQ_2]
   */
  static async generateTerminationNumber(contractId: string): Promise<string> {
    // 1) Load contract
    const rows = await db
      .select({ id: contracts.id, number: contracts.number })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (!rows.length || !rows[0].number) {
      throw new Error("Contract not found or has no number");
    }

    const parsed = parseContractNumber(rows[0].number);
    if (!parsed) {
      throw new Error(`Invalid contract number format: ${rows[0].number}`);
    }

    // 2) Count existing terminations for this contract
    const cnt = await db
      .select({ total: count() })
      .from(terminations)
      .where(eq(terminations.contractId, contractId));

    const existing = Number(cnt?.[0]?.total ?? 0);
    const nextIndex = existing + 1;

    // 3) 2-digit suffix
    const termSeq = String(nextIndex).padStart(2, "0");

    // 4) Build number
    const { typeCode, entityCode, year, sequence } = parsed;
    return `${PREFIX}-${typeCode}${SEP}${entityCode}${SEP}${year}${SEP}${sequence}-${termSeq}`;
  }

  /**
   * Validate a termination number against the canonical pattern.
   * Example: TRM-GAZ–EG–2025–0002-01
   */
  static validateTerminationNumber(num: string): boolean {
    if (!num) return false;
    const pattern = new RegExp(
      String.raw`^${PREFIX}-[A-Z]+${ENDASH}[A-Z]+${ENDASH}\d{4}${ENDASH}\d{4}-\d{2}$`
    );
    return pattern.test(num);
  }

  /**
   * Preview builder without DB access.
   * Provide the CT number (CT-...) and existing termination count.
   */
  static previewFromContractNumber(
    contractNumber: string,
    existingCount: number
  ): string {
    const parsed = parseContractNumber(contractNumber);
    const nextIdx = existingCount + 1;
    const seq2 = String(nextIdx).padStart(2, "0");

    if (!parsed) {
      return `${PREFIX}-XXXX${ENDASH}XXX${ENDASH}${new Date().getFullYear()}${ENDASH}0000-${seq2}`;
    }

    const { typeCode, entityCode, year, sequence } = parsed;
    return `${PREFIX}-${typeCode}${ENDASH}${entityCode}${ENDASH}${year}${ENDASH}${sequence}-${seq2}`;
  }
}
