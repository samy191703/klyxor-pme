/**
 * Service de gestion automatique des transitions d'état des contrats
 * Applique les règles métier pour le cycle de vie des contrats
 */

import { db } from "../db";
import { 
  contracts,
  users,
  stateTransitionRules,
  validationRequests,
  auditLogs 
} from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import * as cron from 'node-cron';
import { EventEmitter } from 'events';

interface TransitionConfig {
  enabled?: boolean;
  checkInterval?: string; // Expression cron pour vérifications périodiques
}

interface TransitionResult {
  success: boolean;
  fromState: string;
  toState: string;
  reason: string;
  contractId: string;
}

export class StateTransitionManager extends EventEmitter {
  public rules: any[] = [];
  public isEnabled: boolean = true;
  private config: Required<TransitionConfig>;
  private scheduledJob: cron.ScheduledTask | null = null;
  private transitionRules: Map<string, any[]> = new Map();
  
  constructor(config: TransitionConfig = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      checkInterval: config.checkInterval || '0 */6 * * *' // Toutes les 6 heures
    };
    
    // Initialiser les règles par défaut uniquement si pas en test
    if (process.env.NODE_ENV !== 'test') {
      this.initializeDefaultRules();
    }
  }
  
  
  /**
   * Applique les transitions automatiques
   */
  async applyAutomaticTransitions(): Promise<void> {
    try {
      const allContracts = db?.select && typeof db.select === 'function'
        ? await db.select()
            .from(contracts)
        : [];
      
      let transitionCount = 0;
      for (const contract of allContracts) {
        const applicableRule = this.findApplicableRule(contract);
        if (applicableRule && applicableRule.autoExecute) {
          await this.transitionContract(contract.id, applicableRule.toState, 'automatic');
          transitionCount++;
        }
      }
      
      console.log(`${transitionCount} transitions automatiques appliquées`);
      this.emit('automatic_transitions_complete', transitionCount);
    } catch (error) {
      console.error('Erreur transitions automatiques:', error);
      throw error;
    }
  }
  
  
  /**
   * Vérifie si une transition est valide
   */
  async isTransitionValid(fromState: string, toState: string): Promise<boolean> {
    const rule = this.rules.find(r => r.fromState === fromState && r.toState === toState);
    return !!rule;
  }
  
  /**
   * Ajoute une règle de transition
   */
  async addRule(rule: any): Promise<void> {
    try {
      await db.insert(stateTransitionRules)
        .values(rule);
      
      await this.loadRules();
      console.log('Nouvelle règle ajoutée:', rule);
    } catch (error) {
      console.error('Erreur ajout règle:', error);
      throw error;
    }
  }
  
  /**
   * Supprime une règle de transition
   */
  async removeRule(ruleId: string): Promise<void> {
    try {
      await db.delete(stateTransitionRules)
        .where(eq(stateTransitionRules.id, ruleId));
      
      await this.loadRules();
      console.log('Règle supprimée:', ruleId);
    } catch (error) {
      console.error('Erreur suppression règle:', error);
      throw error;
    }
  }
  
  /**
   * Trouve une règle applicable pour un contrat
   */
  private findApplicableRule(contract: any): any {
    return this.rules.find(r => 
      r.fromState === contract.status && 
      r.autoExecute
    );
  }
  
  /**
   * Obtient l'historique des transitions
   */
  async getTransitionHistory(contractId: string): Promise<any[]> {
    try {
      const history = await db.select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.traceId, contractId),
            eq(auditLogs.action, 'state_transition')
          )
        );
      
      return history;
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      throw error;
    }
  }
  
  /**
   * Initialise les règles de transition par défaut
   */
  private async initializeDefaultRules(): Promise<void> {
    const defaultRules = [
      // Draft vers pending_validation après création
      {
        fromState: 'draft',
        toState: 'pending_validation',
        condition: 'manual_submit',
        requiresValidation: false,
        autoExecute: false,
        description: 'Soumission du brouillon pour validation'
      },
      
      // Pending_validation vers active après validation
      {
        fromState: 'pending_validation',
        toState: 'active',
        condition: 'validation_approved',
        requiresValidation: true,
        autoExecute: true,
        validatorRole: 'validator',
        description: 'Activation du contrat après validation'
      },
      
      // Pending_validation vers draft si rejeté
      {
        fromState: 'pending_validation',
        toState: 'draft',
        condition: 'validation_rejected',
        requiresValidation: false,
        autoExecute: true,
        description: 'Retour en brouillon après rejet'
      },
      
      // Active vers terminated
      {
        fromState: 'active',
        toState: 'terminated',
        condition: 'termination_approved',
        requiresValidation: true,
        autoExecute: true,
        validatorRole: 'manager',
        description: 'Résiliation du contrat'
      },
      
      // Terminated vers closed après période
      {
        fromState: 'terminated',
        toState: 'closed',
        condition: 'grace_period_expired',
        requiresValidation: false,
        autoExecute: true,
        description: 'Clôture automatique après période de grâce'
      },
      
      // Closed vers archived après 1 an
      {
        fromState: 'closed',
        toState: 'archived',
        condition: 'retention_period_expired',
        requiresValidation: false,
        autoExecute: true,
        description: 'Archivage automatique après période de rétention'
      },
      
      // Active vers closed si date de fin atteinte
      {
        fromState: 'active',
        toState: 'closed',
        condition: 'contract_expired',
        requiresValidation: false,
        autoExecute: true,
        description: 'Clôture automatique à la date de fin'
      }
    ];
    
    // Insérer les règles par défaut si elles n'existent pas
    for (const rule of defaultRules) {
      const existing = await db.select()
        .from(stateTransitionRules)
        .where(
          and(
            eq(stateTransitionRules.fromState, rule.fromState),
            eq(stateTransitionRules.toState, rule.toState),
            eq(stateTransitionRules.condition, rule.condition)
          )
        )
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(stateTransitionRules)
          .values({
            ...rule,
            isActive: true
          });
      }
    }
    
    // Charger les règles en mémoire
    await this.loadRules();
  }
  
  /**
   * Charge les règles de transition depuis la base
   */
  private async loadRules(): Promise<void> {
    const rules = await db.select()
      .from(stateTransitionRules)
      .where(eq(stateTransitionRules.isActive, true));
    
    // Organiser par état de départ
    this.transitionRules.clear();
    for (const rule of rules) {
      if (!this.transitionRules.has(rule.fromState)) {
        this.transitionRules.set(rule.fromState, []);
      }
      this.transitionRules.get(rule.fromState)!.push(rule);
    }
    
    console.log(`${rules.length} règles de transition chargées`);
  }
  
  /**
   * Démarre le gestionnaire de transitions
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Gestionnaire de transitions désactivé');
      return;
    }
    
    if (this.scheduledJob) {
      this.stop();
    }
    
    // Charger les règles
    await this.loadRules();
    
    // Programmer les vérifications périodiques
    this.scheduledJob = cron.schedule(this.config.checkInterval, async () => {
      await this.checkAutomaticTransitions();
    });
    
    console.log(`Gestionnaire de transitions démarré - Vérifications: ${this.config.checkInterval}`);
    
    // Première vérification immédiate
    await this.checkAutomaticTransitions();
  }
  
  /**
   * Arrête le gestionnaire
   */
  stop(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      console.log('Gestionnaire de transitions arrêté');
    }
  }
  
  /**
   * Vérifie et applique les transitions automatiques
   */
  async checkAutomaticTransitions(): Promise<void> {
    try {
      console.log('Vérification des transitions automatiques...');
      
      // Vérifier les contrats expirés
      await this.checkExpiredContracts();
      
      // Vérifier les validations approuvées
      await this.checkApprovedValidations();
      
      // Vérifier les périodes de grâce et rétention
      await this.checkRetentionPeriods();
      
    } catch (error) {
      console.error('Erreur lors de la vérification des transitions:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Vérifie les contrats expirés
   */
  private async checkExpiredContracts(): Promise<void> {
    const now = new Date();
    
    // Récupérer les contrats actifs avec date de fin dépassée
    const expiredContracts = db?.select && typeof db.select === 'function'
      ? await db.select()
          .from(contracts)
          .where(
            and(
              eq(contracts.status, 'active'),
              contracts.endDate ? lt(contracts.endDate, now) : sql`false`
            )
          )
      : [];
    
    for (const contract of expiredContracts) {
      await this.transitionContract(contract.id, 'closed', 'contract_expired');
    }
  }
  
  /**
   * Vérifie les validations approuvées
   */
  private async checkApprovedValidations(): Promise<void> {
    // Récupérer les validations de contrat approuvées
    const approvedValidations = db?.select && typeof db.select === 'function'
      ? await db.select()
          .from(validationRequests)
          .where(
            and(
              eq(validationRequests.type, 'contract'),
              eq(validationRequests.status, 'approved')
            )
          )
      : [];
    
    for (const validation of approvedValidations) {
      // Récupérer le contrat associé
      const [contract] = db?.select && typeof db.select === 'function'
        ? await db.select()
            .from(contracts)
            .where(eq(contracts.id, validation.reference))
        : [];
      
      if (contract && contract.status === 'pending_validation') {
        await this.transitionContract(contract.id, 'active', 'validation_approved');
      }
    }
  }
  
  /**
   * Vérifie les périodes de rétention
   */
  private async checkRetentionPeriods(): Promise<void> {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Contrats terminés depuis plus de 30 jours → closed
    const terminatedContracts = db?.select && typeof db.select === 'function'
      ? await db.select()
          .from(contracts)
          .where(
            and(
              eq(contracts.status, 'terminated'),
              lt(contracts.updatedAt, thirtyDaysAgo)
            )
          )
      : [];
    
    for (const contract of terminatedContracts) {
      await this.transitionContract(contract.id, 'closed', 'grace_period_expired');
    }
    
    // Contrats clôturés depuis plus d'un an → archived
    const closedContracts = db?.select && typeof db.select === 'function'
      ? await db.select()
          .from(contracts)
          .where(
            and(
              eq(contracts.status, 'closed'),
              lt(contracts.updatedAt, oneYearAgo)
            )
          )
      : [];
    
    for (const contract of closedContracts) {
      await this.transitionContract(contract.id, 'archived', 'retention_period_expired');
    }
  }
  
  /**
   * Effectue une transition d'état pour un contrat
   */
  async transitionContract(
    contractId: string,
    toState: string,
    reason: string
  ): Promise<TransitionResult> {
    try {
      // Récupérer le contrat actuel
      const [contract] = await db.select()
        .from(contracts)
        .where(eq(contracts.id, contractId));
      
      if (!contract) {
        throw new Error(`Contrat non trouvé: ${contractId}`);
      }
      
      const fromState = contract.status;
      
      // Vérifier si la transition est autorisée
      const rule = await this.getTransitionRule(fromState, toState, reason);
      if (!rule) {
        throw new Error(`Transition non autorisée: ${fromState} → ${toState} (${reason})`);
      }
      
      // Vérifier si une validation est requise
      if (rule.requiresValidation && reason !== 'validation_approved') {
        // Créer une demande de validation
        await db.insert(validationRequests)
          .values({
            type: 'contract',
            referenceId: contractId,
            reference: contractId,
            subject: `Transition d'état: ${fromState} → ${toState}`,
            requestedBy: 'System',
            assignedTo: 'Manager', // À adapter selon le rôle requis
            status: 'pending'
          });
        
        this.emit('validation_required', {
          contractId,
          fromState,
          toState,
          reason
        });
        
        return {
          success: false,
          fromState,
          toState,
          reason: 'Validation requise',
          contractId
        };
      }
      
      // Effectuer la transition
      await db.update(contracts)
        .set({
          status: toState,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contractId));
      
      // Enregistrer dans l'audit log
      await db.insert(auditLogs)
        .values({
          user: 'system',
          action: 'state_transition',
          fields: 'status',
          before: fromState,
          after: toState,
          traceId: contractId,
          contractNumber: contract.number,
          description: `Transition automatique: ${fromState} → ${toState} (${reason})`,
          ipAddress: '127.0.0.1'
        });
      
      // Émettre l'événement
      this.emit('transition_completed', {
        contractId,
        contractNumber: contract.number,
        fromState,
        toState,
        reason
      });
      
      console.log(`Transition réussie pour ${contract.number}: ${fromState} → ${toState}`);
      
      return {
        success: true,
        fromState,
        toState,
        reason,
        contractId
      };
      
    } catch (error: any) {
      console.error(`Erreur lors de la transition du contrat ${contractId}:`, error);
      this.emit('transition_error', {
        contractId,
        toState,
        reason,
        error: error.message
      });
      
      return {
        success: false,
        fromState: '',
        toState,
        reason: error.message,
        contractId
      };
    }
  }
  
  /**
   * Récupère la règle de transition applicable
   */
  private async getTransitionRule(
    fromState: string,
    toState: string,
    condition: string
  ): Promise<any | null> {
    const rules = this.transitionRules.get(fromState) || [];
    return rules.find(r => 
      r.toState === toState && 
      (r.condition === condition || r.condition === 'any')
    );
  }
  
  /**
   * Vérifie si une transition est possible
   */
  async canTransition(
    contractId: string,
    toState: string
  ): Promise<boolean> {
    try {
      const [contract] = db?.select && typeof db.select === 'function' && db.select()?.from
        ? await db.select()
            .from(contracts)
            .where(eq(contracts.id, contractId))
        : [];
      
      if (!contract) return false;
      
      const rules = this.transitionRules.get(contract.status) || [];
      return rules.some(r => r.toState === toState);
      
    } catch (error) {
      console.error('Erreur lors de la vérification de transition:', error);
      return false;
    }
  }
  
  /**
   * Récupère les transitions possibles pour un contrat
   */
  async getPossibleTransitions(contractId: string): Promise<string[]> {
    try {
      const [contract] = db?.select && typeof db.select === 'function' && db.select()?.from
        ? await db.select()
            .from(contracts)
            .where(eq(contracts.id, contractId))
        : [];
      
      if (!contract) return [];
      
      const rules = this.transitionRules.get(contract.status) || [];
      return [...new Set(rules.map(r => r.toState))];
      
    } catch (error) {
      console.error('Erreur lors de la récupération des transitions:', error);
      return [];
    }
  }
  
  /**
   * Valide une transition
   */
  async validateTransition(contractId: string, fromState: string, toState: string): Promise<{isValid: boolean, reason?: string}> {
    try {
      // Charger les règles si elles ne le sont pas déjà
      if (this.transitionRules.size === 0) {
        await this.loadRules();
      }
      
      const rules = this.transitionRules.get(fromState) || [];
      const rule = rules.find(r => r.toState === toState);
      
      
      if (!rule) {
        return {
          isValid: false,
          reason: `Transition non autorisée de ${fromState} vers ${toState}`
        };
      }
      
      // Vérifier les conditions spécifiques
      if (rule.condition === 'validation_approved' && toState === 'active') {
        // Vérifier s'il y a des approbations
        const [contract] = await db.select()
          .from(contracts)
          .where(eq(contracts.id, contractId));
          
        if (contract) {
          const validations = await db.select()
            .from(validationRequests)
            .where(and(
              eq(validationRequests.referenceId, contractId),
              eq(validationRequests.status, 'approved')
            ));
            
            
          if (validations.length === 0) {
            return {
              isValid: false,
              reason: 'Cette transition nécessite des approbations requises'
            };
          }
        }
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Erreur lors de la validation de transition:', error);
      return {
        isValid: false,
        reason: `Erreur lors de la validation: ${error}`
      };
    }
  }
  
  /**
   * Méthode principale de transition
   */
  async transition(contractId: string, toState: string, trigger: string = 'manual', userId?: string): Promise<any> {
    try {
      // Récupérer le contrat
      const [contract] = db?.select && typeof db.select === 'function' 
        ? await db.select()
            .from(contracts)
            .where(eq(contracts.id, contractId))
        : [];
      
      if (!contract) {
        throw new Error(`Contrat ${contractId} introuvable`);
      }
      
      // Valider la transition
      const validation = await this.validateTransition(contractId, contract.status, toState);
      if (!validation.isValid) {
        throw new Error(validation.reason || `Transition invalide de ${contract.status} vers ${toState}`);
      }
      
      const fromState = contract.status;
      
      // Mettre à jour le contrat
      if (db?.update && typeof db.update === 'function') {
        await db.update(contracts)
          .set({ 
            status: toState,
            updatedAt: new Date()
          })
          .where(eq(contracts.id, contractId));
      }
      
      // Créer l'historique de transition dans auditLogs
      if (db?.insert && typeof db.insert === 'function') {
        await db.insert(auditLogs)
          .values({
            user: userId || 'system',
            action: 'state_transition',
            traceId: `TRANS-${Date.now()}`,
            contractNumber: contract.number,
            description: `Transition de ${fromState} vers ${toState}`,
            fields: JSON.stringify({ contractId, fromState, toState, trigger }),
            before: fromState,
            after: toState,
            createdAt: new Date()
          });
      }

      // Créer automatiquement une demande de validation si on passe en pending_validation
      if (toState === 'pending_validation' && db?.insert && typeof db.insert === 'function') {
        await db.insert(validationRequests)
          .values({
            referenceId: contractId,
            reference: `VAL-${Date.now()}`,
            type: 'contract',
            subject: `Validation du contrat ${contract.number}`,
            status: 'pending',
            requestedBy: userId || 'system',
            assignedTo: 'validator', // TODO: Assigner à un validateur spécifique
            priority: 'normal',
            createdAt: new Date()
          });
      }
      
      // Exécuter les hooks si configurés
      if (this.transitionHooks && this.transitionHooks[`${fromState}_to_${toState}`]) {
        await this.transitionHooks[`${fromState}_to_${toState}`](contract, userId);
      }
      
      return {
        success: true,
        contractId,
        fromState,
        toState,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Erreur lors de la transition:', error);
      
      // Enregistrer l'échec dans auditLogs
      if (db?.insert && typeof db.insert === 'function') {
        await db.insert(auditLogs)
          .values({
            user: userId || 'system',
            action: 'state_transition_failed',
            traceId: `TRANS-FAILED-${Date.now()}`,
            contractNumber: contractId,
            description: `Transition échouée vers ${toState}: ${error.message}`,
            fields: JSON.stringify({ contractId, toState, trigger, error: error.message }),
            before: 'unknown',
            after: toState,
            createdAt: new Date()
          });
      }
      
      throw error;
    }
  }
  
  /**
   * Exécute une transition
   */
  async performTransition(contractId: string, toState: string, userId?: string): Promise<any> {
    return await this.transition(contractId, toState, 'manual', userId);
  }
  
  /**
   * Exécute des transitions en lot
   */
  async batchTransition(contractIds: string[], toState: string, userId?: string): Promise<any[]> {
    const results = [];
    for (const contractId of contractIds) {
      const result = await this.transition(contractId, toState, 'manual', userId);
      results.push(result);
    }
    return results;
  }
  
  /**
   * Récupère les métriques d'état
   */
  async getStateMetrics(): Promise<any> {
    try {
      const allContracts = db?.select && typeof db.select === 'function' && db.select()?.from
        ? await db.select()
            .from(contracts)
        : [];
      
      const metrics = {
        total: allContracts.length,
        byState: {},
        transitions: {
          daily: 0,
          weekly: 0,
          monthly: 0
        }
      };
      
      // Compter par état
      for (const contract of allContracts) {
        metrics.byState[contract.status] = (metrics.byState[contract.status] || 0) + 1;
      }
      
      return metrics;
    } catch (error) {
      console.error('Erreur lors du calcul des métriques:', error);
      return { total: 0, byState: {}, transitions: { daily: 0, weekly: 0, monthly: 0 } };
    }
  }
  
  /**
   * Configure les hooks de transition
   */
  async configureTransitionHooks(hooks: any): Promise<void> {
    // Stocker les hooks pour utilisation ultérieure
    this.transitionHooks = hooks || {};
    console.log('Hooks de transition configurés');
  }
  
  /**
   * Annule une transition
   */
  async rollbackTransition(transitionId: string): Promise<boolean> {
    try {
      // Récupérer l'historique de transition
      const [transition] = db?.select && typeof db.select === 'function' && db.select()?.from
        ? await db.select()
            .from(auditLogs)
            .where(and(
              eq(auditLogs.traceId, transitionId),
              eq(auditLogs.action, 'state_transition')
            ))
        : [];
      
      if (!transition) return false;
      
      // Revenir à l'état précédent
      if (db?.update) {
        await db.update(contracts)
          .set({ status: JSON.parse(transition.fields || '{}').fromState })
          .where(eq(contracts.id, JSON.parse(transition.fields || '{}').contractId));
      }
      
      console.log(`Transition ${transitionId} annulée`);
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'annulation de transition:', error);
      return false;
    }
  }
  
  private transitionHooks: any = {};

  /**
   * Obtient les transitions disponibles pour un contrat
   */
  async getAvailableTransitions(contractId: string): Promise<string[]> {
    try {
      const [contract] = db?.select && typeof db.select === 'function'
        ? await db.select()
            .from(contracts)
            .where(eq(contracts.id, contractId))
        : [];
      
      if (!contract) {
        return [];
      }

      // Transitions possibles selon l'état actuel
      const transitionMap = {
        draft: ['pending_validation', 'cancelled'],
        pending_validation: ['active', 'draft', 'cancelled'],
        active: ['suspended', 'terminated', 'closed'],
        suspended: ['active', 'terminated'],
        terminated: ['closed'],
        closed: [],
        cancelled: []
      };

      return transitionMap[contract.status] || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des transitions disponibles:', error);
      return [];
    }
  }

  /**
   * Vérifie si un utilisateur peut effectuer une transition
   */
  async canUserPerformTransition(userId: string, contractId: string, toState: string): Promise<boolean> {
    try {
      // Récupérer le contrat
      const [contract] = db?.select && typeof db.select === 'function'
        ? await db.select()
            .from(contracts)
            .where(eq(contracts.id, contractId))
        : [];
      
      if (!contract) {
        return false;
      }

      // Récupérer l'utilisateur
      const [user] = db?.select && typeof db.select === 'function'
        ? await db.select()
            .from(users)
            .where(eq(users.id, userId))
        : [];
      
      if (!user) {
        return false;
      }

      // Récupérer les transitions disponibles pour le contrat
      const availableTransitions = await this.getAvailableTransitions(contractId);
      
      // Vérifier si la transition est techniquement possible
      if (!availableTransitions.includes(toState)) {
        return false;
      }
      
      // Vérifier les permissions métier selon le rôle
      const fromState = contract.status;
      
      // Règles métier des permissions :
      switch (fromState) {
        case 'draft':
          // Seuls les managers/créateurs peuvent soumettre pour validation
          if (toState === 'pending_validation') {
            return user.role === 'manager' || user.role === 'admin' || contract.createdBy === userId;
          }
          break;
          
        case 'pending_validation':
          // Seuls les validators peuvent approuver/rejeter
          if (toState === 'active' || toState === 'rejected') {
            return user.role === 'validator' || user.role === 'admin';
          }
          break;
          
        case 'active':
          // Managers peuvent suspendre/terminer, validators peuvent aussi
          if (toState === 'suspended' || toState === 'terminated') {
            return user.role === 'manager' || user.role === 'validator' || user.role === 'admin';
          }
          break;
          
        default:
          // Pour les autres transitions, les admins peuvent tout faire
          return user.role === 'admin';
      }
      
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification de permission de transition:', error);
      return false;
    }
  }
}

// Instance singleton
export const stateTransitionManager = new StateTransitionManager();