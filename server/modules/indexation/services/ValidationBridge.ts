import { ProposalService } from './ProposalService';
import { ApplyService } from './ApplyService';
import { IndexationEvent } from '../types';

/**
 * Pont entre le module d'indexation et le workflow de validation externe
 */
export class ValidationBridge {
  private proposalService: ProposalService;
  private applyService: ApplyService;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(
    proposalService: ProposalService,
    applyService: ApplyService
  ) {
    this.proposalService = proposalService;
    this.applyService = applyService;
    this.setupEventListeners();
  }

  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Écouter les événements de validation
    this.on('INDEXATION_VALIDATED', async (event: IndexationEvent) => {
      await this.handleValidation(event);
    });

    // Écouter les événements de rejet
    this.on('INDEXATION_REJECTED', async (event: IndexationEvent) => {
      await this.handleRejection(event);
    });
  }

  /**
   * Traite une validation
   */
  private async handleValidation(event: IndexationEvent): Promise<void> {
    try {
      const { proposalId, payload } = event;
      const { validatedBy } = payload;
      
      console.log(`[ValidationBridge] Traitement validation ${proposalId}`);
      
      // Mettre à jour le statut de la proposition
      await this.proposalService.processValidation(
        proposalId,
        'validated',
        validatedBy
      );
      
      // Appliquer l'indexation au contrat
      const proposal = await this.proposalService.getProposal(proposalId);
      if (proposal) {
        await this.applyService.applyIndexation(proposal);
      }
      
      console.log(`[ValidationBridge] Validation ${proposalId} appliquée`);
    } catch (error) {
      console.error('[ValidationBridge] Erreur traitement validation:', error);
      throw error;
    }
  }

  /**
   * Traite un rejet
   */
  private async handleRejection(event: IndexationEvent): Promise<void> {
    try {
      const { proposalId, payload } = event;
      const { validatedBy, reason } = payload;
      
      console.log(`[ValidationBridge] Traitement rejet ${proposalId}`);
      
      // Mettre à jour le statut de la proposition
      await this.proposalService.processValidation(
        proposalId,
        'rejected',
        validatedBy,
        reason
      );
      
      // Notifier le rejet (optionnel)
      await this.notifyRejection(proposalId, reason);
      
      console.log(`[ValidationBridge] Rejet ${proposalId} traité`);
    } catch (error) {
      console.error('[ValidationBridge] Erreur traitement rejet:', error);
      throw error;
    }
  }

  /**
   * Enregistre un handler d'événement
   */
  on(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Émet un événement
   */
  emit(eventType: string, event: IndexationEvent): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Erreur handler ${eventType}:`, error);
      }
    });
  }

  /**
   * Reçoit un événement du workflow externe
   */
  async receiveWorkflowEvent(event: IndexationEvent): Promise<void> {
    console.log(`[ValidationBridge] Événement reçu: ${event.type}`);
    
    // Vérifier l'idempotence
    if (await this.isEventProcessed(event)) {
      console.log(`[ValidationBridge] Événement ${event.type} déjà traité`);
      return;
    }
    
    // Émettre l'événement aux handlers internes
    this.emit(event.type, event);
    
    // Marquer l'événement comme traité
    await this.markEventProcessed(event);
  }

  /**
   * Vérifie si un événement a déjà été traité (idempotence)
   */
  private async isEventProcessed(event: IndexationEvent): Promise<boolean> {
    // TODO: Vérifier en DB avec traceId
    return false;
  }

  /**
   * Marque un événement comme traité
   */
  private async markEventProcessed(event: IndexationEvent): Promise<void> {
    // TODO: Sauvegarder en DB
    console.log(`Événement ${event.type} marqué comme traité`);
  }

  /**
   * Notifie un rejet
   */
  private async notifyRejection(proposalId: string, reason: string): Promise<void> {
    // TODO: Envoyer notification (email, Teams, etc.)
    console.log(`Notification rejet ${proposalId}: ${reason}`);
  }

  /**
   * Statistiques du pont
   */
  getStats(): {
    eventHandlers: number;
    processedEvents: number;
  } {
    return {
      eventHandlers: this.eventHandlers.size,
      processedEvents: 0 // TODO: Compter depuis DB
    };
  }
}