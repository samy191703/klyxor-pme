import { v4 as uuidv4 } from 'uuid';
import { IndexationProposal, IndexationContract, CalculationResult } from '../types';
import { FormulaEngine } from '../engine/FormulaEngine';
import { IndexSourceAdapter } from '../adapters/IndexSourceAdapter';

/**
 * Service de gestion des propositions d'indexation
 */
export class ProposalService {
  private formulaEngine: FormulaEngine;
  private indexAdapter: IndexSourceAdapter;
  private proposals: Map<string, IndexationProposal> = new Map();

  constructor() {
    this.formulaEngine = new FormulaEngine();
    this.indexAdapter = new IndexSourceAdapter();
  }

  /**
   * Crée une proposition d'indexation pour un contrat
   */
  async createProposal(contract: IndexationContract): Promise<IndexationProposal> {
    const traceId = uuidv4();
    
    try {
      console.log(`[${traceId}] Création proposition pour contrat ${contract.contractNumber}`);
      
      // Récupérer les indices de révision
      const revisedIndices = await this.fetchRevisedIndices(contract);
      
      // Vérifier que tous les indices requis sont disponibles
      if (!this.validateIndicesAvailability(contract.formulaCode, revisedIndices)) {
        throw new Error('Indices manquants pour le calcul');
      }

      // Préparer les paramètres de calcul
      const calculationParams = {
        formulaCode: contract.formulaCode,
        baseAmount: contract.formulaCode === '2.B' ? 
          (contract.previousAmount || contract.baseAmount) : 
          contract.baseAmount,
        indices: {
          ...contract.indices,
          ...revisedIndices,
          previousAmount: contract.previousAmount
        },
        cap: contract.cap,
        threshold: contract.threshold,
        rounding: contract.rounding
      };

      // Calculer l'indexation
      const result = this.formulaEngine.calculate(calculationParams);
      
      // Créer la proposition
      const proposal: IndexationProposal = {
        id: uuidv4(),
        contractId: contract.id,
        period: this.getCurrentPeriod(),
        formulaCode: contract.formulaCode,
        baseAmount: contract.baseAmount,
        previousAmount: contract.previousAmount,
        indices: {
          ICHT0: contract.indices.ICHT0,
          FM0A0: contract.indices.FM0A0,
          CPI0: contract.indices.CPI0,
          ICHT_rev: revisedIndices.ICHT_rev,
          FM0A_rev: revisedIndices.FM0A_rev,
          CPI_rev: revisedIndices.CPI_rev
        },
        cap: contract.cap,
        threshold: contract.threshold,
        rounding: contract.rounding,
        calculatedAmount: result.calculatedAmount,
        newAmount: result.finalAmount,
        deltaAbsolute: result.deltaAbsolute,
        deltaPercent: result.deltaPercent,
        status: 'draft',
        createdAt: new Date(),
        traceId
      };

      // Sauvegarder la proposition
      await this.saveProposal(proposal);
      
      // Log de l'audit
      await this.logProposalCreation(proposal, result);
      
      console.log(`[${traceId}] Proposition créée: ${proposal.id}`);
      return proposal;
    } catch (error) {
      console.error(`[${traceId}] Erreur création proposition:`, error);
      throw error;
    }
  }

  /**
   * Soumet une proposition pour validation
   */
  async submitForValidation(proposalId: string): Promise<void> {
    const proposal = await this.getProposal(proposalId);
    
    if (!proposal) {
      throw new Error(`Proposition ${proposalId} introuvable`);
    }

    if (proposal.status !== 'draft') {
      throw new Error(`Proposition ${proposalId} déjà soumise (status: ${proposal.status})`);
    }

    // Mettre à jour le statut
    proposal.status = 'awaiting_validation';
    proposal.updatedAt = new Date();
    
    await this.saveProposal(proposal);
    
    // Publier l'événement pour déclencher le workflow
    await this.publishEvent({
      type: 'INDEXATION_PROPOSED',
      contractId: proposal.contractId,
      proposalId: proposal.id,
      timestamp: new Date(),
      payload: {
        deltaPercent: proposal.deltaPercent,
        newAmount: proposal.newAmount
      },
      traceId: proposal.traceId
    });
    
    console.log(`Proposition ${proposalId} soumise pour validation`);
  }

  /**
   * Traite la validation d'une proposition
   */
  async processValidation(
    proposalId: string,
    decision: 'validated' | 'rejected',
    validatedBy: string,
    reason?: string
  ): Promise<void> {
    const proposal = await this.getProposal(proposalId);
    
    if (!proposal) {
      throw new Error(`Proposition ${proposalId} introuvable`);
    }

    if (proposal.status !== 'awaiting_validation') {
      throw new Error(`Proposition ${proposalId} pas en attente de validation`);
    }

    // Mettre à jour selon la décision
    if (decision === 'validated') {
      proposal.status = 'validated';
      proposal.validatedAt = new Date();
      proposal.validatedBy = validatedBy;
    } else {
      proposal.status = 'rejected';
      proposal.rejectionReason = reason || 'Rejet sans motif spécifié';
      proposal.validatedAt = new Date();
      proposal.validatedBy = validatedBy;
    }
    
    proposal.updatedAt = new Date();
    await this.saveProposal(proposal);
    
    // Publier l'événement
    await this.publishEvent({
      type: decision === 'validated' ? 'INDEXATION_VALIDATED' : 'INDEXATION_REJECTED',
      contractId: proposal.contractId,
      proposalId: proposal.id,
      timestamp: new Date(),
      payload: {
        validatedBy,
        reason
      },
      traceId: proposal.traceId
    });
    
    console.log(`Proposition ${proposalId} ${decision} par ${validatedBy}`);
  }

  /**
   * Récupère les indices de révision
   */
  private async fetchRevisedIndices(
    contract: IndexationContract
  ): Promise<Record<string, number>> {
    const indices: Record<string, number> = {};
    const currentPeriod = this.getCurrentPeriod();
    
    // Récupérer les indices selon la formule
    if (contract.formulaCode === '2.A' || contract.formulaCode === '2.B') {
      const ichtValue = await this.indexAdapter.getIndexValue('ICHT', currentPeriod);
      const fm0aValue = await this.indexAdapter.getIndexValue('FM0A', currentPeriod);
      
      if (ichtValue) indices.ICHT_rev = ichtValue.value;
      if (fm0aValue) indices.FM0A_rev = fm0aValue.value;
    } else if (contract.formulaCode === '3') {
      const cpiValue = await this.indexAdapter.getIndexValue('CPI', currentPeriod);
      
      if (cpiValue) indices.CPI_rev = cpiValue.value;
    }
    
    return indices;
  }

  /**
   * Valide la disponibilité des indices
   */
  private validateIndicesAvailability(
    formulaCode: string,
    indices: Record<string, number>
  ): boolean {
    const required: Record<string, string[]> = {
      '2.A': ['ICHT_rev', 'FM0A_rev'],
      '2.B': ['ICHT_rev', 'FM0A_rev'],
      '3': ['CPI_rev']
    };
    
    const requiredIndices = required[formulaCode] || [];
    return requiredIndices.every(key => indices[key] !== undefined);
  }

  /**
   * Sauvegarde une proposition
   */
  private async saveProposal(proposal: IndexationProposal): Promise<void> {
    // TODO: Sauvegarder en DB
    this.proposals.set(proposal.id, proposal);
  }

  /**
   * Récupère une proposition
   */
  async getProposal(proposalId: string): Promise<IndexationProposal | null> {
    // TODO: Récupérer depuis DB
    return this.proposals.get(proposalId) || null;
  }

  /**
   * Recherche des propositions
   */
  async searchProposals(criteria: {
    contractId?: string;
    status?: string;
    period?: string;
    limit?: number;
  }): Promise<IndexationProposal[]> {
    // TODO: Implémenter la recherche en DB
    const proposals = Array.from(this.proposals.values());
    
    return proposals.filter(p => {
      if (criteria.contractId && p.contractId !== criteria.contractId) return false;
      if (criteria.status && p.status !== criteria.status) return false;
      if (criteria.period && p.period !== criteria.period) return false;
      return true;
    }).slice(0, criteria.limit || 100);
  }

  /**
   * Publie un événement
   */
  private async publishEvent(event: any): Promise<void> {
    // TODO: Intégrer avec système d'événements
    console.log('Événement publié:', event);
  }

  /**
   * Log d'audit
   */
  private async logProposalCreation(
    proposal: IndexationProposal,
    result: CalculationResult
  ): Promise<void> {
    const auditLog = {
      timestamp: new Date(),
      traceId: proposal.traceId,
      action: 'PROPOSAL_CREATED',
      contractId: proposal.contractId,
      proposalId: proposal.id,
      data: {
        formula: proposal.formulaCode,
        baseAmount: proposal.baseAmount,
        newAmount: proposal.newAmount,
        deltaPercent: proposal.deltaPercent,
        cappedApplied: result.cappedApplied,
        thresholdApplied: result.thresholdApplied,
        details: result.details
      }
    };
    
    // TODO: Sauvegarder en DB
    console.log('Audit log:', auditLog);
  }

  /**
   * Obtient la période courante
   */
  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Statistiques des propositions
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    averageDelta: number;
  }> {
    const proposals = Array.from(this.proposals.values());
    
    const byStatus: Record<string, number> = {};
    let totalDelta = 0;
    
    proposals.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      totalDelta += p.deltaPercent;
    });
    
    return {
      total: proposals.length,
      byStatus,
      averageDelta: proposals.length > 0 ? totalDelta / proposals.length : 0
    };
  }
}