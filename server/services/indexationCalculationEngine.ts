/**
 * Moteur de calcul d'indexation avancé pour KLYXOR
 * Implémente le mécanisme décrit dans le document avec support pour :
 * - Indices provisoires/révisés
 * - Date de prise d'indice découplée
 * - Mode P₀ ou Pₙ₋₁
 * - Gestion des seuils et caps
 */

import { db } from "../db";
import { contracts, indexValues, indexationFormulas, indexations, indexationProposals } from "@shared/schema";
import { eq, and, desc, lte, sql } from "drizzle-orm";
import type { Contract, IndexValue, IndexationFormula } from "@shared/schema";

interface IndexationCalculationParams {
  contractId: string;
  indexationDate: Date;
  indexTakingDate?: Date;
  testMode?: boolean;
}

interface CalculationResult {
  contractId: string;
  oldAmount: number;
  newAmount: number;
  variation: number;
  factorBrut: number;
  factorAdjusted: number;
  cappedApplied: boolean;
  thresholdApplied: boolean;
  indices: Record<string, any>;
  calculationDetails: any;
}

export class IndexationCalculationEngine {
  /**
   * Calcule l'indexation pour un contrat
   */
  async calculate(params: IndexationCalculationParams): Promise<CalculationResult> {
    const { contractId, indexationDate, indexTakingDate, testMode = false } = params;

    // Récupérer le contrat
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!contract) {
      throw new Error("Contrat non trouvé");
    }

    // Récupérer la formule
    let formula: IndexationFormula | null = null;
    
    // D'abord essayer avec l'ID de formule
    if (contract.indexationFormulaId) {
      const [formulaResult] = await db
        .select()
        .from(indexationFormulas)
        .where(eq(indexationFormulas.id, contract.indexationFormulaId));
      formula = formulaResult;
    }
    
    // Sinon essayer avec le nom de formule
    if (!formula && contract.indexationFormula) {
      const [formulaResult] = await db
        .select()
        .from(indexationFormulas)
        .where(eq(indexationFormulas.name, contract.indexationFormula));
      formula = formulaResult;
    }

    if (!formula) {
      throw new Error(`Formule d'indexation non définie pour ce contrat (formule recherchée: ${contract.indexationFormula || contract.indexationFormulaId})`);
    }

    // Date de prise d'indice (par défaut = date d'indexation)
    const effectiveIndexDate = indexTakingDate || contract.indexTakingDate || indexationDate;

    // Récupérer les valeurs d'indices à la date appropriée
    const indicesValues = await this.getIndicesValues(formula.variables, effectiveIndexDate);

    // Récupérer les indices de base du contrat
    const baseIndices = contract.indexationIndices as Record<string, number> || {};

    // Calculer le facteur brut selon la formule
    const factorBrut = this.calculateRawFactor(formula, baseIndices, indicesValues);

    // Appliquer seuil et cap
    const { factorAdjusted, cappedApplied, thresholdApplied } = this.applyCapAndThreshold(
      factorBrut,
      Number(contract.indexationCap || 0),
      Number(contract.indexationThreshold || 0)
    );

    // Déterminer le montant de base selon le mode de calcul
    let baseAmount: number;
    if (contract.calculationMode === "Pn-1") {
      // Mode Pₙ₋₁ : utiliser le montant actuel
      baseAmount = Number(contract.indexationCurrentAmount || contract.amount);
    } else {
      // Mode P₀ : utiliser le montant de base
      baseAmount = Number(contract.indexationBaseAmount || contract.amount);
    }

    // Calculer le nouveau montant
    const newAmount = Math.round(baseAmount * factorAdjusted * 100) / 100;
    const oldAmount = Number(contract.indexationCurrentAmount || contract.amount);
    const variation = Math.round(((newAmount - oldAmount) / oldAmount) * 10000) / 100;

    const result: CalculationResult = {
      contractId,
      oldAmount,
      newAmount,
      variation,
      factorBrut,
      factorAdjusted,
      cappedApplied,
      thresholdApplied,
      indices: indicesValues,
      calculationDetails: {
        formula: formula.expression,
        baseIndices,
        currentIndices: indicesValues,
        calculationMode: contract.calculationMode || "P0",
        indexationDate: indexationDate.toISOString(),
        indexTakingDate: effectiveIndexDate.toISOString(),
      },
    };

    // Si ce n'est pas un test, créer une proposition d'indexation
    if (!testMode) {
      await this.createIndexationProposal(contract, result, formula);
    }

    return result;
  }

  /**
   * Récupère les valeurs d'indices à une date donnée
   */
  private async getIndicesValues(
    variables: string[],
    date: Date
  ): Promise<Record<string, any>> {
    const indices: Record<string, any> = {};

    for (const variable of variables) {
      // Récupérer l'indice le plus récent avant ou à la date donnée
      const [indexValue] = await db
        .select()
        .from(indexValues)
        .where(
          and(
            eq(indexValues.indexCode, variable),
            lte(indexValues.period, date)
          )
        )
        .orderBy(desc(indexValues.period), desc(indexValues.status))
        .limit(1);

      if (indexValue) {
        indices[variable] = {
          value: Number(indexValue.value),
          date: indexValue.period,
          status: indexValue.status,
          source: indexValue.source,
        };
      } else {
        // Si aucun indice trouvé, lever une erreur ou utiliser une valeur par défaut
        throw new Error(`Indice ${variable} non trouvé pour la date ${date.toISOString()}`);
      }
    }

    return indices;
  }

  /**
   * Calcule le facteur brut selon la formule
   */
  private calculateRawFactor(
    formula: IndexationFormula,
    baseIndices: Record<string, number>,
    currentIndices: Record<string, any>
  ): number {
    let expression = formula.expression;

    // Remplacer les variables dans l'expression
    // Exemple : "P0 * (ICHTREV / ICHT0)" ou "P0 * (0.15 + 0.55 * (ICHTREV / ICHT0) + 0.3 * (FMOAREV / FMOA0))"
    
    // Pour une formule simple type P = P₀ × (ICHTREV / ICHT₀)
    if (expression.includes("/")) {
      let factor = 1;
      
      // Parser l'expression pour extraire les ratios
      const ratioPattern = /\(([A-Z]+)REV?\s*\/\s*([A-Z]+)0?\)/g;
      const matches = expression.matchAll(ratioPattern);
      
      for (const match of matches) {
        const currentVar = match[1].replace("REV", "");
        const baseVar = match[2].replace("0", "");
        
        const currentValue = currentIndices[currentVar]?.value || currentIndices[currentVar + "REV"]?.value;
        const baseValue = baseIndices[baseVar + "0"] || baseIndices[baseVar];
        
        if (currentValue && baseValue) {
          factor = currentValue / baseValue;
        }
      }

      // Pour une formule pondérée
      if (expression.includes("+")) {
        // Extraire les coefficients
        const coeffPattern = /([\d.]+)\s*\+\s*([\d.]+)\s*\*/g;
        const coeffMatch = expression.match(coeffPattern);
        
        if (coeffMatch) {
          // Formule type : 0.15 + 0.55 * ratio1 + 0.3 * ratio2
          factor = this.calculateWeightedFactor(expression, baseIndices, currentIndices);
        }
      }

      return factor;
    }

    // Pour une formule type CPI : P = Pₙ₋₁ × (1 + CPI)
    if (expression.includes("CPI")) {
      const cpiValue = currentIndices["CPI"]?.value || 0;
      const previousCpiValue = baseIndices["CPI_N-1"] || 100;
      return 1 + ((cpiValue - previousCpiValue) / previousCpiValue);
    }

    return 1;
  }

  /**
   * Calcule un facteur pondéré pour les formules complexes
   */
  private calculateWeightedFactor(
    expression: string,
    baseIndices: Record<string, number>,
    currentIndices: Record<string, any>
  ): number {
    // Formule type : P = P₀ × (0,15 + 0,55 × (ICHTREV / ICHT₀) + 0,3 × (FMOAREV / FMOA₀))
    
    let result = 0;
    
    // Extraire la partie fixe
    const fixedMatch = expression.match(/([\d.]+)\s*\+/);
    if (fixedMatch) {
      result += parseFloat(fixedMatch[1]);
    }
    
    // Extraire les termes pondérés
    const weightedPattern = /([\d.]+)\s*[×*]\s*\(([A-Z]+)REV?\s*\/\s*([A-Z]+)0?\)/g;
    const matches = expression.matchAll(weightedPattern);
    
    for (const match of matches) {
      const weight = parseFloat(match[1]);
      const currentVar = match[2].replace("REV", "");
      const baseVar = match[3].replace("0", "");
      
      const currentValue = currentIndices[currentVar]?.value || currentIndices[currentVar + "REV"]?.value;
      const baseValue = baseIndices[baseVar + "0"] || baseIndices[baseVar];
      
      if (currentValue && baseValue) {
        result += weight * (currentValue / baseValue);
      }
    }
    
    return result || 1;
  }

  /**
   * Applique les règles de seuil et cap
   */
  private applyCapAndThreshold(
    factorBrut: number,
    cap: number,
    threshold: number
  ): { factorAdjusted: number; cappedApplied: boolean; thresholdApplied: boolean } {
    let factorAdjusted = factorBrut;
    let cappedApplied = false;
    let thresholdApplied = false;

    // Règles selon le document :
    // - Seuil vide et cap = y% => Min(facteur brut, 1 + y/100)
    // - Seuil = y% et cap vide => Max(facteur brut, 1 + y/100)
    // - Seuil = y% et Cap = z% => Max puis Min
    // - Seuil vide et cap vide => Facteur Brut

    if (threshold > 0 && cap > 0) {
      // Appliquer d'abord le seuil puis le cap
      const minFactor = 1 + threshold / 100;
      const maxFactor = 1 + cap / 100;
      
      if (factorBrut < minFactor) {
        factorAdjusted = minFactor;
        thresholdApplied = true;
      }
      
      if (factorAdjusted > maxFactor) {
        factorAdjusted = maxFactor;
        cappedApplied = true;
      }
    } else if (threshold > 0) {
      // Seuil seul : garantir une hausse minimale
      const minFactor = 1 + threshold / 100;
      if (factorBrut < minFactor) {
        factorAdjusted = minFactor;
        thresholdApplied = true;
      }
    } else if (cap > 0) {
      // Cap seul : limiter la hausse maximale
      const maxFactor = 1 + cap / 100;
      if (factorBrut > maxFactor) {
        factorAdjusted = maxFactor;
        cappedApplied = true;
      }
    }

    return { factorAdjusted, cappedApplied, thresholdApplied };
  }

  /**
   * Crée une proposition d'indexation
   */
  private async createIndexationProposal(
    contract: Contract,
    result: CalculationResult,
    formula: IndexationFormula
  ): Promise<void> {
    await db.insert(indexationProposals).values({
      contractId: contract.id,
      contractNumber: contract.number,
      contractTitle: contract.title,
      indexationDate: new Date(),
      formulaCode: formula.name,
      formulaExpression: formula.expression,
      requiredIndices: formula.variables,
      indicesValues: result.indices,
      baseAmount: result.oldAmount,
      previousAmount: result.oldAmount,
      calculatedAmount: result.newAmount,
      finalAmount: result.newAmount,
      deltaAbsolute: result.newAmount - result.oldAmount,
      deltaPercent: result.variation,
      cappedApplied: result.cappedApplied,
      thresholdApplied: result.thresholdApplied,
      status: "calculated",
      calculationDetails: result.calculationDetails,
      priority: 5,
      createdBy: "calculation_engine",
    });
  }

  /**
   * Récupère les indices manquants pour un contrat
   */
  async getMissingIndices(contractId: string): Promise<string[]> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!contract || !contract.indexationFormulaId) {
      return [];
    }

    const [formula] = await db
      .select()
      .from(indexationFormulas)
      .where(eq(indexationFormulas.id, contract.indexationFormulaId));

    if (!formula) {
      return [];
    }

    const missingIndices: string[] = [];
    const indexDate = contract.indexTakingDate || new Date();

    for (const variable of formula.variables) {
      const [indexValue] = await db
        .select()
        .from(indexValues)
        .where(
          and(
            eq(indexValues.indexCode, variable),
            lte(indexValues.period, indexDate)
          )
        )
        .limit(1);

      if (!indexValue) {
        missingIndices.push(variable);
      }
    }

    return missingIndices;
  }
}

// Export singleton
export const indexationEngine = new IndexationCalculationEngine();