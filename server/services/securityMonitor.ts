/**
 * @module SecurityMonitor
 * @description Service de monitoring de sécurité pour KLYXOR
 * 
 * Gère :
 * - Le suivi des tentatives de connexion échouées
 * - Le verrouillage temporaire des comptes
 * - L'enregistrement des événements de sécurité
 * - Les alertes de sécurité
 * 
 * @author KLYXOR Team
 * @since 1.3.0
 */

import { db } from "../db";
import { securityEvents, users } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";

interface LoginAttempt {
  username: string;
  ip: string;
  timestamp: Date;
  success: boolean;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private failedAttempts: Map<string, LoginAttempt[]> = new Map();
  private lockedAccounts: Map<string, Date> = new Map();
  
  // Configuration
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    // Nettoyer les anciennes tentatives toutes les heures
    if (typeof setInterval !== 'undefined' && process.env.NODE_ENV !== 'test') {
      setInterval(() => this.cleanupOldAttempts(), 60 * 60 * 1000);
    }
  }
  
  /**
   * Enregistre une action utilisateur
   */
  async recordUserAction(userId: string, action: string): Promise<void> {
    try {
      await this.logSecurityEvent({
        type: 'user_action',
        userId,
        ip: '0.0.0.0',
        details: { action }
      });
    } catch (error) {
      console.error('Erreur enregistrement action:', error);
    }
  }
  
  /**
   * Détecte les accès à des heures inhabituelles
   */
  detectUnusualAccessTime(userId: string): boolean {
    const now = new Date();
    const hour = now.getHours();
    // Considérer comme suspect entre 23h et 6h
    return hour >= 23 || hour < 6;
  }
  
  /**
   * Audite un accès aux données
   */
  async auditAccess(accessLog: {
    userId: string;
    resourceId: string;
    action: string;
    timestamp: Date;
    ip: string;
  }): Promise<void> {
    try {
      await this.logSecurityEvent({
        type: 'data_access',
        userId: accessLog.userId,
        ip: accessLog.ip,
        details: {
          resourceId: accessLog.resourceId,
          action: accessLog.action,
          timestamp: accessLog.timestamp
        }
      });
    } catch (error) {
      console.error('Erreur audit accès:', error);
    }
  }
  
  public userLocations: Map<string, string[]> = new Map();
  
  /**
   * Détecte les accès depuis des locations inhabituelles
   */
  detectUnusualLocation(userId: string, location: string): boolean {
    const userHistory = this.userLocations.get(userId) || [];
    if (userHistory.length === 0) {
      this.userLocations.set(userId, [location]);
      return false;
    }
    
    const isUnusual = !userHistory.includes(location);
    if (isUnusual) {
      userHistory.push(location);
      this.userLocations.set(userId, userHistory);
    }
    
    return isUnusual;
  }
  
  /**
   * Enregistre un événement de conformité RGPD
   */
  async logComplianceEvent(event: {
    type: string;
    userId: string;
    action: string;
    details: any;
  }): Promise<void> {
    try {
      await this.logSecurityEvent({
        type: `compliance_${event.type}`,
        userId: event.userId,
        ip: '0.0.0.0',
        details: {
          action: event.action,
          ...event.details
        }
      });
    } catch (error) {
      console.error('Erreur log conformité:', error);
    }
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * @method recordLoginAttempt
   * @description Enregistre une tentative de connexion
   * 
   * @param {string} username - Nom d'utilisateur
   * @param {string} ip - Adresse IP
   * @param {boolean} success - Succès ou échec
   * @returns {Promise<void>}
   */
  async recordLoginAttempt(username: string, ip: string, success: boolean): Promise<void> {
    const attempt: LoginAttempt = {
      username,
      ip,
      timestamp: new Date(),
      success
    };

    // Enregistrer dans la base de données
    await db.insert(securityEvents).values({
      eventType: success ? 'login_success' : 'login_failure',
      userId: null, // On n'a pas l'ID si l'auth échoue
      result: success ? 'success' : 'failure',
      details: {
        username,
        ip,
        userAgent: null,
        timestamp: attempt.timestamp.toISOString()
      },
      ipAddress: ip,
      createdAt: new Date()
    });

    // Si échec, mettre à jour le compteur
    if (!success) {
      const key = `${username}:${ip}`;
      const attempts = this.failedAttempts.get(key) || [];
      attempts.push(attempt);
      
      // Garder seulement les tentatives dans la fenêtre de temps
      const recentAttempts = attempts.filter(
        a => Date.now() - a.timestamp.getTime() < this.ATTEMPT_WINDOW
      );
      
      this.failedAttempts.set(key, recentAttempts);
      
      // Vérifier si on doit verrouiller le compte
      if (recentAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
        await this.lockAccount(username, ip);
      }
    } else {
      // Réinitialiser les tentatives en cas de succès
      const key = `${username}:${ip}`;
      this.failedAttempts.delete(key);
      this.lockedAccounts.delete(key);
    }
  }

  /**
   * Détecte les activités suspectes
   */
  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      const recentEvents = await db.select()
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.userId, userId),
            gte(securityEvents.createdAt, new Date(Date.now() - this.ATTEMPT_WINDOW))
          )
        );
      
      // Détecter les patterns suspects
      const failedLogins = recentEvents.filter(e => e.eventType === 'login_failure').length;
      const differentIPs = new Set(recentEvents.map(e => e.ipAddress)).size;
      
      return failedLogins > 3 || differentIPs > 5;
    } catch (error) {
      console.error('Erreur détection activité suspecte:', error);
      return false;
    }
  }
  
  /**
   * Enregistre un événement de sécurité
   */
  async logSecurityEvent(event: {
    type: string;
    userId?: string;
    ip: string;
    details: any;
  }): Promise<void> {
    try {
      await db.insert(securityEvents).values({
        eventType: event.type,
        userId: event.userId,
        ipAddress: event.ip,
        details: event.details,
        result: 'logged',
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Erreur enregistrement événement:', error);
    }
  }
  
  /**
   * Obtient les statistiques de sécurité
   */
  async getSecurityStats(): Promise<{
    failedLogins: number;
    suspiciousActivities: number;
    lockedAccounts: number;
  }> {
    try {
      const allEvents = await db.select()
        .from(securityEvents)
        .where(gte(securityEvents.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
      
      return {
        failedLogins: allEvents.filter(e => e.eventType === 'login_failure').length,
        suspiciousActivities: allEvents.filter(e => e.eventType === 'suspicious_activity').length,
        lockedAccounts: this.lockedAccounts.size
      };
    } catch (error) {
      console.error('Erreur statistiques sécurité:', error);
      return { failedLogins: 0, suspiciousActivities: 0, lockedAccounts: 0 };
    }
  }
  
  /**
   * @method isAccountLocked
   * @description Vérifie si un compte est verrouillé
   * 
   * @param {string} username - Nom d'utilisateur
   * @param {string} ip - Adresse IP
   * @returns {boolean} True si verrouillé
   */
  isAccountLocked(username: string, ip: string): boolean {
    const key = `${username}:${ip}`;
    const lockTime = this.lockedAccounts.get(key);
    
    if (!lockTime) return false;
    
    // Vérifier si le verrouillage a expiré
    if (Date.now() - lockTime.getTime() > this.LOCKOUT_DURATION) {
      this.lockedAccounts.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * @method getRemainingLockTime
   * @description Récupère le temps restant de verrouillage en minutes
   * 
   * @param {string} username - Nom d'utilisateur
   * @param {string} ip - Adresse IP
   * @returns {number} Minutes restantes
   */
  getRemainingLockTime(username: string, ip: string): number {
    const key = `${username}:${ip}`;
    const lockTime = this.lockedAccounts.get(key);
    
    if (!lockTime) return 0;
    
    const remaining = this.LOCKOUT_DURATION - (Date.now() - lockTime.getTime());
    return Math.ceil(remaining / 60000); // Convertir en minutes
  }

  /**
   * @method getFailedAttemptCount
   * @description Récupère le nombre de tentatives échouées
   * 
   * @param {string} username - Nom d'utilisateur
   * @param {string} ip - Adresse IP
   * @returns {number} Nombre de tentatives
   */
  getFailedAttemptCount(username: string, ip: string): number {
    const key = `${username}:${ip}`;
    const attempts = this.failedAttempts.get(key) || [];
    
    // Filtrer les tentatives récentes
    const recentAttempts = attempts.filter(
      a => Date.now() - a.timestamp.getTime() < this.ATTEMPT_WINDOW
    );
    
    return recentAttempts.length;
  }

  /**
   * @method lockAccount
   * @private
   * @description Verrouille un compte temporairement
   * 
   * @param {string} username - Nom d'utilisateur
   * @param {string} ip - Adresse IP
   */
  private async lockAccount(username: string, ip: string): Promise<void> {
    const key = `${username}:${ip}`;
    this.lockedAccounts.set(key, new Date());
    
    // Enregistrer l'événement
    await db.insert(securityEvents).values({
      eventType: 'account_locked',
      userId: null,
      result: 'locked',
      details: {
        username,
        ip,
        reason: `${this.MAX_FAILED_ATTEMPTS} tentatives échouées`,
        lockDuration: `${this.LOCKOUT_DURATION / 60000} minutes`
      },
      ipAddress: ip,
      createdAt: new Date()
    });
    
    console.warn(`⚠️ Compte verrouillé: ${username} depuis IP ${ip}`);
  }

  /**
   * @method cleanupOldAttempts
   * @private
   * @description Nettoie les anciennes tentatives de connexion
   */
  private cleanupOldAttempts(): void {
    const now = Date.now();
    
    // Nettoyer les tentatives expirées
    for (const [key, attempts] of Array.from(this.failedAttempts.entries())) {
      const recentAttempts = attempts.filter(
        (a: LoginAttempt) => now - a.timestamp.getTime() < this.ATTEMPT_WINDOW
      );
      
      if (recentAttempts.length === 0) {
        this.failedAttempts.delete(key);
      } else {
        this.failedAttempts.set(key, recentAttempts);
      }
    }
    
    // Nettoyer les verrouillages expirés
    for (const [key, lockTime] of Array.from(this.lockedAccounts.entries())) {
      if (now - lockTime.getTime() > this.LOCKOUT_DURATION) {
        this.lockedAccounts.delete(key);
      }
    }
  }

  /**
   * @method getSecurityStats
   * @description Récupère les statistiques de sécurité
   * 
   * @returns {Object} Statistiques
   */
  async getSecurityStats(): Promise<any> {
    const stats = {
      activeFailedAttempts: this.failedAttempts.size,
      lockedAccounts: this.lockedAccounts.size,
      failedAttemptDetails: Array.from(this.failedAttempts.entries()).map(([key, attempts]) => ({
        key,
        count: attempts.length,
        lastAttempt: attempts[attempts.length - 1]?.timestamp
      })),
      lockedAccountDetails: Array.from(this.lockedAccounts.entries()).map(([key, lockTime]) => {
        const [username, ip] = key.split(':');
        return {
          key,
          lockedAt: lockTime,
          remainingMinutes: this.getRemainingLockTime(username, ip)
        };
      })
    };
    
    return stats;
  }
}

export const securityMonitor = SecurityMonitor.getInstance();