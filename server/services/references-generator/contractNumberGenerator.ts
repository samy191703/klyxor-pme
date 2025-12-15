// server/services/references-generator/contractNumberGenerator.ts
import { db } from "../../db";
import { contracts } from "@shared/schema";
import { like, desc } from "drizzle-orm";

export interface ContractNumberConfig {
  // Dans le nouveau format PME, on ne distingue plus type / entité.
  // On garde l'interface pour compatibilité, mais on met des valeurs génériques.
  typeCode: string;
  entityCode: string;
  year: number;
}

/**
 * Génère un numéro de contrat pour la version PME/TPE
 *
 * Nouveau format simplifié :
 *   CT-[Année]-[Numéro séquentiel sur 5 chiffres]
 *
 * Exemple : CT-2025-00001
 *
 * Le séquentiel est propre à l'année :
 * - on cherche le dernier contrat dont le numéro commence par "CT-2025-"
 * - on incrémente la partie séquentielle
 */
export class ContractNumberGenerator {
  /**
   * Génère le prochain numéro de contrat au format PME/TPE.
   *
   * La signature garde (type, businessUnit, year?) pour ne pas casser
   * les appels existants, mais ces paramètres ne sont plus utilisés.
   */
  static async generateContractNumber(
    _type: string,
    _businessUnit: string,
    year?: number
  ): Promise<string> {
    const currentYear = year || new Date().getFullYear();
    const prefix = `CT-${currentYear}-`;

    // Rechercher le dernier numéro séquentiel pour cette année
    const lastContract = await db
      .select({ number: contracts.number })
      .from(contracts)
      .where(like(contracts.number, `${prefix}%`))
      .orderBy(desc(contracts.number))
      .limit(1);

    let sequenceNumber = 1;

    if (lastContract.length > 0 && lastContract[0].number) {
      // Exemple attendu : CT-2025-00001
      const parts = lastContract[0].number.split("-");
      if (parts.length === 3) {
        const lastSequence = parseInt(parts[2], 10);
        if (!isNaN(lastSequence)) {
          sequenceNumber = lastSequence + 1;
        }
      }
    }

    // Formater le numéro séquentiel sur 5 chiffres
    const formattedSequence = sequenceNumber.toString().padStart(5, "0");

    return `${prefix}${formattedSequence}`;
  }

  /**
   * Valide le format d'un numéro de contrat
   * Format attendu : CT-AAAA-00001
   */
  static validateContractNumber(number: string): boolean {
    const pattern = /^CT-\d{4}-\d{5}$/;
    return pattern.test(number);
  }

  /**
   * Parse un numéro de contrat pour extraire ses composants
   * Pour le format PME :
   *   CT-[year]-[sequence]
   *
   * typeCode et entityCode sont mis à des valeurs génériques pour
   * conserver la compatibilité de l'interface ContractNumberConfig.
   */
  static parseContractNumber(number: string): ContractNumberConfig | null {
    if (!this.validateContractNumber(number)) {
      return null;
    }

    const parts = number.split("-");
    if (parts.length !== 3) {
      return null;
    }

    const year = parseInt(parts[1], 10);
    if (isNaN(year)) {
      return null;
    }

    return {
      typeCode: "SIMPLE",
      entityCode: "PME",
      year,
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
   * (Plus vraiment utilisé dans le format PME, mais conservé
   * pour compatibilité potentielle avec d'autres parties du code.)
   */
  static getTypeCodes(): Record<string, string> {
    return {
      SIMPLE: "SIMPLE",
    };
  }

  /**
   * Récupère la liste des codes d'entité disponibles
   */
  static getEntityCodes(): Record<string, string> {
    return {
      PME: "PME",
    };
  }
}
