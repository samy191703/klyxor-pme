import { FormulaParameters, CalculationResult } from '../types';

/**
 * Moteur de calcul des formules d'indexation
 * Implémente les formules 2.A, 2.B et 3 avec gestion CAP/SEUIL/Arrondi
 */
export class FormulaEngine {
  private formulas: Map<string, (params: FormulaParameters) => number>;

  constructor() {
    this.formulas = new Map();
    this.registerBuiltinFormulas();
  }

  /**
   * Arrondit à un nombre de décimales donné pour éviter les problèmes de précision
   */
  private roundToPrecision(value: number, decimals: number = 2): number {
    // Utiliser parseFloat et toFixed pour éviter les erreurs de précision en virgule flottante
    return parseFloat(value.toFixed(decimals));
  }

  private registerBuiltinFormulas() {
    // Formule 2.A: OMSFn = OMSF0 * (0,15 + 0,55*(ICHTrev/ICHT0) + 0,3*(FM0Arev/FM0A0))
    this.formulas.set('2.A', (params: FormulaParameters) => {
      const { baseAmount, indices } = params;
      const ICHT0 = indices.ICHT0 || 100;
      const ICHTrev = indices.ICHT_rev || ICHT0;
      const FM0A0 = indices.FM0A0 || 100;
      const FM0Arev = indices.FM0A_rev || FM0A0;
      
      const result = baseAmount * (0.15 + 0.55 * (ICHTrev / ICHT0) + 0.3 * (FM0Arev / FM0A0));
      return this.roundToPrecision(result);
    });

    // Formule 2.B: OMSFn = OMSFn-1 * (0,15 + 0,55*(ICHTrev/ICHT0) + 0,3*(FM0Arev/FM0A0))
    this.formulas.set('2.B', (params: FormulaParameters) => {
      const { baseAmount, indices } = params;
      const previousAmount = indices.previousAmount || baseAmount;
      const ICHT0 = indices.ICHT0 || 100;
      const ICHTrev = indices.ICHT_rev || ICHT0;
      const FM0A0 = indices.FM0A0 || 100;
      const FM0Arev = indices.FM0A_rev || FM0A0;
      
      const result = previousAmount * (0.15 + 0.55 * (ICHTrev / ICHT0) + 0.3 * (FM0Arev / FM0A0));
      return this.roundToPrecision(result);
    });

    // Formule 3: OMSFn = OMSF0 * (1 + (CPIn - CPI0)/CPI0)
    this.formulas.set('3', (params: FormulaParameters) => {
      const { baseAmount, indices } = params;
      const CPI0 = indices.CPI0 || 100;
      const CPIrev = indices.CPI_rev || CPI0;
      
      const result = baseAmount * (CPIrev / CPI0);
      return this.roundToPrecision(result);
    });
  }

  /**
   * Calcule l'indexation selon la formule et applique les règles métier
   */
  calculate(params: FormulaParameters): CalculationResult {
    const formula = this.formulas.get(params.formulaCode);
    if (!formula) {
      throw new Error(`Formule inconnue: ${params.formulaCode}`);
    }

    // Calcul brut
    const rawCalculation = formula(params); // Déjà arrondi dans la formule
    const deltaAbsolute = this.roundToPrecision(rawCalculation - params.baseAmount);
    const deltaPercent = this.roundToPrecision((deltaAbsolute / params.baseAmount) * 100);

    let finalAmount = rawCalculation;
    let thresholdApplied = false;
    let cappedApplied = false;

    // Application du SEUIL (threshold)
    let afterThreshold = rawCalculation;
    if (params.threshold && Math.abs(deltaPercent) < params.threshold) {
      afterThreshold = params.baseAmount; // Pas d'indexation si variation < seuil
      thresholdApplied = true;
    }

    // Application du CAP (plafond)
    let afterCap = afterThreshold;
    if (params.cap && deltaPercent > params.cap) {
      afterCap = this.roundToPrecision(params.baseAmount * (1 + params.cap / 100));
      cappedApplied = true;
    } else if (params.cap && deltaPercent < -params.cap) {
      afterCap = this.roundToPrecision(params.baseAmount * (1 - params.cap / 100));
      cappedApplied = true;
    }

    // Application de l'arrondi
    let afterRounding = afterCap;
    const roundingApplied = params.rounding !== 'none';
    
    switch (params.rounding) {
      case 'decimal':
        afterRounding = Math.round(afterCap * 100) / 100;
        break;
      case 'banking':
        afterRounding = this.bankersRounding(afterCap, 2);
        break;
      case 'unit':
        afterRounding = Math.round(afterCap);
        break;
      default:
        afterRounding = afterCap;
    }

    finalAmount = afterRounding;

    return {
      calculatedAmount: rawCalculation,
      finalAmount: this.roundToPrecision(finalAmount),
      deltaAbsolute: this.roundToPrecision(finalAmount - params.baseAmount),
      deltaPercent: this.roundToPrecision(((finalAmount - params.baseAmount) / params.baseAmount) * 100, 2),
      cappedApplied,
      thresholdApplied,
      roundingApplied,
      details: {
        rawCalculation: this.roundToPrecision(rawCalculation),
        afterThreshold: this.roundToPrecision(afterThreshold),
        afterCap: this.roundToPrecision(afterCap),
        afterRounding: this.roundToPrecision(afterRounding)
      }
    };
  }

  /**
   * Arrondi bancaire (pairs vers le bas, impairs vers le haut)
   */
  private bankersRounding(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    const tempValue = value * factor;
    const truncated = Math.trunc(tempValue);
    const decimal = tempValue - truncated;
    
    if (decimal === 0.5) {
      return truncated % 2 === 0 ? truncated / factor : (truncated + 1) / factor;
    }
    
    return Math.round(tempValue) / factor;
  }

  /**
   * Enregistre une formule personnalisée
   */
  registerFormula(code: string, formula: (params: FormulaParameters) => number) {
    this.formulas.set(code, formula);
  }

  /**
   * Liste les formules disponibles
   */
  getAvailableFormulas(): string[] {
    return Array.from(this.formulas.keys());
  }

  /**
   * Valide les paramètres requis pour une formule
   */
  validateParameters(formulaCode: string, indices: Record<string, number>): boolean {
    const requiredIndices: Record<string, string[]> = {
      '2.A': ['ICHT0', 'ICHT_rev', 'FM0A0', 'FM0A_rev'],
      '2.B': ['ICHT0', 'ICHT_rev', 'FM0A0', 'FM0A_rev', 'previousAmount'],
      '3': ['CPI0', 'CPI_rev']
    };

    const required = requiredIndices[formulaCode];
    if (!required) return false;

    return required.every(key => indices[key] !== undefined && indices[key] !== null);
  }
}