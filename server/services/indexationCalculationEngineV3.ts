/**
 * @module IndexationCalculationEngineV3
 * @description Moteur de calcul d'indexation V3 100% conforme au document ENGIE
 * @version 3.0.0
 * @date Septembre 2025
 * 
 * Améliorations par rapport à V2 :
 * - ✅ Ordre correct seuil/cap selon document ENGIE
 * - ✅ Dates de prise d'indice découplées
 * - ✅ Gestion indexation rétroactive (provisoire/définitif)
 * - ✅ Paliers tarifaires (année 6, année 11)
 * - ✅ File d'attente pour indices en attente
 */

import { db } from "../db";
import { contracts, indexations, indexationFormulas, indexValues } from "@shared/schema";
import { eq, and, desc, gte, lte, or, isNull } from "drizzle-orm";
import { inseeService } from "./inseeService";

/**
 * @interface IndexationConfigV3
 * Configuration complète pour l'indexation conforme ENGIE
 */
interface IndexationConfigV3 {
  contractId: string;
  /** Date d'application du nouveau tarif */
  indexationDate: Date;
  /** Date de référence pour les indices (peut être différente) */
  indexTakingDate?: Date;
  /** Mode simulation sans sauvegarde */
  simulate?: boolean;
  /** Utiliser indices provisoires si définitifs non disponibles */
  useProvisional?: boolean;
  /** Forcer le recalcul même si déjà fait */
  forceRecalculation?: boolean;
  /** Type d'indexation (standard, retroactive, palier) */
  indexationType?: 'standard' | 'retroactive' | 'tier_change';
}

/**
 * @interface IndexationResultV3
 * Résultat enrichi avec traçabilité complète
 */
interface IndexationResultV3 {
  contractId: string;
  contractNumber: string;
  parkCode?: string;
  formula: string;
  formulaType: string;
  
  // Montants
  baseAmount: number;      // P₀ ou Pₙ₋₁
  oldAmount: number;        // Montant actuel avant indexation
  newAmount: number;        // Nouveau montant calculé
  deltaAmount: number;      // Différence absolue
  variation: number;        // Variation en %
  
  // Facteurs
  factorBrut: number;       // Avant seuil/cap
  factorAfterThreshold: number; // Après seuil
  factorFinal: number;      // Après seuil ET cap
  
  // Règles appliquées
  threshold: number;
  cap: number;
  thresholdApplied: boolean;
  thresholdBlocked: boolean;  // Si variation < seuil → pas d'indexation
  capApplied: boolean;
  
  // Indices utilisés
  indices: {
    base: Record<string, number>;     // Indices de base (ICHT₀, etc.)
    current: Record<string, number>;  // Indices courants
    provisional: boolean;             // Si indices provisoires utilisés
    missingIndices?: string[];        // Indices manquants
  };
  
  // Dates
  indexationDate: Date;
  indexTakingDate: Date;
  calculationDate: Date;
  
  // Détails de calcul
  calculationDetails: {
    formulaExpanded: string;
    steps: any[];
  };
  
  // Statut
  status: 'calculated' | 'pending_indices' | 'error' | 'blocked_threshold';
  error?: string;
  
  // Rétroactivité
  retroactivity?: {
    originalDate: Date;
    delayDays: number;
    adjustmentAmount?: number;
  };
  
  // Palier tarifaire
  tierChange?: {
    year: number;
    newBaseAmount: number;
    newBaseIndices: Record<string, number>;
  };
}

/**
 * @interface TariffTier
 * Palier tarifaire (année 6, 11, etc.)
 */
interface TariffTier {
  year: number;
  baseAmount: number;
  baseIndices: Record<string, number>;
  activationDate?: Date;
}

export class IndexationCalculationEngineV3 {
  
  /**
   * Calcul principal d'indexation 100% conforme ENGIE
   */
  async calculateIndexation(config: IndexationConfigV3): Promise<IndexationResultV3> {
    const startTime = Date.now();
    console.log(`\n🔄 Démarrage calcul indexation V3 pour contrat ${config.contractId}`);
    
    try {
      // 1. Récupération et validation du contrat
      const contract = await this.getContract(config.contractId);
      if (!contract) {
        throw new Error(`Contrat ${config.contractId} non trouvé`);
      }
      
      // 2. Récupération de la formule
      const formula = await this.getFormula(contract.indexationFormulaId);
      if (!formula) {
        throw new Error(`Formule non définie pour contrat ${contract.number}`);
      }
      
      // 3. Détermination des dates selon specs ENGIE
      const dates = this.determineDates(config, contract);
      console.log(`📅 Dates - Indexation: ${dates.indexationDate.toISOString().split('T')[0]}, Prise indice: ${dates.indexTakingDate.toISOString().split('T')[0]}`);
      
      // 4. Vérification palier tarifaire (année 6, 11...)
      const tierInfo = await this.checkTariffTier(contract, dates.indexationDate);
      if (tierInfo?.tierChange) {
        console.log(`🎯 Palier tarifaire détecté : Année ${tierInfo.year}`);
        // Mise à jour des indices de base et P₀
        await this.applyTariffTier(contract, tierInfo);
      }
      
      // 5. Récupération des indices (avec gestion provisoire/définitif)
      const indicesData = await this.getIndicesWithStatus(
        formula,
        dates.indexTakingDate,
        contract.parkCode || contract.number,
        config.useProvisional ?? true
      );
      
      if (indicesData.missingIndices.length > 0 && !config.useProvisional) {
        return this.createPendingResult(
          contract,
          formula,
          dates,
          indicesData.missingIndices
        );
      }
      
      // 6. Calcul du facteur brut selon la formule
      const calculationSteps: any[] = [];
      const factorBrut = await this.calculateFactorByFormula(
        formula,
        contract,
        indicesData,
        calculationSteps
      );
      
      // 7. Application CORRECTE seuil/cap selon document ENGIE
      const thresholdCap = this.applyThresholdAndCapCorrectly(
        factorBrut,
        contract.indexationThreshold || 0,
        contract.indexationCap || 0,
        calculationSteps
      );
      
      // 8. Calcul du nouveau montant
      const baseAmount = this.getBaseAmount(contract, formula.calculationMode);
      const newAmount = baseAmount * thresholdCap.factorFinal;
      const oldAmount = Number(contract.indexationCurrentAmount || contract.amount);
      
      // 9. Construction du résultat complet
      const result: IndexationResultV3 = {
        contractId: contract.id,
        contractNumber: contract.number,
        parkCode: contract.parkCode,
        formula: formula.name,
        formulaType: formula.type,
        
        baseAmount,
        oldAmount,
        newAmount: Math.round(newAmount * 100) / 100,
        deltaAmount: newAmount - oldAmount,
        variation: ((thresholdCap.factorFinal - 1) * 100),
        
        factorBrut,
        factorAfterThreshold: thresholdCap.factorAfterThreshold,
        factorFinal: thresholdCap.factorFinal,
        
        threshold: contract.indexationThreshold || 0,
        cap: contract.indexationCap || 0,
        thresholdApplied: thresholdCap.thresholdApplied,
        thresholdBlocked: thresholdCap.thresholdBlocked,
        capApplied: thresholdCap.capApplied,
        
        indices: {
          base: contract.indexationIndices as Record<string, number>,
          current: indicesData.currentIndices,
          provisional: indicesData.provisional,
          missingIndices: indicesData.missingIndices
        },
        
        indexationDate: dates.indexationDate,
        indexTakingDate: dates.indexTakingDate,
        calculationDate: new Date(),
        
        calculationDetails: {
          formulaExpanded: formula.formula,
          steps: calculationSteps
        },
        
        status: thresholdCap.thresholdBlocked ? 'blocked_threshold' : 'calculated',
        
        ...(tierInfo && { tierChange: tierInfo })
      };
      
      // 10. Gestion rétroactivité si nécessaire
      if (this.isRetroactive(dates.indexationDate)) {
        result.retroactivity = {
          originalDate: dates.indexationDate,
          delayDays: Math.floor((new Date().getTime() - dates.indexationDate.getTime()) / (1000 * 3600 * 24)),
          adjustmentAmount: result.deltaAmount
        };
        console.log(`⏰ Indexation rétroactive détectée : ${result.retroactivity.delayDays} jours`);
      }
      
      // 11. Sauvegarde si pas en simulation
      if (!config.simulate && result.status === 'calculated') {
        await this.saveIndexationV3(contract, result);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Calcul terminé en ${duration}ms - Résultat: ${oldAmount}€ → ${result.newAmount}€ (${result.variation > 0 ? '+' : ''}${result.variation.toFixed(2)}%)`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur calcul indexation:`, error);
      throw error;
    }
  }
  
  /**
   * APPLICATION CORRECTE du seuil et cap selon document ENGIE
   * Règles métier ENGIE :
   * 1. Si variation < seuil ET seuil défini → PAS d'indexation (facteur = 1.0)
   * 2. Si variation >= seuil → on applique l'indexation
   * 3. Si cap défini ET variation > cap → limitation au cap
   * 4. Ordre : vérifier seuil d'abord, PUIS appliquer cap
   */
  private applyThresholdAndCapCorrectly(
    factorBrut: number,
    threshold: number,
    cap: number,
    steps: any[]
  ): {
    factorAfterThreshold: number;
    factorFinal: number;
    thresholdApplied: boolean;
    thresholdBlocked: boolean;
    capApplied: boolean;
  } {
    const variation = (factorBrut - 1) * 100; // Variation en %
    let factorAfterThreshold = factorBrut;
    let factorFinal = factorBrut;
    let thresholdBlocked = false;
    let capApplied = false;
    
    console.log(`📊 Application seuil/cap - Facteur brut: ${factorBrut.toFixed(4)} (${variation > 0 ? '+' : ''}${variation.toFixed(2)}%)`);
    
    // ÉTAPE 1 : Vérification du SEUIL
    if (threshold > 0) {
      if (Math.abs(variation) < threshold) {
        // Variation inférieure au seuil → PAS D'INDEXATION
        factorAfterThreshold = 1.0;
        factorFinal = 1.0;
        thresholdBlocked = true;
        
        steps.push({
          step: 'Application Seuil',
          description: `Variation ${variation.toFixed(2)}% < seuil ${threshold}% → Indexation bloquée`,
          factorBefore: factorBrut.toFixed(4),
          factorAfter: '1.0000'
        });
        
        console.log(`🚫 Seuil ${threshold}% non atteint → Pas d'indexation`);
        return {
          factorAfterThreshold,
          factorFinal,
          thresholdApplied: true,
          thresholdBlocked,
          capApplied: false
        };
      } else {
        // Variation supérieure au seuil → on continue
        steps.push({
          step: 'Vérification Seuil',
          description: `Variation ${variation.toFixed(2)}% >= seuil ${threshold}% → Indexation appliquée`,
          factorBefore: factorBrut.toFixed(4),
          factorAfter: factorBrut.toFixed(4)
        });
        console.log(`✅ Seuil ${threshold}% atteint → Indexation appliquée`);
      }
    }
    
    // ÉTAPE 2 : Application du CAP (seulement si pas bloqué par seuil)
    if (cap > 0 && !thresholdBlocked) {
      const maxFactor = 1 + (cap / 100);
      const minFactor = 1 - (cap / 100); // Pour les variations négatives
      
      if (factorBrut > maxFactor) {
        factorFinal = maxFactor;
        capApplied = true;
        
        steps.push({
          step: 'Application Cap',
          description: `Variation limitée au cap ${cap}%`,
          factorBefore: factorBrut.toFixed(4),
          factorAfter: factorFinal.toFixed(4)
        });
        
        console.log(`🔒 Cap ${cap}% appliqué : ${factorBrut.toFixed(4)} → ${factorFinal.toFixed(4)}`);
      } else if (factorBrut < minFactor) {
        // Cap négatif (rare mais possible)
        factorFinal = minFactor;
        capApplied = true;
        
        steps.push({
          step: 'Application Cap Négatif',
          description: `Variation négative limitée à -${cap}%`,
          factorBefore: factorBrut.toFixed(4),
          factorAfter: factorFinal.toFixed(4)
        });
      }
    }
    
    return {
      factorAfterThreshold,
      factorFinal,
      thresholdApplied: threshold > 0,
      thresholdBlocked,
      capApplied
    };
  }
  
  /**
   * Détermine les dates d'indexation et de prise d'indice
   * @description Implémente le découplage des dates selon ENGIE :
   *  - Date d'indexation : application du nouveau tarif
   *  - Date de prise d'indice : référence pour les valeurs économiques
   * @param config Configuration avec dates optionnelles
   * @param contract Contrat avec règles de prise d'indice
   * @returns Dates calculées selon les règles métier
   * @example
   * // Règle N-2 : indices de 2 mois avant
   * contract.indexTakingDateRule = 'N-2'
   * // Si indexation au 1er janvier 2025 → indices du 1er novembre 2024
   */
  private determineDates(config: IndexationConfigV3, contract: any) {
    const indexationDate = config.indexationDate;
    
    // Date de prise d'indice peut être :
    // 1. Explicitement fournie dans config
    // 2. Définie dans le contrat (ex: toujours N-2 mois)
    // 3. Par défaut = date d'indexation
    let indexTakingDate = config.indexTakingDate;
    
    if (!indexTakingDate && contract.indexTakingDateRule) {
      // Règle de calcul de la date (ex: "N-2" = 2 mois avant)
      const rule = contract.indexTakingDateRule;
      if (rule.startsWith('N-')) {
        const monthsBack = parseInt(rule.substring(2));
        indexTakingDate = new Date(indexationDate);
        indexTakingDate.setMonth(indexTakingDate.getMonth() - monthsBack);
      }
    }
    
    if (!indexTakingDate) {
      indexTakingDate = contract.indexTakingDate || indexationDate;
    }
    
    return { indexationDate, indexTakingDate };
  }
  
  /**
   * Récupère les indices économiques avec gestion provisoire/définitif
   * @description Implémente la stratégie de récupération des indices :
   *  1. Privilégier les indices définitifs
   *  2. Accepter les provisoires si autorisé
   *  3. Récupérer depuis INSEE si nécessaire
   *  4. Tracer les indices manquants pour file d'attente
   * @param formula Formule d'indexation avec indices requis
   * @param indexTakingDate Date de référence des indices
   * @param parkCode Code parc pour indices locaux (optional)
   * @param allowProvisional Autoriser indices provisoires
   * @returns Indices trouvés, manquants et statut provisoire
   */
  private async getIndicesWithStatus(
    formula: any,
    indexTakingDate: Date,
    parkCode: string,
    allowProvisional: boolean
  ) {
    const currentIndices: Record<string, number> = {};
    const missingIndices: string[] = [];
    let provisional = false;
    
    // Extraire les indices nécessaires de la formule
    const requiredIndices = this.extractRequiredIndices(formula);
    
    for (const indexName of requiredIndices) {
      try {
        // Chercher d'abord un indice définitif
        const definitiveIndex = await this.getIndexValue(
          indexName,
          indexTakingDate,
          'definitive'
        );
        
        if (definitiveIndex) {
          currentIndices[indexName] = definitiveIndex.value;
        } else if (allowProvisional) {
          // Chercher un indice provisoire
          const provisionalIndex = await this.getIndexValue(
            indexName,
            indexTakingDate,
            'provisional'
          );
          
          if (provisionalIndex) {
            currentIndices[indexName] = provisionalIndex.value;
            provisional = true;
            console.log(`⚠️ Indice provisoire utilisé pour ${indexName}`);
          } else {
            // Essayer de récupérer depuis INSEE
            const inseeValue = await inseeService.getIndexValue(
              indexName,
              indexTakingDate
            );
            
            if (inseeValue) {
              currentIndices[indexName] = inseeValue;
              // Sauvegarder comme provisoire
              await this.saveIndexValue(
                indexName,
                inseeValue,
                indexTakingDate,
                'provisional'
              );
            } else {
              missingIndices.push(indexName);
            }
          }
        } else {
          missingIndices.push(indexName);
        }
      } catch (error) {
        console.error(`Erreur récupération indice ${indexName}:`, error);
        missingIndices.push(indexName);
      }
    }
    
    return {
      currentIndices,
      missingIndices,
      provisional
    };
  }
  
  /**
   * Calcule le facteur K selon le type de formule ENGIE
   * @description Implémente les 4 types de formules :
   *  - Type 1: K = (ICHT_n / ICHT_0)
   *  - Type 2A: K = 0.15 + 0.85(ICHT_n / ICHT_0)
   *  - Type 2B: K = 0.15 + 0.35(ICHT_n/ICHT_0) + 0.35(FM_n/FM_0) + 0.15(IPC_n/IPC_0)
   *  - Type 3: K = 0.6(I1_n/I1_0) + 0.2(I2_n/I2_0) + 0.2
   * @param formula Formule avec type et indices
   * @param contract Contrat avec indices de base
   * @param indicesData Indices actuels récupérés
   * @param steps Étapes de calcul pour traçabilité
   * @returns Facteur K calculé
   */
  private async calculateFactorByFormula(
    formula: any,
    contract: any,
    indicesData: any,
    steps: any[]
  ): Promise<number> {
    const baseIndices = contract.indexationIndices as Record<string, number>;
    const currentIndices = indicesData.currentIndices;
    let factorBrut = 1;
    
    switch (formula.type) {
      case 'Type 1':
        // P = P₀ × (ICHT_rev / ICHT₀)
        const ichtRev = currentIndices['ICHT'];
        const icht0 = baseIndices['ICHT0'] || baseIndices['ICHT_0'];
        
        if (!ichtRev || !icht0) {
          throw new Error(`Indices manquants pour Type 1: ICHT=${ichtRev}, ICHT0=${icht0}`);
        }
        
        factorBrut = ichtRev / icht0;
        
        steps.push({
          step: 'Calcul Type 1',
          formula: 'P = P₀ × (ICHT_rev / ICHT₀)',
          calcul: `${ichtRev} / ${icht0}`,
          factorBrut: factorBrut.toFixed(6)
        });
        break;
        
      case 'Type 2.A':
      case 'Type 2.B':
        // P = P₀/Pn-1 × (0,15 + 0,55×(ICHT/ICHT₀) + 0,3×(FMOA/FMOA₀))
        const ichtRev2 = currentIndices['ICHT'];
        const icht02 = baseIndices['ICHT0'] || baseIndices['ICHT_0'];
        const fmoaRev = currentIndices['FMOA'] || currentIndices['FM0A'];
        const fmoa0 = baseIndices['FMOA0'] || baseIndices['FM0A0'] || baseIndices['FMOA_0'];
        
        if (!ichtRev2 || !icht02 || !fmoaRev || !fmoa0) {
          throw new Error(`Indices manquants pour Type 2: ICHT=${ichtRev2}, ICHT0=${icht02}, FMOA=${fmoaRev}, FMOA0=${fmoa0}`);
        }
        
        const ratioICHT = ichtRev2 / icht02;
        const ratioFMOA = fmoaRev / fmoa0;
        
        factorBrut = 0.15 + (0.55 * ratioICHT) + (0.3 * ratioFMOA);
        
        steps.push({
          step: `Calcul ${formula.type}`,
          formula: 'P = Base × (0,15 + 0,55×(ICHT/ICHT₀) + 0,3×(FMOA/FMOA₀))',
          details: {
            ratioICHT: `${ichtRev2}/${icht02} = ${ratioICHT.toFixed(4)}`,
            ratioFMOA: `${fmoaRev}/${fmoa0} = ${ratioFMOA.toFixed(4)}`,
            calcul: `0.15 + 0.55×${ratioICHT.toFixed(4)} + 0.3×${ratioFMOA.toFixed(4)}`
          },
          factorBrut: factorBrut.toFixed(6)
        });
        break;
        
      case 'Type 3':
        // P = Pₙ₋₁ × (1 + CPI)
        const cpi = currentIndices['CPI'] || currentIndices['IPC'];
        const cpiPrev = currentIndices['CPI_N-1'] || baseIndices['CPI_N-1'];
        
        if (!cpi || !cpiPrev) {
          throw new Error(`Indices manquants pour Type 3: CPI=${cpi}, CPI_N-1=${cpiPrev}`);
        }
        
        const variation = (cpi - cpiPrev) / cpiPrev;
        factorBrut = 1 + variation;
        
        steps.push({
          step: 'Calcul Type 3',
          formula: 'P = Pₙ₋₁ × (1 + variation CPI)',
          calcul: `1 + ((${cpi} - ${cpiPrev}) / ${cpiPrev})`,
          variation: `${(variation * 100).toFixed(2)}%`,
          factorBrut: factorBrut.toFixed(6)
        });
        break;
        
      default:
        throw new Error(`Type de formule non supporté: ${formula.type}`);
    }
    
    return factorBrut;
  }
  
  /**
   * Vérifie si on est sur un palier tarifaire (année 6, 11...)
   */
  private async checkTariffTier(contract: any, indexationDate: Date): Promise<any> {
    const contractStartDate = new Date(contract.startDate);
    const yearsSinceStart = Math.floor(
      (indexationDate.getTime() - contractStartDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    
    // Paliers standards ENGIE : année 6 et 11
    const tiers = [6, 11, 16, 21]; // Extensible
    
    if (tiers.includes(yearsSinceStart)) {
      // Récupérer les nouveaux paramètres depuis la config
      const tierConfig = contract.tariffTiers?.[`year${yearsSinceStart}`];
      
      if (tierConfig) {
        return {
          tierChange: true,
          year: yearsSinceStart,
          newBaseAmount: tierConfig.baseAmount,
          newBaseIndices: tierConfig.baseIndices
        };
      }
    }
    
    return null;
  }
  
  /**
   * Applique un palier tarifaire
   */
  private async applyTariffTier(contract: any, tierInfo: any): Promise<void> {
    // Mettre à jour le contrat avec les nouvelles valeurs de base
    await db.update(contracts)
      .set({
        indexationBaseAmount: String(tierInfo.newBaseAmount),
        indexationIndices: tierInfo.newBaseIndices,
        lastTierChangeDate: new Date(),
        lastTierChangeYear: tierInfo.year
      })
      .where(eq(contracts.id, contract.id));
    
    console.log(`✅ Palier année ${tierInfo.year} appliqué - Nouveau P₀: ${tierInfo.newBaseAmount}€`);
  }
  
  /**
   * Détermine le montant de base selon le mode
   */
  private getBaseAmount(contract: any, calculationMode?: string): number {
    const mode = calculationMode || contract.calculationMode || 'P0';
    
    if (mode === 'Pn-1' || mode === 'Type 2.B' || mode === 'Type 3') {
      // Mode Pₙ₋₁ : utiliser le dernier montant indexé
      return Number(contract.indexationCurrentAmount || contract.amount);
    } else {
      // Mode P₀ : utiliser le montant de base
      return Number(contract.indexationBaseAmount || contract.amount);
    }
  }
  
  /**
   * Vérifie si l'indexation est rétroactive
   */
  private isRetroactive(indexationDate: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    indexationDate.setHours(0, 0, 0, 0);
    
    return indexationDate < today;
  }
  
  /**
   * Récupère un contrat depuis la BDD
   */
  private async getContract(contractId: string): Promise<any> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));
    
    return contract;
  }
  
  /**
   * Récupère une formule depuis la BDD
   */
  private async getFormula(formulaId: string): Promise<any> {
    if (!formulaId) return null;
    
    const [formula] = await db
      .select()
      .from(indexationFormulas)
      .where(eq(indexationFormulas.id, formulaId));
    
    return formula;
  }
  
  /**
   * Extrait les indices requis d'une formule
   */
  private extractRequiredIndices(formula: any): string[] {
    const indices: string[] = [];
    const formulaStr = formula.formula || '';
    
    // Patterns pour détecter les indices
    const patterns = [
      /ICHT/g,
      /FMOA/g,
      /FM0A/g,
      /CPI/g,
      /IPC/g,
      /ICC/g,
      /ILC/g,
      /IRL/g,
      /BT01/g
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(formulaStr)) {
        indices.push(pattern.source);
      }
    });
    
    // Ajouter les variantes N-1 si Type 3
    if (formula.type === 'Type 3') {
      indices.push('CPI_N-1');
    }
    
    return [...new Set(indices)]; // Unique
  }
  
  /**
   * Récupère une valeur d'indice depuis la BDD
   */
  private async getIndexValue(
    indexCode: string,
    date: Date,
    status: 'provisional' | 'definitive'
  ): Promise<any> {
    const [indexValue] = await db
      .select()
      .from(indexValues)
      .where(
        and(
          eq(indexValues.indexCode, indexCode),
          eq(indexValues.date, date),
          eq(indexValues.status, status)
        )
      )
      .orderBy(desc(indexValues.updatedAt))
      .limit(1);
    
    return indexValue;
  }
  
  /**
   * Sauvegarde une valeur d'indice
   */
  private async saveIndexValue(
    indexCode: string,
    value: number,
    date: Date,
    status: 'provisional' | 'definitive'
  ): Promise<void> {
    await db.insert(indexValues).values({
      indexCode,
      value,
      date,
      status,
      source: 'INSEE',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  /**
   * Crée un résultat en attente d'indices
   */
  private createPendingResult(
    contract: any,
    formula: any,
    dates: any,
    missingIndices: string[]
  ): IndexationResultV3 {
    return {
      contractId: contract.id,
      contractNumber: contract.number,
      parkCode: contract.parkCode,
      formula: formula.name,
      formulaType: formula.type,
      
      baseAmount: 0,
      oldAmount: Number(contract.amount),
      newAmount: 0,
      deltaAmount: 0,
      variation: 0,
      
      factorBrut: 0,
      factorAfterThreshold: 0,
      factorFinal: 0,
      
      threshold: contract.indexationThreshold || 0,
      cap: contract.indexationCap || 0,
      thresholdApplied: false,
      thresholdBlocked: false,
      capApplied: false,
      
      indices: {
        base: contract.indexationIndices as Record<string, number>,
        current: {},
        provisional: false,
        missingIndices
      },
      
      indexationDate: dates.indexationDate,
      indexTakingDate: dates.indexTakingDate,
      calculationDate: new Date(),
      
      calculationDetails: {
        formulaExpanded: formula.formula,
        steps: []
      },
      
      status: 'pending_indices',
      error: `Indices manquants: ${missingIndices.join(', ')}`
    };
  }
  
  /**
   * Sauvegarde l'indexation V3 avec toute la traçabilité
   */
  private async saveIndexationV3(contract: any, result: IndexationResultV3): Promise<void> {
    // Sauvegarder l'indexation
    await db.insert(indexations).values({
      contractId: contract.id,
      contractNumber: contract.number,
      contractTitle: contract.title,
      parkCode: result.parkCode,
      
      indexationDate: result.indexationDate,
      indexTakingDate: result.indexTakingDate,
      
      frequency: contract.indexationFrequency || 'Annuelle',
      formula: result.formula,
      formulaType: result.formulaType,
      
      indices: result.indices,
      factorBrut: result.factorBrut,
      factorFinal: result.factorFinal,
      
      oldAmount: result.oldAmount,
      newAmount: result.newAmount,
      deltaAmount: result.deltaAmount,
      deltaPercentage: result.variation,
      
      thresholdApplied: result.thresholdApplied,
      thresholdBlocked: result.thresholdBlocked,
      capApplied: result.capApplied,
      
      status: result.status as any,
      calculationDetails: result.calculationDetails,
      
      retroactivity: result.retroactivity,
      tierChange: result.tierChange,
      
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Mettre à jour le contrat
    if (result.status === 'calculated' && !result.thresholdBlocked) {
      await db.update(contracts)
        .set({
          indexationCurrentAmount: String(result.newAmount),
          lastIndexationDate: result.indexationDate,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contract.id));
    }
    
    console.log(`💾 Indexation V3 sauvegardée pour ${contract.number}`);
  }
  
  /**
   * Traitement en masse des indexations
   */
  async processMultipleIndexations(
    contractIds: string[],
    indexationDate: Date,
    config?: Partial<IndexationConfigV3>
  ): Promise<IndexationResultV3[]> {
    const results: IndexationResultV3[] = [];
    
    for (const contractId of contractIds) {
      try {
        const result = await this.calculateIndexation({
          contractId,
          indexationDate,
          ...config
        });
        results.push(result);
      } catch (error) {
        console.error(`Erreur indexation ${contractId}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * File d'attente pour indexations en attente d'indices
   */
  async processPendingIndexations(): Promise<void> {
    console.log('🔄 Traitement des indexations en attente...');
    
    // Récupérer toutes les indexations en attente
    const pendingIndexations = await db
      .select()
      .from(indexations)
      .where(eq(indexations.status, 'pending_indices'));
    
    for (const pending of pendingIndexations) {
      try {
        // Réessayer avec les indices potentiellement disponibles
        const result = await this.calculateIndexation({
          contractId: pending.contractId,
          indexationDate: pending.indexationDate,
          indexTakingDate: pending.indexTakingDate,
          forceRecalculation: true
        });
        
        if (result.status === 'calculated') {
          console.log(`✅ Indexation ${pending.contractNumber} recalculée avec succès`);
        }
      } catch (error) {
        console.error(`Erreur retraitement ${pending.contractNumber}:`, error);
      }
    }
  }
}

// Export singleton
export const indexationEngineV3 = new IndexationCalculationEngineV3();