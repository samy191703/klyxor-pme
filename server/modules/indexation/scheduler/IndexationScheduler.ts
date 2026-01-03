import { IndexationContract } from '../types';
import { storage } from '../../../storage';
import { type Contract, type IndexationProposal } from '@shared/schema';
import * as cron from 'node-cron';

interface SchedulerConfig {
  cronExpression?: string;
  windowDays?: number;
  batchSize?: number;
  enabled?: boolean;
}

/**
 * Scheduler pour la détection automatique des contrats à indexer
 */
export class IndexationScheduler {
  private config: Required<SchedulerConfig>;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private scheduledJob: cron.ScheduledTask | null = null;

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      cronExpression: config.cronExpression || '0 8 * * *', // Tous les jours à 8h
      windowDays: config.windowDays || 7, // Fenêtre de détection ±7 jours
      batchSize: config.batchSize || 100,
      enabled: config.enabled ?? true
    };
  }

  /**
   * Démarre le scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('Scheduler désactivé');
      return;
    }

    if (this.scheduledJob) {
      this.stop();
    }

    // Utilisation de node-cron pour la planification
    this.scheduledJob = cron.schedule(this.config.cronExpression, () => {
      this.run();
    });

    console.log(`Scheduler démarré avec expression cron: ${this.config.cronExpression}`);
    
    // Première exécution immédiate
    this.run();
  }

  /**
   * Arrête le scheduler
   */
  stop(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      console.log('Scheduler arrêté');
    }
  }

  /**
   * Exécution manuelle du scheduler
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      console.log('Scheduler déjà en cours d\'exécution');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      console.log(`[${this.lastRun.toISOString()}] Début de la détection des indexations`);
      
      // Détection des contrats éligibles
      const eligibleContracts = await this.detectEligibleContracts();
      console.log(`${eligibleContracts.length} contrats éligibles détectés`);

      // Traitement par batch
      for (let i = 0; i < eligibleContracts.length; i += this.config.batchSize) {
        const batch = eligibleContracts.slice(i, i + this.config.batchSize);
        await this.processBatch(batch);
      }

      console.log('Détection des indexations terminée');
    } catch (error) {
      console.error('Erreur lors de la détection des indexations:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Détecte les contrats éligibles à l'indexation
   */
  private async detectEligibleContracts(): Promise<IndexationContract[]> {
    const today = new Date();
    const windowEnd = new Date(today);
    windowEnd.setDate(today.getDate() + this.config.windowDays);

    // Récupérer les contrats éligibles depuis la DB
    const eligibleContracts = await storage.getContractsEligibleForIndexation(windowEnd);
    
    // Transformer les contrats DB en format attendu par le scheduler
    const indexationContracts: IndexationContract[] = [];
    
    for (const contract of eligibleContracts) {
      // Vérifier qu'il n'y a pas déjà une proposition en cours
      const proposals = await storage.getIndexationProposalsByContractId(contract.id);
      const hasActiveProposal = proposals.some(p => 
        ['draft', 'pending', 'calculated'].includes(p.status) &&
        p.indexationDate?.getTime() === contract.nextIndexationDate?.getTime()
      );
      
      if (!hasActiveProposal && contract.indexationFormula && contract.nextIndexationDate) {
        indexationContracts.push({
          id: contract.id,
          contractNumber: contract.number,
          title: contract.title,
          status: contract.status as 'draft' | 'active' | 'terminated' | 'closed',
          baseAmount: Number(contract.indexationBaseAmount || contract.amount),
          previousAmount: Number(contract.indexationCurrentAmount || contract.amount),
          indexationDate: contract.nextIndexationDate,
          frequency: (contract.indexationFrequency || 'annual') as 'annual' | 'quarterly' | 'monthly',
          formulaCode: contract.indexationFormula,
          indices: contract.indexationIndices as any || {},
          cap: Number(contract.indexationCap) || 0,
          threshold: Number(contract.indexationThreshold) || 0,
          rounding: 'decimal',
          currency: contract.currency || 'EUR'
        });
      }
    }
    
    return indexationContracts;
  }

  /**
   * Traite un batch de contrats
   */
  private async processBatch(contracts: IndexationContract[]): Promise<void> {
    const promises = contracts.map(contract => this.scheduleIndexation(contract));
    await Promise.allSettled(promises);
  }

  /**
   * Planifie le calcul d'indexation pour un contrat
   */
  private async scheduleIndexation(contract: IndexationContract): Promise<void> {
    try {
      // Vérifier qu'il n'y a pas déjà une proposition en cours
      const existingProposal = await this.checkExistingProposal(contract.id);
      if (existingProposal) {
        console.log(`Proposition déjà existante pour le contrat ${contract.contractNumber}`);
        return;
      }

      // Déterminer les indices requis selon la formule
      const requiredIndices = this.getRequiredIndices(contract.formulaCode);
      
      // Créer la tâche de calcul
      const task = {
        type: 'CALCULATE_INDEXATION',
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        formulaCode: contract.formulaCode,
        requiredIndices,
        scheduledAt: new Date(),
        priority: this.calculatePriority(contract),
        metadata: {
          baseAmount: contract.baseAmount,
          previousAmount: contract.previousAmount,
          cap: contract.cap,
          threshold: contract.threshold,
          rounding: contract.rounding
        }
      };

      // TODO: Publier dans la queue de traitement
      await this.publishToQueue(task);
      
      console.log(`Tâche d'indexation créée pour ${contract.contractNumber}`);
    } catch (error) {
      console.error(`Erreur scheduling pour contrat ${contract.contractNumber}:`, error);
    }
  }

  /**
   * Vérifie s'il existe déjà une proposition pour ce contrat
   */
  private async checkExistingProposal(contractId: string): Promise<boolean> {
    const proposals = await storage.getIndexationProposalsByContractId(contractId);
    return proposals.some(p => ['draft', 'pending', 'calculated'].includes(p.status));
  }

  /**
   * Détermine les indices requis selon la formule
   */
  private getRequiredIndices(formulaCode: string): string[] {
    const indicesMap: Record<string, string[]> = {
      '2.A': ['ICHT', 'FM0A'],
      '2.B': ['ICHT', 'FM0A'],
      '3': ['CPI']
    };
    
    return indicesMap[formulaCode] || [];
  }

  /**
   * Calcule la priorité de traitement
   */
  private calculatePriority(contract: IndexationContract): number {
    const today = new Date();
    const daysUntilIndexation = Math.floor(
      (contract.indexationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Plus la date est proche, plus la priorité est haute
    if (daysUntilIndexation < 0) return 1; // En retard
    if (daysUntilIndexation === 0) return 2; // Aujourd'hui
    if (daysUntilIndexation <= 3) return 3; // Imminent
    if (daysUntilIndexation <= 7) return 4; // Proche
    return 5; // Normal
  }

  /**
   * Publie une tâche dans la queue / crée une proposition d'indexation
   */
  private async publishToQueue(task: any): Promise<void> {
    try {
      // Créer la proposition d'indexation dans la base de données
      const proposal = await storage.createIndexationProposal({
        contractId: task.contractId,
        contractNumber: task.contractNumber,
        contractTitle: task.metadata?.contractTitle || '',
        indexationDate: task.scheduledAt,
        formulaCode: task.formulaCode,
        formulaExpression: this.getFormulaExpression(task.formulaCode),
        requiredIndices: task.requiredIndices,
        indicesValues: {},
        baseAmount: String(task.metadata?.baseAmount || 0),
        previousAmount: String(task.metadata?.previousAmount || 0),
        status: 'draft',
        priority: task.priority,
        createdBy: 'scheduler'
      });
      
      console.log(`Proposition d'indexation créée: ${proposal.id} pour contrat ${task.contractNumber}`);
    } catch (error) {
      console.error('Erreur lors de la création de la proposition:', error);
      throw error;
    }
  }

  /**
   * Obtient l'expression de formule
   */
  private getFormulaExpression(formulaCode: string): string {
    const expressions: Record<string, string> = {
      '2.A': 'P = P0 × (0.5 × ICHT/ICHT0 + 0.5 × FM0A/FM0A0)',
      '2.B': 'P = P0 × (0.7 × ICHT/ICHT0 + 0.3 × FM0A/FM0A0)',
      '3': 'P = P0 × CPI/CPI0'
    };
    return expressions[formulaCode] || '';
  }

  /**
   * Parse l'expression cron en interval (simplifié)
   */
  private parseInterval(cronExpression: string): number {
    // Pour l'instant, interval fixe de 24h
    return 24 * 60 * 60 * 1000;
  }


  /**
   * Statistiques du scheduler
   */
  getStats(): {
    isRunning: boolean;
    lastRun: Date | null;
    config: SchedulerConfig;
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      config: this.config
    };
  }
}