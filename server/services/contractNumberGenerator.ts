import { db } from "../db";
import { contracts } from "@shared/schema";
import { eq, and, like, desc } from "drizzle-orm";

export interface ContractNumberConfig {
  typeCode: string;
  entityCode: string;
  year: number;
}

/**
 * Génère un numéro de contrat selon le format ENGIE
 * Format: T=[TypeContrat]–[Entité]–[Année]–[NuméroSéquentiel sur 4 chiffres]
 * Exemple: T=ELEC–ESF–2025–0001 pour un contrat électricité d'ENGIE Solutions France
 */
export class ContractNumberGenerator {
  private static typeCodeMapping: Record<string, string> = {
    electricity: "ELEC",
    gas: "GAZ",
    ppa: "PPA",
    maintenance: "MAINT",
    multi_energy: "MULTI",
    renewable: "RENEW",
  };

  private static entityCodeMapping: Record<string, string> = {
    "ENGIE Solutions France": "ESF",
    "ENGIE Green": "EG",
    "ENGIE Flex": "EF",
    "ENGIE Global Energy Management": "EGEM",
    "ENGIE France BtoC": "EFBC",
    "ENGIE France BtoB": "EFBB",
    "ENGIE Entreprises et Collectivités": "EEC",
  };

  /**
   * Génère le prochain numéro de contrat
   */
  static async generateContractNumber(
    type: string,
    businessUnit: string,
    year?: number
  ): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const typeCode = this.typeCodeMapping[type] || "MISC";
    const entityCode = this.entityCodeMapping[businessUnit] || "ENT";

    // Construire le préfixe du numéro
    const prefix = `CT-${typeCode}–${entityCode}–${currentYear}–`;

    // Rechercher le dernier numéro séquentiel pour ce préfixe
    const lastContract = await db
      .select({ number: contracts.number })
      .from(contracts)
      .where(like(contracts.number, `${prefix}%`))
      .orderBy(desc(contracts.number))
      .limit(1);

    let sequenceNumber = 1;

    if (lastContract.length > 0 && lastContract[0].number) {
      // Extraire le numéro séquentiel du dernier contrat
      const parts = lastContract[0].number.split("–");
      if (parts.length >= 4) {
        const lastSequence = parseInt(parts[3], 10);
        if (!isNaN(lastSequence)) {
          sequenceNumber = lastSequence + 1;
        }
      }
    }

    // Formater le numéro séquentiel sur 4 chiffres
    const formattedSequence = sequenceNumber.toString().padStart(4, "0");

    return `${prefix}${formattedSequence}`;
  }

  /**
   * Valide le format d'un numéro de contrat
   */
  static validateContractNumber(number: string): boolean {
    const pattern = /^T=[A-Z]+–[A-Z]+–\d{4}–\d{4}$/;
    return pattern.test(number);
  }

  /**
   * Parse un numéro de contrat pour extraire ses composants
   */
  static parseContractNumber(number: string): ContractNumberConfig | null {
    if (!this.validateContractNumber(number)) {
      return null;
    }

    const parts = number.replace("T=", "").split("–");
    if (parts.length !== 4) {
      return null;
    }

    return {
      typeCode: parts[0],
      entityCode: parts[1],
      year: parseInt(parts[2], 10),
    };
  }

  /**
   * Génère un numéro temporaire pour les brouillons
   */
  static generateDraftNumber(): string {
    const timestamp = Date.now();
    return `DRAFT-${timestamp}`;
  }

  /**
   * Récupère la liste des codes de type disponibles
   */
  static getTypeCodes(): Record<string, string> {
    return { ...this.typeCodeMapping };
  }

  /**
   * Récupère la liste des codes d'entité disponibles
   */
  static getEntityCodes(): Record<string, string> {
    return { ...this.entityCodeMapping };
  }
}
