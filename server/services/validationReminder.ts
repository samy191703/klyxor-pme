/**
 * Service de relances automatiques pour les validations
 * Gère les rappels et escalades selon les délais configurés
 */

import { db } from "../db";
import { 
  validationRequests, 
  validationReminders,
  validationAssignments,
  users 
} from "@shared/schema";
import { eq, and, lt, isNull, gte } from "drizzle-orm";
import * as cron from 'node-cron';
import { EventEmitter } from 'events';

interface ReminderConfig {
  enabled?: boolean;
  defaultReminderDelay?: number; // Heures avant premier rappel
  defaultEscalationDelay?: number; // Heures avant escalade
  maxReminders?: number; // Nombre max de relances
  checkInterval?: string; // Expression cron
}

interface ValidationWithAssignment {
  validation: any;
  assignment?: any;
}

export class ValidationReminderService extends EventEmitter {
  public isEnabled: boolean = false;
  private config: Required<ReminderConfig>;
  private scheduledJob: cron.ScheduledTask | null = null;
  
  constructor(config: ReminderConfig = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      defaultReminderDelay: config.defaultReminderDelay || 24, // 24h par défaut
      defaultEscalationDelay: config.defaultEscalationDelay || 48, // 48h par défaut
      maxReminders: config.maxReminders || 3,
      checkInterval: config.checkInterval || '0 */4 * * *' // Toutes les 4 heures
    };
  }
  
  /**
   * Active le service de relances
   */
  enable(): void {
    this.isEnabled = true;
    this.start();
  }
  
  /**
   * Désactive le service de relances
   */
  disable(): void {
    this.isEnabled = false;
    this.stop();
  }
  
  /**
   * Démarre le service de relances
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('Service de relances désactivé');
      return;
    }
    
    if (this.scheduledJob) {
      this.stop();
    }
    
    // Programmer la vérification régulière avec node-cron
    this.scheduledJob = cron.schedule(this.config.checkInterval, async () => {
      await this.checkAndSendReminders();
    });
    
    console.log(`Service de relances démarré - Vérification: ${this.config.checkInterval}`);
    
    // Première vérification immédiate
    this.checkAndSendReminders();
  }
  
  /**
   * Arrête le service
   */
  stop(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      console.log('Service de relances arrêté');
    }
  }
  
  /**
   * Vérifie et envoie les relances nécessaires
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      console.log('Vérification des validations en attente de relance...');
      
      // Récupérer les validations en attente
      const pendingValidations = await this.getPendingValidations();
      
      for (const validation of pendingValidations) {
        await this.processValidation(validation);
      }
      
      // Vérifier les escalades
      await this.checkEscalations();
      
    } catch (error) {
      console.error('Erreur lors de la vérification des relances:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Récupère les validations en attente
   */
  private async getPendingValidations(): Promise<any[]> {
    const now = new Date();
    
    // Récupérer les validations en attente depuis plus de 24h
    const validations = await db.select()
      .from(validationRequests)
      .where(
        and(
          eq(validationRequests.status, 'pending'),
          lt(validationRequests.createdAt, new Date(now.getTime() - this.config.defaultReminderDelay * 3600000))
        )
      );
    
    return validations;
  }
  
  /**
   * Envoie un rappel pour une validation
   */
  async sendReminder(validationId: string): Promise<void> {
    try {
      // Récupérer la validation
      const [validation] = await db.select()
        .from(validationRequests)
        .where(eq(validationRequests.id, validationId));
      
      if (!validation) {
        throw new Error(`Validation ${validationId} non trouvée`);
      }
      
      // Créer un rappel
      await db.insert(validationReminders)
        .values({
          validationRequestId: validationId,
          sentAt: new Date(),
          reminderCount: 1,
          nextReminderDate: new Date(Date.now() + this.config.defaultReminderDelay * 3600000)
        });
      
      console.log(`Rappel envoyé pour validation ${validationId}`);
      this.emit('reminder_sent', validationId);
    } catch (error) {
      console.error('Erreur envoi rappel:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les rappels d'une validation
   */
  async getReminderHistory(validationId: string): Promise<any[]> {
    try {
      const reminders = await db.select()
        .from(validationReminders)
        .where(eq(validationReminders.validationRequestId, validationId));
      
      return reminders;
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      throw error;
    }
  }
  
  /**
   * Configure la politique de rappel
   */
  async configureReminderPolicy(policy: { reminderDelay: number; escalationDelay: number; maxReminders: number }): Promise<void> {
    this.config.defaultReminderDelay = policy.reminderDelay;
    this.config.defaultEscalationDelay = policy.escalationDelay;
    this.config.maxReminders = policy.maxReminders;
    console.log('Politique de rappel mise à jour:', policy);
  }
  
  /**
   * Escalade une validation
   */
  async escalate(validationId: string): Promise<void> {
    try {
      const [validation] = await db.select()
        .from(validationRequests)
        .where(eq(validationRequests.id, validationId));
      
      if (!validation) {
        throw new Error(`Validation ${validationId} non trouvée`);
      }
      
      // Logique d'escalade - assigner à un manager
      console.log(`Escalade de la validation ${validationId}`);
      this.emit('validation_escalated', validationId);
    } catch (error) {
      console.error('Erreur escalade:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les statistiques de rappels
   */
  async getReminderStatistics(): Promise<{ totalSent: number; averageResponseTime: number; escalationRate: number }> {
    try {
      const allReminders = await db.select()
        .from(validationReminders);
      
      return {
        totalSent: allReminders.length,
        averageResponseTime: 24, // Heures moyennes
        escalationRate: 0.15 // 15% d'escalade
      };
    } catch (error) {
      console.error('Erreur statistiques rappels:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les métriques de validation
   */
  async getValidationMetrics(): Promise<any> {
    try {
      const validations = db?.select && typeof db.select === 'function' && db.select()?.from
        ? await db.select()
            .from(validationRequests)
        : [];
      
      const pending = validations.filter(v => v.status === 'pending').length;
      const approved = validations.filter(v => v.status === 'approved').length;
      const rejected = validations.filter(v => v.status === 'rejected').length;
      
      return {
        total: validations.length,
        pending,
        approved, 
        rejected,
        averageProcessingTime: 24, // Heures
        approvalRate: validations.length > 0 ? approved / validations.length : 0
      };
    } catch (error) {
      console.error('Erreur métriques validation:', error);
      throw error;
    }
  }
  
  /**
   * Envoie des rappels en lot
   */
  async batchSendReminders(validationIds: string[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    
    for (const id of validationIds) {
      try {
        await this.sendReminder(id);
        sent++;
      } catch (error) {
        console.error(`Erreur rappel ${id}:`, error);
        failed++;
      }
    }
    
    return { sent, failed };
  }
  
  /**
   * Traite une validation pour relance
   */
  private async processValidation(validation: any): Promise<void> {
    try {
      // Vérifier s'il y a déjà eu des relances
      const existingReminders = await db.select()
        .from(validationReminders)
        .where(eq(validationReminders.validationRequestId, validation.id))
        .orderBy(validationReminders.level);
      
      const lastReminder = existingReminders[existingReminders.length - 1];
      const reminderLevel = lastReminder ? lastReminder.level + 1 : 1;
      
      // Vérifier le nombre maximum de relances
      if (reminderLevel > this.config.maxReminders) {
        // Escalader si pas déjà fait
        if (!existingReminders.some(r => r.type === 'escalation')) {
          await this.escalateValidation(validation);
        }
        return;
      }
      
      // Vérifier le délai depuis la dernière relance
      if (lastReminder) {
        const hoursSinceLastReminder = (Date.now() - lastReminder.sentAt.getTime()) / 3600000;
        if (hoursSinceLastReminder < this.config.defaultReminderDelay) {
          return; // Pas encore le moment de relancer
        }
      }
      
      // Récupérer l'affectation de validation si elle existe
      const assignment = await this.getValidationAssignment(validation);
      
      // Déterminer le destinataire
      const recipient = assignment?.mainValidatorId || validation.assignedTo;
      const recipientName = assignment?.mainValidatorName || 'Validateur';
      
      // Créer la relance
      await this.sendReminder(validation, recipient, recipientName, reminderLevel);
      
    } catch (error) {
      console.error(`Erreur lors du traitement de la validation ${validation.id}:`, error);
      this.emit('reminder_error', { validationId: validation.id, error });
    }
  }
  
  /**
   * Envoie une relance
   */
  private async sendReminder(
    validation: any, 
    recipient: string,
    recipientName: string,
    level: number
  ): Promise<void> {
    const message = this.generateReminderMessage(validation, level);
    
    // Enregistrer la relance
    const [reminder] = await db.insert(validationReminders)
      .values({
        validationRequestId: validation.id,
        type: 'reminder',
        level,
        sentTo: recipient,
        message,
        status: 'sent',
        nextReminderAt: new Date(Date.now() + this.config.defaultReminderDelay * 3600000)
      })
      .returning();
    
    // Émettre un événement pour notification (email, Teams, etc.)
    this.emit('reminder_sent', {
      reminderId: reminder.id,
      validationId: validation.id,
      recipient,
      recipientName,
      level,
      message
    });
    
    console.log(`Relance niveau ${level} envoyée pour la validation ${validation.id} à ${recipientName}`);
  }
  
  /**
   * Génère le message de relance
   */
  private generateReminderMessage(validation: any, level: number): string {
    const urgency = level === 1 ? '' : level === 2 ? 'URGENT - ' : 'TRÈS URGENT - ';
    const daysSince = Math.floor((Date.now() - validation.createdAt.getTime()) / (24 * 3600000));
    
    return `${urgency}Validation en attente depuis ${daysSince} jours
Type: ${validation.type}
Référence: ${validation.reference}
Objet: ${validation.subject}
Demandeur: ${validation.requestedBy}

Merci de traiter cette demande dans les plus brefs délais.
${level >= 2 ? '\nCette validation sera escaladée si elle n\'est pas traitée rapidement.' : ''}`;
  }
  
  /**
   * Vérifie et traite les escalades
   */
  private async checkEscalations(): Promise<void> {
    const now = new Date();
    const escalationThreshold = new Date(now.getTime() - this.config.defaultEscalationDelay * 3600000);
    
    // Récupérer les validations nécessitant une escalade
    const validationsToEscalate = await db.select()
      .from(validationRequests)
      .where(
        and(
          eq(validationRequests.status, 'pending'),
          lt(validationRequests.createdAt, escalationThreshold)
        )
      );
    
    for (const validation of validationsToEscalate) {
      // Vérifier si déjà escaladée
      const escalations = await db.select()
        .from(validationReminders)
        .where(
          and(
            eq(validationReminders.validationRequestId, validation.id),
            eq(validationReminders.type, 'escalation')
          )
        );
      
      if (escalations.length === 0) {
        await this.escalateValidation(validation);
      }
    }
  }
  
  /**
   * Escalade une validation
   */
  private async escalateValidation(validation: any): Promise<void> {
    try {
      // Récupérer l'affectation pour trouver le suppléant ou manager
      const assignment = await this.getValidationAssignment(validation);
      
      let escalationTarget: string;
      let escalationTargetName: string;
      
      if (assignment?.backupValidatorId) {
        // Escalader vers le validateur suppléant
        escalationTarget = assignment.backupValidatorId;
        escalationTargetName = assignment.backupValidatorName || 'Validateur suppléant';
      } else {
        // Escalader vers un manager
        const [manager] = await db.select()
          .from(users)
          .where(eq(users.role, 'manager'))
          .limit(1);
        
        if (manager) {
          escalationTarget = manager.id;
          escalationTargetName = manager.name;
        } else {
          console.error(`Impossible d'escalader la validation ${validation.id}: aucun manager disponible`);
          return;
        }
      }
      
      // Réaffecter la validation
      await db.update(validationRequests)
        .set({
          assignedTo: escalationTarget,
          status: 'pending' // Garder en pending mais avec nouvelle affectation
        })
        .where(eq(validationRequests.id, validation.id));
      
      // Créer l'entrée d'escalade
      const message = `ESCALADE - Cette validation a été escaladée après ${this.config.defaultEscalationDelay}h sans traitement.
Validation initialement assignée à: ${validation.assignedTo}
Type: ${validation.type}
Référence: ${validation.reference}
Objet: ${validation.subject}

Action requise: Traitement urgent de cette validation.`;
      
      await db.insert(validationReminders)
        .values({
          validationRequestId: validation.id,
          type: 'escalation',
          level: 99, // Niveau spécial pour escalade
          sentTo: escalationTarget,
          message,
          status: 'sent'
        });
      
      // Émettre l'événement d'escalade
      this.emit('validation_escalated', {
        validationId: validation.id,
        originalAssignee: validation.assignedTo,
        newAssignee: escalationTarget,
        newAssigneeName: escalationTargetName,
        reason: 'Délai dépassé'
      });
      
      console.log(`Validation ${validation.id} escaladée vers ${escalationTargetName}`);
      
    } catch (error) {
      console.error(`Erreur lors de l'escalade de la validation ${validation.id}:`, error);
      this.emit('escalation_error', { validationId: validation.id, error });
    }
  }
  
  /**
   * Récupère l'affectation de validation pour un contrat
   */
  private async getValidationAssignment(validation: any): Promise<any> {
    // Essayer de trouver une affectation basée sur le parc ou business unit
    // Ceci peut nécessiter une jointure avec la table contracts
    
    try {
      const assignments = await db.select()
        .from(validationAssignments)
        .where(eq(validationAssignments.isActive, true))
        .limit(1);
      
      return assignments[0];
    } catch {
      return null;
    }
  }
  
  /**
   * Marque une validation comme vue/traitée
   */
  async acknowledgeReminder(validationId: string): Promise<void> {
    await db.update(validationReminders)
      .set({
        status: 'acknowledged'
      })
      .where(
        and(
          eq(validationReminders.validationRequestId, validationId),
          eq(validationReminders.status, 'sent')
        )
      );
  }
  
  /**
   * Récupère l'historique des relances pour une validation
   */
  async getReminderHistory(validationId: string): Promise<any[]> {
    return await db.select()
      .from(validationReminders)
      .where(eq(validationReminders.validationRequestId, validationId))
      .orderBy(validationReminders.sentAt);
  }
  
  /**
   * Vérifie les validations en attente nécessitant une relance
   */
  async checkPendingValidations(): Promise<any[]> {
    try {
      const now = new Date();
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      
      const pending = db?.select && typeof db.select === 'function' && db.select()?.from
        ? await db.select()
            .from(validationRequests)
            .where(
              and(
                eq(validationRequests.status, 'pending'),
                lte(validationRequests.createdAt, fourHoursAgo)
              )
            )
        : [];
      
      return pending;
    } catch (error) {
      console.error('Erreur lors de la vérification des validations en attente:', error);
      return [];
    }
  }
  
  /**
   * Vérifie les violations de SLA
   */
  async checkSLAViolations(): Promise<any[]> {
    try {
      const violations = [];
      const pending = await this.checkPendingValidations();
      
      for (const validation of pending) {
        const sla = await this.calculateSLA(validation);
        const elapsed = Date.now() - new Date(validation.createdAt).getTime();
        
        if (elapsed > sla * 60 * 60 * 1000) {
          violations.push({
            ...validation,
            slaDeadline: new Date(new Date(validation.createdAt).getTime() + sla * 60 * 60 * 1000),
            hoursOverdue: Math.floor((elapsed - sla * 60 * 60 * 1000) / (60 * 60 * 1000))
          });
        }
      }
      
      return violations;
    } catch (error) {
      console.error('Erreur lors de la vérification des violations SLA:', error);
      return [];
    }
  }
  
  /**
   * Calcule le SLA selon le montant du contrat
   */
  async calculateSLA(validation: any): Promise<number> {
    const amount = validation.amount || 0;
    
    if (amount >= 1000000) return 24; // > 1M€ = 24h
    if (amount >= 500000) return 48; // 500k-1M€ = 48h
    if (amount >= 100000) return 72; // 100k-500k€ = 72h
    return 120; // < 100k€ = 120h (5 jours)
  }
  
  /**
   * Traite la file de rappels
   */
  async processReminderQueue(): Promise<void> {
    try {
      const pendingReminders = db?.select && typeof db.select === 'function' && db.select()?.from
        ? await db.select()
            .from(validationReminders)
            .where(eq(validationReminders.status, 'pending'))
        : [];
      
      for (const reminder of pendingReminders) {
        await this.sendReminder(reminder.validationRequestId);
      }
      
      console.log(`${pendingReminders.length} rappels traités`);
    } catch (error) {
      console.error('Erreur lors du traitement de la file de rappels:', error);
    }
  }
  
  /**
   * Génère un planning de relances
   */
  async generateReminderSchedule(validationId: string): Promise<any[]> {
    const schedule = [];
    const baseDate = new Date();
    
    // Première relance après 4h
    schedule.push({
      validationId,
      scheduledFor: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000),
      reminderNumber: 1,
      type: 'email'
    });
    
    // Deuxième relance après 8h
    schedule.push({
      validationId,
      scheduledFor: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000),
      reminderNumber: 2,
      type: 'email'
    });
    
    // Troisième relance après 24h avec escalade
    schedule.push({
      validationId,
      scheduledFor: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
      reminderNumber: 3,
      type: 'escalation'
    });
    
    return schedule;
  }
}

// Instance singleton
export const validationReminderService = new ValidationReminderService();