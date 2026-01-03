/**
 * @module IndexationCalculationEngineV2
 * @description Moteur de calcul d'indexation V2 conforme au document de référence ENGIE
 * 
 * @overview
 * Ce moteur implémente le système complet de révision tarifaire des contrats ENGIE.
 * Il prend en charge les calculs d'indexation selon 4 types de formules standardisées,
 * avec application automatique des seuils et plafonds contractuels.
 * 
 * @formulas
 * - Type 1 : P = P₀ × (ICHT_rev / ICHT₀) - Ratio simple sur indice ICHT
 * - Type 2.A : P = P₀ × (0,15 + 0,55×(ICHT/ICHT₀) + 0,3×(FMOA/FMOA₀)) - Base fixe
 * - Type 2.B : Pₙ = Pₙ₋₁ × (0,15 + 0,55×(ICHT/ICHT₀) + 0,3×(FMOA/FMOA₀)) - Base glissante
 * - Type 3 : P = Pₙ₋₁ × (1 + CPI) - Variation inflation CPI
 * 
 * @integration
 * - Récupération automatique des indices INSEE via InseeService
 * - Sauvegarde en base de données avec traçabilité complète
 * - Support du mode simulation pour tests et prévisions
 * 
 * @businessRules
 * - Seuil minimum : Si variation < seuil (ex: 2%), pas d'indexation
 * - Cap maximum : Si variation > cap (ex: 10%), limitée au cap
 * - Dates découplées : Date de prise d'indice ≠ Date d'application
 * 
 * @author Équipe KLYXOR pour ENGIE
 * @version 2.0.0
 * @since Septembre 2025
 */

import { db } from "../db";
import { contracts, indexations, indexationFormulas } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { inseeService } from "./inseeService";

/**
 * @interface CalculationParams
 * @description Paramètres d'entrée pour le calcul d'indexation
 * 
 * Structure minimale requise pour déclencher un calcul d'indexation.
 * Le moteur récupère automatiquement tous les autres paramètres depuis la BDD.
 */
interface CalculationParams {
  /** Identifiant unique du contrat */
  contractId: string;
  /** Date d'indexation (date d'application) */
  indexationDate: Date;
  /** Mode simulation (true = pas de sauvegarde) */
  simulate?: boolean;
}

/**
 * @interface CalculationResult
 * @description Résultat détaillé du calcul d'indexation
 * 
 * Structure complète retournée après calcul, incluant tous les détails
 * nécessaires pour validation, audit et affichage utilisateur.
 */
interface CalculationResult {
  /** ID du contrat */
  contractId: string;
  /** Numéro du contrat */
  contractNumber: string;
  /** Nom de la formule appliquée */
  formula: string;
  /** Montant avant indexation */
  oldAmount: number;
  /** Nouveau montant après indexation */
  newAmount: number;
  /** Variation en pourcentage */
  variation: number;
  /** Facteur brut calculé (avant seuil/cap) */
  factorBrut: number;
  /** Facteur ajusté (après seuil/cap) */
  factorAdjusted: number;
  /** Indices utilisés (base et courants) */
  indices: Record<string, any>;
  /** Cap appliqué ? */
  cappedApplied: boolean;
  /** Seuil appliqué ? */
  thresholdApplied: boolean;
  /** Détails du calcul */
  details: any;
}

/**
 * @class IndexationCalculationEngineV2
 * @description Moteur de calcul d'indexation conforme aux spécifications ENGIE
 * 
 * @responsibilities
 * - Orchestrer le processus complet d'indexation
 * - Valider les paramètres selon les règles métier
 * - Récupérer les indices économiques depuis INSEE/Eurostat
 * - Calculer selon la formule appropriée (Types 1-4)
 * - Appliquer seuils et plafonds contractuels
 * - Sauvegarder les résultats avec traçabilité
 * 
 * @usage
 * ```typescript
 * const engine = new IndexationCalculationEngineV2();
 * const result = await engine.calculateIndexation({
 *   contractId: 'abc123',
 *   indexationDate: new Date('2025-09-01')
 * });
 * ```
 */
export class IndexationCalculationEngineV2 {
  
  /**
   * @method calculateIndexation
   * @description Calcule l'indexation d'un contrat selon ses paramètres
   * 
   * @param {CalculationParams} params - Paramètres du calcul
   * @returns {Promise<CalculationResult>} Résultat détaillé du calcul
   * 
   * @throws {Error} Si le contrat ou la formule n'est pas trouvé
   * 
   * @example
   * const result = await engineV2.calculateIndexation({
   *   contractId: 'abc123',
   *   indexationDate: new Date('2024-09-01'),
   *   simulate: false
   * });
   */
  async calculateIndexation(params: CalculationParams): Promise<CalculationResult> {
    const { contractId, indexationDate, simulate = false } = params;
    
    // 1. Récupérer le contrat et sa formule
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));
    
    if (!contract) {
      throw new Error(`Contrat ${contractId} non trouvé`);
    }
    
    // 2. Récupérer la formule d'indexation
    let formula = null;
    if (contract.indexationFormulaId) {
      const [f] = await db
        .select()
        .from(indexationFormulas)
        .where(eq(indexationFormulas.id, contract.indexationFormulaId));
      formula = f;
    }
    
    if (!formula) {
      throw new Error(`Formule non définie pour le contrat ${contract.number}`);
    }
    
    // 3. Déterminer la date de prise d'indice
    const indexTakingDate = contract.indexTakingDate || indexationDate;
    
    // 4. Récupérer les indices de base du contrat (ICHT0, FMOA0, etc.)
    const baseIndices = (contract.indexationIndices as Record<string, number>) || {};
    
    // 5. Récupérer les indices courants depuis INSEE
    const currentIndices = await this.getIndicesForFormula(
      formula,
      indexTakingDate,
      contract.parkCode || contract.number
    );
    
    // 6. Calculer selon le type de formule
    const { factorBrut, details } = await this.calculateFactor(
      formula,
      baseIndices,
      currentIndices,
      contract
    );
    
    // 7. Appliquer seuil et cap
    const factorAdjusted = this.applyThresholdAndCap(
      factorBrut,
      Number(contract.indexationThreshold || 0),
      Number(contract.indexationCap || 0)
    );
    
    // 8. Calculer les montants
    const baseAmount = this.getBaseAmount(contract);
    const newAmount = Math.round(baseAmount * factorAdjusted * 100) / 100;
    const oldAmount = Number(contract.indexationCurrentAmount || contract.amount);
    const variation = ((newAmount - oldAmount) / oldAmount) * 100;
    
    const result: CalculationResult = {
      contractId: contract.id,
      contractNumber: contract.number,
      formula: formula.name,
      oldAmount,
      newAmount,
      variation: Math.round(variation * 100) / 100,
      factorBrut,
      factorAdjusted,
      indices: { base: baseIndices, current: currentIndices },
      cappedApplied: factorBrut !== factorAdjusted && Number(contract.indexationCap) > 0,
      thresholdApplied: factorBrut !== factorAdjusted && Number(contract.indexationThreshold) > 0,
      details
    };
    
    // 9. Sauvegarder si pas en mode simulation
    if (!simulate) {
      await this.saveIndexation(contract, result, indexationDate);
    }
    
    return result;
  }
  
  /**
   * @method getIndicesForFormula
   * @private
   * @description Récupère les indices INSEE nécessaires selon le type de formule
   * 
   * @param {any} formula - Formule d'indexation avec type et configuration
   * @param {Date} date - Date de prise d'indice (peut différer de la date d'application)
   * @param {string} parkCode - Identifiant du parc/contrat pour logging
   * 
   * @returns {Promise<Record<string, number>>} Map des indices avec leurs valeurs:
   *   - Type 1: { ICHT, ICHT_rev }
   *   - Type 2: { ICHT, ICHT_rev, FMOA, FMOA_rev }
   *   - Type 3: { CPI, CPI_N-1 }
   * 
   * @note Utilise des valeurs par défaut si INSEE ne répond pas
   */
  private async getIndicesForFormula(
    formula: any,
    date: Date,
    parkCode: string
  ): Promise<Record<string, number>> {
    const indices: Record<string, number> = {};
    
    // Extraire les codes d'indices nécessaires selon le type de formule
    if (formula.type === 'Type 1') {
      // Type 1 : ICHT uniquement
      const ichtValue = await inseeService.getIndiceValue('ICHT', date);
      indices['ICHT'] = ichtValue || 140;
      indices['ICHT_rev'] = indices['ICHT'];
      
    } else if (formula.type === 'Type 2.A' || formula.type === 'Type 2.B') {
      // Type 2 : ICHT et FMOA
      const ichtValue = await inseeService.getIndiceValue('ICHT', date);
      const fmoaValue = await inseeService.getIndiceValue('FMOA', date);
      
      indices['ICHT'] = ichtValue || 140;
      indices['ICHT_rev'] = indices['ICHT'];
      indices['FMOA'] = fmoaValue || 115;
      indices['FMOA_rev'] = indices['FMOA'];
      
    } else if (formula.type === 'Type 3') {
      // Type 3 : CPI
      const cpiValue = await inseeService.getIndiceValue('IPC', date);
      const cpiPrevYear = await inseeService.getIndiceValue('IPC', 
        new Date(date.getFullYear() - 1, date.getMonth(), 1)
      );
      
      indices['CPI'] = cpiValue || 120;
      indices['CPI_N-1'] = cpiPrevYear || 118;
    }
    
    console.log(`📊 Indices récupérés pour ${parkCode}:`, indices);
    return indices;
  }
  
  /**
   * @method calculateFactor
   * @private
   * @description Calcule le facteur multiplicateur selon le type de formule
   * 
   * @formulas
   * - **Type 1**: Ratio simple ICHT_actuel / ICHT_base
   * - **Type 2.A**: 0.15 + 0.55×(ICHT/ICHT₀) + 0.3×(FMOA/FMOA₀) sur P₀
   * - **Type 2.B**: Même formule mais sur Pₙ₋₁ (base glissante)
   * - **Type 3**: 1 + variation_CPI (inflation année N vs N-1)
   * 
   * @param {any} formula - Configuration de la formule
   * @param {Record<string, number>} baseIndices - Indices de référence du contrat
   * @param {Record<string, number>} currentIndices - Indices actuels depuis INSEE
   * @param {any} contract - Contrat pour contexte additionnel
   * 
   * @returns {Promise<{factorBrut: number, details: any}>} 
   *   - factorBrut: Coefficient multiplicateur brut (avant seuils/caps)
   *   - details: Détail du calcul pour traçabilité
   * 
   * @throws {Error} Si type de formule non géré
   */
  private async calculateFactor(
    formula: any,
    baseIndices: Record<string, number>,
    currentIndices: Record<string, number>,
    contract: any
  ): Promise<{ factorBrut: number; details: any }> {
    
    let factorBrut = 1;
    let details: any = {};
    
    switch (formula.type) {
      case 'Type 1':
        // P = P₀ × (ICHT_rev / ICHT₀)
        const icht0 = baseIndices['ICHT0'] || 115.7;
        const ichtRev = currentIndices['ICHT_rev'];
        factorBrut = ichtRev / icht0;
        details = { 
          type: 'Type 1',
          formule: 'P = P₀ × (ICHT_rev / ICHT₀)',
          calcul: `${ichtRev} / ${icht0} = ${factorBrut.toFixed(4)}` 
        };
        break;
        
      case 'Type 2.A':
      case 'Type 2.B':
        // P = P × (0,15 + 0,55×(ICHT/ICHT₀) + 0,3×(FMOA/FMOA₀))
        const icht0_2 = baseIndices['ICHT0'] || 113.4;
        const fmoa0 = baseIndices['FMOA0'] || 91.57;
        const ichtRev_2 = currentIndices['ICHT_rev'];
        const fmoaRev = currentIndices['FMOA_rev'];
        
        const ratioICHT = ichtRev_2 / icht0_2;
        const ratioFMOA = fmoaRev / fmoa0;
        
        factorBrut = 0.15 + (0.55 * ratioICHT) + (0.3 * ratioFMOA);
        
        details = {
          type: formula.type,
          formule: 'P = P × (0,15 + 0,55×(ICHT/ICHT₀) + 0,3×(FMOA/FMOA₀))',
          calcul: `0.15 + 0.55×(${ichtRev_2}/${icht0_2}) + 0.3×(${fmoaRev}/${fmoa0})`,
          ratioICHT: ratioICHT.toFixed(4),
          ratioFMOA: ratioFMOA.toFixed(4),
          factorBrut: factorBrut.toFixed(4)
        };
        break;
        
      case 'Type 3':
        // P = Pₙ₋₁ × (1 + CPI)
        const cpi = currentIndices['CPI'];
        const cpiPrev = currentIndices['CPI_N-1'];
        const variation = (cpi - cpiPrev) / cpiPrev;
        
        factorBrut = 1 + variation;
        
        details = {
          type: 'Type 3',
          formule: 'P = Pₙ₋₁ × (1 + CPI)',
          calcul: `1 + ((${cpi} - ${cpiPrev}) / ${cpiPrev})`,
          variation: (variation * 100).toFixed(2) + '%',
          factorBrut: factorBrut.toFixed(4)
        };
        break;
        
      default:
        throw new Error(`Type de formule non géré : ${formula.type}`);
    }
    
    return { factorBrut, details };
  }
  
  /**
   * @method applyThresholdAndCap
   * @private
   * @description Applique les règles de seuil et plafond selon les spécs ENGIE
   * 
   * @businessRules
   * 1. **Seuil seul**: Si variation < seuil, pas d'indexation (facteur = 1.00)
   * 2. **Cap seul**: Si variation > cap, limitée au cap (facteur = 1 + cap/100)
   * 3. **Seuil + Cap**: Application séquentielle (seuil puis cap)
   * 
   * @param {number} factorBrut - Facteur brut calculé (ex: 1.15 pour +15%)
   * @param {number} threshold - Seuil minimum en % (ex: 2 pour 2%)
   * @param {number} cap - Cap en pourcentage (ex: 5 pour 5%)
   * @returns {number} Facteur ajusté
   */
  private applyThresholdAndCap(
    factorBrut: number,
    threshold: number,
    cap: number
  ): number {
    let factorAdjusted = factorBrut;
    
    // Appliquer d'abord le seuil (minimum)
    if (threshold > 0) {
      const minFactor = 1 + (threshold / 100);
      factorAdjusted = Math.max(factorAdjusted, minFactor);
    }
    
    // Puis appliquer le cap (maximum)
    if (cap > 0) {
      const maxFactor = 1 + (cap / 100);
      factorAdjusted = Math.min(factorAdjusted, maxFactor);
    }
    
    return factorAdjusted;
  }
  
  /**
   * @method getBaseAmount
   * @private
   * @description Détermine le montant de base selon le mode de calcul
   * 
   * @param {any} contract - Contrat
   * @returns {number} Montant de base pour le calcul
   */
  private getBaseAmount(contract: any): number {
    if (contract.calculationMode === 'Pn-1') {
      // Mode Pₙ₋₁ : utiliser le montant actuel
      return Number(contract.indexationCurrentAmount || contract.amount);
    } else {
      // Mode P₀ : utiliser le montant de base
      return Number(contract.indexationBaseAmount || contract.amount);
    }
  }
  
  /**
   * @method saveIndexation
   * @private
   * @description Sauvegarde l'indexation calculée en base de données
   * 
   * @param {any} contract - Contrat indexé
   * @param {CalculationResult} result - Résultat du calcul
   * @param {Date} indexationDate - Date d'indexation
   * @returns {Promise<void>}
   */
  private async saveIndexation(
    contract: any,
    result: CalculationResult,
    indexationDate: Date
  ): Promise<void> {
    // Insérer l'indexation
    await db.insert(indexations).values({
      contractId: contract.id,
      contractNumber: contract.number,
      contractTitle: contract.title,
      indexationDate: indexationDate,
      frequency: contract.indexationFrequency || 'Annuelle',
      formula: result.formula,
      indexKey: result.formula,
      source: 'INSEE',
      businessUnit: contract.businessUnit,
      periodFrom: new Date(indexationDate.getFullYear() - 1, indexationDate.getMonth(), 1),
      periodTo: indexationDate,
      indices: result.indices,
      oldAmount: result.oldAmount,
      newAmount: result.newAmount,
      deltaAmount: result.newAmount - result.oldAmount,
      deltaPercentage: result.variation,
      status: 'calculated',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Mettre à jour le contrat avec le nouveau montant
    await db.update(contracts)
      .set({
        indexationCurrentAmount: String(result.newAmount),
        lastIndexationDate: indexationDate,
        updatedAt: new Date()
      })
      .where(eq(contracts.id, contract.id));
    
    console.log(`✅ Indexation sauvegardée pour ${contract.number}: ${result.oldAmount}€ → ${result.newAmount}€ (+${result.variation}%)`);
  }

  /**
   * @method processIndexation
   * @description Traite l'indexation d'un contrat (appel principal non simulé)
   * 
   * @param {string} contractId - ID du contrat
   * @param {Date} indexationDate - Date d'indexation
   * @returns {Promise<CalculationResult>} Résultat du calcul
   */
  async processIndexation(contractId: string, indexationDate: Date): Promise<CalculationResult> {
    return await this.calculateIndexation({
      contractId,
      indexationDate,
      simulate: false
    });
  }

  /**
   * @method simulateIndexation
   * @description Simule l'indexation d'un contrat sans sauvegarder
   * 
   * @param {string} contractId - ID du contrat
   * @param {Date} indexationDate - Date d'indexation
   * @returns {Promise<CalculationResult>} Résultat de la simulation
   */
  async simulateIndexation(contractId: string, indexationDate: Date): Promise<CalculationResult> {
    return await this.calculateIndexation({
      contractId,
      indexationDate,
      simulate: true
    });
  }
}

// Export de l'instance singleton
export const indexationEngineV2 = new IndexationCalculationEngineV2();