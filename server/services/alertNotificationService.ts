/**
 * Service de génération et gestion des alertes et notifications
 * Gère tous les types d'alertes selon les règles métier
 */

import { db } from "../db";
import { 
  alerts,
  contracts,
  validationRequests,
  notificationPreferences,
  auditLogs,
  users,
  workflowInstances,
  sapSynchronizations
} from "@shared/schema";
import { eq, and, or, gte, lte, sql } from "drizzle-orm";
import * as cron from 'node-cron';
import { EventEmitter } from 'events';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

interface AlertConfig {
  checkInterval?: string; // Expression cron pour vérifications
  emailConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  teamsWebhookUrl?: string;
  retentionDays?: number; // Durée de conservation des alertes (365 jours par défaut)
}

type AlertType = 'deadline' | 'validation' | 'workflow' | 'sap_error' | 'amount_change' | 'system';
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
type NotificationChannel = 'email' | 'interface' | 'teams';

interface AlertData {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  reference: string;
  referenceId?: string;
  userId?: string;
  metadata?: any;
  isCritical?: boolean;
}

export class AlertNotificationService extends EventEmitter {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private config: AlertConfig;
  private emailTransporter?: nodemailer.Transporter;
  
  constructor(config: AlertConfig = {}) {
    super();
    this.config = {
      checkInterval: config.checkInterval || '0 */15 * * *', // Toutes les 15 minutes
      retentionDays: config.retentionDays || 365,
      ...config
    };
    
    // Configurer le transporteur email si configuré
    if (config.emailConfig) {
      this.emailTransporter = nodemailer.createTransport(config.emailConfig);
    }
  }
  
  /**
   * Démarre le service d'alertes
   */
  async start(): Promise<void> {
    console.log('Démarrage du service d\'alertes et notifications...');
    
    // Vérification des échéances (J-30, J-7, J-1)
    const deadlineJob = cron.schedule('0 8 * * *', async () => {
      await this.checkDeadlines();
    });
    this.scheduledJobs.set('deadlines', deadlineJob);
    
    // Vérification des workflows bloqués (>24h)
    const workflowJob = cron.schedule('0 */4 * * *', async () => {
      await this.checkBlockedWorkflows();
    });
    this.scheduledJobs.set('workflows', workflowJob);
    
    // Vérification des erreurs SAP
    const sapJob = cron.schedule('0 */2 * * *', async () => {
      await this.checkSapErrors();
    });
    this.scheduledJobs.set('sap', sapJob);
    
    // Nettoyage des alertes anciennes
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldAlerts();
    });
    this.scheduledJobs.set('cleanup', cleanupJob);
    
    console.log('✓ Service d\'alertes démarré - Vérifications périodiques activées');
    
    // Première vérification immédiate
    await this.runAllChecks();
  }
  
  /**
   * Arrête le service
   */
  stop(): void {
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      console.log(`Job ${name} arrêté`);
    });
    this.scheduledJobs.clear();
    console.log('Service d\'alertes arrêté');
  }
  
  /**
   * Effectue toutes les vérifications
   */
  async runAllChecks(): Promise<void> {
    try {
      await Promise.all([
        this.checkDeadlines(),
        this.checkBlockedWorkflows(),
        this.checkSapErrors()
      ]);
    } catch (error) {
      console.error('Erreur lors des vérifications d\'alertes:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Vérifie les échéances à venir (J-30, J-7, J-1)
   */
  async checkDeadlines(): Promise<void> {
    console.log('Vérification des échéances...');
    const now = new Date();
    const j1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const j7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const j30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    try {
      // Récupérer tous les contrats actifs
      const activeContracts = db?.select
        ? await db.select()
            .from(contracts)
            .where(eq(contracts.status, 'active'))
        : [];
      
      for (const contract of activeContracts) {
        if (!contract.endDate) continue;
        
        const daysUntilEnd = Math.ceil(
          (contract.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        
        // Déterminer le niveau d'alerte
        let shouldAlert = false;
        let severity: AlertSeverity = 'low';
        let message = '';
        
        if (daysUntilEnd === 1) {
          shouldAlert = true;
          severity = 'critical';
          message = `URGENT: Le contrat ${contract.number} expire demain !`;
        } else if (daysUntilEnd === 7) {
          shouldAlert = true;
          severity = 'high';
          message = `Le contrat ${contract.number} expire dans 7 jours`;
        } else if (daysUntilEnd === 30) {
          shouldAlert = true;
          severity = 'medium';
          message = `Le contrat ${contract.number} expire dans 30 jours`;
        }
        
        if (shouldAlert) {
          // Vérifier si une alerte similaire existe déjà aujourd'hui
          const existingAlert = await db.select()
            .from(alerts)
            .where(
              and(
                eq(alerts.contractNumber, contract.number),
                eq(alerts.type, 'deadline'),
                gte(alerts.createdAt, new Date(now.toDateString()))
              )
            )
            .limit(1);
          
          if (existingAlert.length === 0) {
            await this.createAlert({
              type: 'deadline',
              severity,
              title: `Échéance contrat J-${daysUntilEnd}`,
              message,
              reference: contract.number,
              referenceId: contract.id,
              isCritical: daysUntilEnd <= 1,
              metadata: {
                contractTitle: contract.title,
                endDate: contract.endDate,
                daysRemaining: daysUntilEnd
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des échéances:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Vérifie les workflows en retard
   */
  async checkWorkflowDelays(): Promise<void> {
    await this.checkBlockedWorkflows();
  }
  
  /**
   * Vérifie les workflows bloqués depuis plus de 24h
   */
  async checkBlockedWorkflows(): Promise<void> {
    console.log('Vérification des workflows bloqués...');
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    try {
      // Récupérer les validations en attente depuis plus de 24h
      const blockedValidations = db?.select
        ? await db.select()
            .from(validationRequests)
            .where(
              and(
                eq(validationRequests.status, 'pending'),
                lte(validationRequests.createdAt, twentyFourHoursAgo)
              )
            )
        : [];
      
      for (const validation of blockedValidations) {
        const hoursBlocked = Math.ceil(
          (now.getTime() - validation.createdAt.getTime()) / (60 * 60 * 1000)
        );
        
        // Créer une alerte si elle n'existe pas déjà
        const existingAlert = await db.select()
          .from(alerts)
          .where(
            and(
              eq(alerts.contractNumber, validation.reference),
              eq(alerts.type, 'workflow'),
              gte(alerts.createdAt, new Date(now.toDateString()))
            )
          )
          .limit(1);
        
        if (existingAlert.length === 0) {
          await this.createAlert({
            type: 'workflow',
            severity: hoursBlocked > 48 ? 'critical' : 'high',
            title: `Workflow bloqué depuis ${hoursBlocked}h`,
            message: `La demande de validation "${validation.subject}" est en attente depuis ${hoursBlocked} heures`,
            reference: validation.reference,
            referenceId: validation.id,
            isCritical: hoursBlocked > 48,
            userId: validation.assignedTo,
            metadata: {
              validationType: validation.type,
              requestedBy: validation.requestedBy,
              hoursBlocked
            }
          });
        }
      }
      
      // Vérifier aussi les workflow instances
      const blockedWorkflows = await db.select()
        .from(workflowInstances)
        .where(
          and(
            eq(workflowInstances.status, 'in_progress'),
            lte(workflowInstances.startedAt, twentyFourHoursAgo)
          )
        );
      
      for (const workflow of blockedWorkflows) {
        const hoursBlocked = Math.ceil(
          (now.getTime() - workflow.startedAt!.getTime()) / (60 * 60 * 1000)
        );
        
        await this.createAlert({
          type: 'workflow',
          severity: 'high',
          title: `Process workflow bloqué`,
          message: `Le workflow pour ${workflow.entityId} est bloqué depuis ${hoursBlocked}h`,
          reference: workflow.entityId,
          referenceId: workflow.id,
          metadata: {
            workflowType: workflow.definitionId,
            currentStep: workflow.currentStep,
            hoursBlocked
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des workflows bloqués:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Vérifie les erreurs de synchronisation SAP
   */
  async checkSapErrors(): Promise<void> {
    console.log('Vérification des erreurs SAP...');
    const now = new Date();
    
    try {
      // Récupérer les synchronisations SAP en erreur
      const sapErrors = await db.select()
        .from(sapSynchronizations)
        .where(eq(sapSynchronizations.status, 'error'));
      
      for (const sapError of sapErrors) {
        // Créer une alerte si elle n'existe pas déjà
        const existingAlert = await db.select()
          .from(alerts)
          .where(
            and(
              eq(alerts.contractNumber, sapError.sapOrderNumber || sapError.contractId),
              eq(alerts.type, 'sap_error'),
              gte(alerts.createdAt, new Date(now.toDateString()))
            )
          )
          .limit(1);
        
        if (existingAlert.length === 0) {
          await this.createAlert({
            type: 'sap_error',
            severity: 'high',
            title: 'Erreur de synchronisation SAP',
            message: `Échec de la synchronisation SAP: ${sapError.errorMessage}`,
            reference: sapError.sapOrderNumber || sapError.contractId,
            referenceId: sapError.id,
            isCritical: true,
            metadata: {
              action: sapError.action,
              direction: sapError.direction,
              retryCount: sapError.retryCount,
              maxRetries: sapError.maxRetries
            }
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des erreurs SAP:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Crée une alerte pour changement de montant significatif
   */
  async createAmountChangeAlert(
    contractId: string,
    contractNumber: string,
    oldAmount: number,
    newAmount: number
  ): Promise<void> {
    const changePercent = ((newAmount - oldAmount) / oldAmount) * 100;
    
    // Vérifier les seuils configurés par les utilisateurs
    const preferences = await db.select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.alertType, 'amount_change'),
          eq(notificationPreferences.enabled, true)
        )
      );
    
    for (const pref of preferences) {
      const threshold = pref.threshold ? parseFloat(pref.threshold) : 10;
      
      if (Math.abs(changePercent) >= threshold) {
        await this.createAlert({
          type: 'amount_change',
          severity: Math.abs(changePercent) >= 20 ? 'high' : 'medium',
          title: `Changement de montant significatif (${changePercent.toFixed(1)}%)`,
          message: `Le montant du contrat ${contractNumber} a changé de ${changePercent.toFixed(1)}%`,
          reference: contractNumber,
          referenceId: contractId,
          userId: pref.userId,
          metadata: {
            oldAmount,
            newAmount,
            changePercent: changePercent.toFixed(2),
            threshold
          }
        });
      }
    }
  }
  
  /**
   * Crée une alerte de validation
   */
  async createValidationAlert(
    validation: any,
    action: 'approved' | 'rejected'
  ): Promise<void> {
    const severity = action === 'rejected' ? 'high' : 'medium';
    const title = action === 'approved' ? 'Validation approuvée' : 'Validation refusée';
    const message = `La demande de validation "${validation.subject}" a été ${
      action === 'approved' ? 'approuvée' : 'refusée'
    }`;
    
    await this.createAlert({
      type: 'validation',
      severity,
      title,
      message,
      reference: validation.reference,
      referenceId: validation.id,
      userId: validation.requestedBy,
      metadata: {
        validationType: validation.type,
        action,
        validatedBy: validation.validatedBy,
        comments: validation.comments
      }
    });
  }
  
  /**
   * Crée une alerte et la distribue selon les préférences
   */
  async createAlert(data: AlertData): Promise<any> {
    try {
      // Préparer les données de l'alerte
      const alertData = {
        id: crypto.randomBytes(16).toString('hex'),
        timestamp: new Date(),
        type: data.type,
        severity: data.severity,
        category: data.type === 'sap_error' ? 'sap_error' : data.type === 'workflow' ? 'workflow_delay' : data.type,
        title: data.title,
        message: data.message,
        contractNumber: data.reference,
        sendStatus: 'pending',
        readStatus: false,
        channel: 'in-app',
        userId: data.userId,
        referenceId: data.referenceId,
        createdAt: new Date()
      };

      // Créer l'alerte dans la base de données si db est disponible
      if (db?.insert) {
        const [dbAlert] = await db.insert(alerts)
          .values(alertData)
          .returning();
        
        // Enregistrer dans l'audit log
        await db.insert(auditLogs)
          .values({
            user: 'system',
            action: 'alert_created',
            traceId: dbAlert.id,
            eventType: 'system',
            eventName: 'alert_creation',
            details: data.message
          });
        
        // Distribuer l'alerte selon les préférences
        await this.distributeAlert(dbAlert, data);
        
        // Émettre l'événement
        this.emit('alert_created', dbAlert);
        console.log(`Alerte créée: ${data.title}`);
        
        return dbAlert;
      } else {
        // Pour les tests, retourner l'objet même s'il n'est pas enregistré
        await this.distributeAlert(alertData, data);
        this.emit('alert_created', alertData);
        console.log(`Alerte créée (mock): ${data.title}`);
        return alertData;
      }
      
    } catch (error) {
      console.error('Erreur lors de la création de l\'alerte:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * Distribue l'alerte selon les préférences utilisateur
   */
  private async distributeAlert(alert: any, data: AlertData): Promise<void> {
    try {
      // Récupérer les préférences de notification
      const preferences = data.userId && db?.select
        ? await db.select()
            .from(notificationPreferences)
            .where(
              and(
                eq(notificationPreferences.userId, data.userId),
                eq(notificationPreferences.alertType, data.type),
                eq(notificationPreferences.enabled, true)
              )
            )
        : [];
    
    // Si alerte critique, forcer tous les canaux
    if (data.isCritical) {
      await Promise.all([
        this.sendEmailNotification(alert, data),
        this.sendTeamsNotification(alert, data),
        // L'interface est déjà notifiée via la base de données
      ]);
    } else {
      // Sinon, respecter les préférences
      for (const pref of preferences) {
        switch (pref.channel) {
          case 'email':
            await this.sendEmailNotification(alert, data);
            break;
          case 'teams':
            await this.sendTeamsNotification(alert, data);
            break;
          // 'interface' est géré automatiquement via la base
        }
      }
    }
    } catch (error) {
      console.error('Erreur distribution alerte:', error);
    }
  }
  
  /**
   * Envoie une notification par email
   */
  private async sendEmailNotification(alert: any, data: AlertData): Promise<void> {
    if (!this.emailTransporter || !data.userId) return;
    
    try {
      // Récupérer l'email de l'utilisateur
      const [user] = db?.select 
        ? await db.select()
            .from(users)
            .where(eq(users.id, data.userId))
            .limit(1)
        : [];
      
      if (!user?.email) return;
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'klyxor@engie.com',
        to: user.email,
        subject: `[KLYXOR] ${data.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: ${data.severity === 'critical' ? '#dc2626' : '#f59e0b'};">
              ${data.title}
            </h2>
            <p>${data.message}</p>
            <p style="color: #6b7280; font-size: 12px;">
              Référence: ${data.reference}<br>
              Date: ${new Date().toLocaleString('fr-FR')}
            </p>
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af;">
              Cet email a été envoyé automatiquement par KLYXOR.
              Connectez-vous pour gérer vos préférences de notification.
            </p>
          </div>
        `
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email envoyé à ${user.email} pour l'alerte ${alert.id}`);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      // Ne pas propager l'erreur pour ne pas bloquer les autres notifications
    }
  }
  
  /**
   * Envoie une notification Teams
   */
  private async sendTeamsNotification(alert: any, data: AlertData): Promise<void> {
    if (!this.config.teamsWebhookUrl) return;
    
    try {
      const color = data.severity === 'critical' ? 'FF0000' : 
                    data.severity === 'high' ? 'FF8800' : 
                    data.severity === 'medium' ? 'FFAA00' : '00AA00';
      
      const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        'themeColor': color,
        'summary': data.title,
        'sections': [{
          'activityTitle': data.title,
          'activitySubtitle': `Alerte ${data.type} - ${data.severity}`,
          'text': data.message,
          'facts': [
            { 'name': 'Référence', 'value': data.reference },
            { 'name': 'Date', 'value': new Date().toLocaleString('fr-FR') }
          ]
        }],
        'potentialAction': [{
          '@type': 'OpenUri',
          'name': 'Voir dans KLYXOR',
          'targets': [{
            'os': 'default',
            'uri': `${process.env.APP_URL || 'http://localhost:5000'}/alerts/${alert.id}`
          }]
        }]
      };
      
      const response = await fetch(this.config.teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log(`Notification Teams envoyée pour l'alerte ${alert.id}`);
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification Teams:', error);
      // Ne pas propager l'erreur
    }
  }
  
  /**
   * Marque une alerte comme lue
   */
  async markAlertAsRead(alertId: string, userId: string): Promise<void> {
    try {
      await db.update(alerts)
        .set({
          readStatus: true,
          sendStatus: 'sent'
        })
        .where(eq(alerts.id, alertId));
      
      await db.insert(auditLogs)
        .values({
          user: userId,
          action: 'alert_read',
          traceId: alertId,
          eventType: 'user',
          eventName: 'alert_marked_read',
          details: 'Alerte marquée comme lue'
        });
      
      this.emit('alert_read', alertId);
      
    } catch (error) {
      console.error('Erreur lors du marquage de l\'alerte:', error);
      throw error;
    }
  }
  
  /**
   * Marque plusieurs alertes comme lues
   */
  async markMultipleAlertsAsRead(alertIds: string[], userId: string): Promise<void> {
    try {
      await db.update(alerts)
        .set({
          readStatus: true,
          sendStatus: 'sent'
        })
        .where(sql`id = ANY(${alertIds})`);
      
      console.log(`${alertIds.length} alertes marquées comme lues`);
      
    } catch (error) {
      console.error('Erreur lors du marquage multiple:', error);
      throw error;
    }
  }
  
  /**
   * Marque plusieurs alertes comme lues (alias pour compatibilité avec les tests)
   */
  async markAlertsAsRead(alertIds: string[]): Promise<void> {
    try {
      await db.update(alerts)
        .set({
          readStatus: true
        })
        .where(sql`id = ANY(${alertIds})`);
      
      console.log(`${alertIds.length} alertes marquées comme lues`);
      
    } catch (error) {
      console.error('Erreur lors du marquage multiple:', error);
      throw error;
    }
  }
  
  /**
   * Traite la queue d'alertes en attente
   */
  async processAlertQueue(): Promise<void> {
    try {
      const pendingAlerts = db?.select
        ? await db.select()
            .from(alerts)
            .where(eq(alerts.sendStatus, 'pending'))
        : [];
      
      for (const alert of pendingAlerts) {
        // Traiter chaque alerte selon son canal
        if (alert.channel === 'email' && alert.userId) {
          await this.sendEmailNotification(alert, alert.userId);
        } else if (alert.channel === 'teams') {
          await this.sendTeamsNotification(alert);
        }
        
        // Marquer comme envoyée
        await db.update(alerts)
          .set({ sendStatus: 'sent' })
          .where(eq(alerts.id, alert.id));
      }
      
      console.log(`${pendingAlerts.length} alertes traitées depuis la queue`);
    } catch (error) {
      console.error('Erreur lors du traitement de la queue d\'alertes:', error);
      throw error;
    }
  }
  
  /**
   * Obtient les statistiques des alertes
   */
  async getAlertStatistics(): Promise<{
    total: number;
    unread: number;
    critical: number;
    warning: number;
    info: number;
    bySeverity: {
      critical: { total: number; unread: number };
      warning: { total: number; unread: number };
      info: { total: number; unread: number };
    };
  }> {
    try {
      const allAlerts = db?.select 
        ? await db.select().from(alerts)
        : [];
      
      const unreadAlerts = allAlerts.filter(a => !a.readStatus);
      const criticalAlerts = allAlerts.filter(a => a.severity === 'critical');
      const warningAlerts = allAlerts.filter(a => a.severity === 'high' || a.severity === 'medium');
      const infoAlerts = allAlerts.filter(a => a.severity === 'low');
      
      return {
        total: allAlerts.length,
        unread: unreadAlerts.length,
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        info: infoAlerts.length,
        bySeverity: {
          critical: {
            total: criticalAlerts.length,
            unread: criticalAlerts.filter(a => !a.readStatus).length
          },
          warning: {
            total: warningAlerts.length,
            unread: warningAlerts.filter(a => !a.readStatus).length
          },
          info: {
            total: infoAlerts.length,
            unread: infoAlerts.filter(a => !a.readStatus).length
          }
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
  
  /**
   * Nettoie les alertes anciennes (>1 an par défaut)
   */
  async cleanupOldAlerts(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays!);
    
    try {
      const result = await db.delete(alerts)
        .where(lte(alerts.createdAt, cutoffDate));
      
      console.log(`Alertes supprimées: ${result.rowCount || 0} (plus anciennes que ${cutoffDate.toDateString()})`);
      
    } catch (error) {
      console.error('Erreur lors du nettoyage des alertes:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Configure les préférences de notification d'un utilisateur
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Array<{
      channel: NotificationChannel;
      alertType: AlertType;
      enabled: boolean;
      threshold?: number;
    }>
  ): Promise<void> {
    try {
      // Supprimer les anciennes préférences
      await db.delete(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));
      
      // Insérer les nouvelles préférences
      if (preferences.length > 0) {
        await db.insert(notificationPreferences)
          .values(preferences.map(pref => ({
            userId,
            channel: pref.channel,
            alertType: pref.alertType,
            enabled: pref.enabled,
            threshold: pref.threshold?.toString()
          })));
      }
      
      console.log(`Préférences de notification mises à jour pour l'utilisateur ${userId}`);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      throw error;
    }
  }
}

// Instance singleton
export const alertService = new AlertNotificationService();