// server/services/invoiceNumberGenerator.ts

import { db } from "../../db";
import { invoices, contracts } from "@shared/schema";
import { eq, count } from "drizzle-orm";

const ENDASH = "–"; // U+2013
const SEP = ENDASH;

type ParsedContractNumber = {
  typeCode: string;
  entityCode: string;
  year: string;
  sequence: string;
};

function parseContractNumber(raw: string): ParsedContractNumber | null {
  if (!raw) return null;
  const n = raw.replace(/\u2013/g, "-"); // normalize en-dash to hyphen
  const noPrefix = n.startsWith("CT-") ? n.slice(3) : n.replace(/^CT[\-–]/, "");
  const parts = noPrefix.split(/[\-–]/g).filter(Boolean);

  if (parts.length !== 4) return null;
  const [typeCode, entityCode, year, seq] = parts;
  if (!/^\d{4}$/.test(year)) return null;
  if (!/^\d{1,4}$/.test(seq)) return null;

  return { typeCode, entityCode, year, sequence: seq.padStart(4, "0") };
}

export class InvoiceNumberGenerator {
  /**
   * Génère le prochain numéro de facture pour un contrat donné
   * @param contractId
   */
  static async generateInvoiceNumber(contractId: string): Promise<string> {
    // 1) Charger le contrat
    const rows = await db
      .select({ number: contracts.number })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);

    if (!rows.length || !rows[0].number)
      throw new Error("Contract not found or has no number");

    const parsed = parseContractNumber(rows[0].number);
    if (!parsed)
      throw new Error(`Invalid contract number format: ${rows[0].number}`);

    const { typeCode, entityCode, year, sequence } = parsed;

    // 2) Compter les factures existantes pour ce contrat
    const cnt = await db
      .select({ total: count() })
      .from(invoices)
      .where(eq(invoices.contractId, contractId));

    const existing = Number(cnt?.[0]?.total ?? 0);
    const nextIndex = existing + 1;
    const invoiceSeq = String(nextIndex).padStart(2, "0");

    // 3) Retourner le numéro canonique
    return `INV-${typeCode}${SEP}${entityCode}${SEP}${year}${SEP}${sequence}-${invoiceSeq}`;
  }

  static validateInvoiceNumber(num: string): boolean {
    if (!num) return false;
    const pattern = new RegExp(
      String.raw`^INV-[A-Z]+${ENDASH}[A-Z]+${ENDASH}\d{4}${ENDASH}\d{4}-\d{2}$`
    );
    return pattern.test(num);
  }

  static previewFromContractNumber(
    contractNumber: string,
    existingCount: number
  ): string {
    const parsed = parseContractNumber(contractNumber);
    if (!parsed) {
      return `INV-XXXX${ENDASH}XXX${ENDASH}${new Date().getFullYear()}${ENDASH}0000-${String(
        existingCount + 1
      ).padStart(2, "0")}`;
    }
    const { typeCode, entityCode, year, sequence } = parsed;
    return `INV-${typeCode}${ENDASH}${entityCode}${ENDASH}${year}${ENDASH}${sequence}-${String(
      existingCount + 1
    ).padStart(2, "0")}`;
  }
}
