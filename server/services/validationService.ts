/**
 * Service de gestion des validations pour les contrats ENGIE
 * Gère le workflow de validation multi-niveaux selon les montants
 */

import { db } from '../db';
import { 
  validationRequests, 
  contracts, 
  auditLogs,
  users,
  type InsertValidationRequest 
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export class ValidationService {
  /**
   * Crée une demande de validation pour un contrat
   */
  async createValidationRequest(data: {
    contractId: string;
    type: 'contract' | 'amendment' | 'indexation' | 'termination' | 'manual_amount';
    requestedBy: string;
    metadata?: any;
  }) {
    // Récupérer le contrat pour déterminer le niveau
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, data.contractId));
    
    if (!contract) {
      throw new Error('Contrat non trouvé');
    }
    
    // Déterminer le niveau de validation selon le montant
    let level = 1;
    if (contract.amount > 100000 && contract.amount <= 500000) {
      level = 2;
    } else if (contract.amount > 500000 && contract.amount <= 1000000) {
      level = 3;
    } else if (contract.amount > 1000000) {
      level = 3; // Niveau max
    }
    
    // Créer la demande de validation
    const [validation] = await db
      .insert(validationRequests)
      .values({
        contractId: data.contractId,
        referenceId: data.contractId, // Le reference_id est souvent le contractId
        type: data.type,
        status: 'pending',
        level,
        requestedBy: data.requestedBy,
        requestedAt: new Date(),
        metadata: JSON.stringify(data.metadata || {})
      })
      .returning();
    
    return validation;
  }

  /**
   * Approuve une demande de validation
   */
  async approveValidation(
    validationId: string,
    userId: string,
    comments?: string
  ) {
    try {
      // Mettre à jour la validation
      const [updated] = await db
        .update(validationRequests)
        .set({
          status: 'approved',
          validatedBy: userId,
          validatedAt: new Date(),
          comments
        })
        .where(eq(validationRequests.id, validationId))
        .returning();
      
      if (!updated) {
        return { success: false, error: 'Validation non trouvée' };
      }
      
      // Si c'est une validation de contrat, activer le contrat
      if (updated.type === 'contract' && updated.contractId) {
        await db
          .update(contracts)
          .set({ status: 'active' })
          .where(eq(contracts.id, updated.contractId));
      }
      
      // Créer un audit log
      await db.insert(auditLogs).values({
        userId,
        entityType: 'validation',
        entityId: validationId,
        action: 'validation_approved',
        details: `Validation approuvée${comments ? `: ${comments}` : ''}`,
        timestamp: new Date()
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Rejette une demande de validation
   */
  async rejectValidation(
    validationId: string,
    userId: string,
    reason: string
  ) {
    try {
      // Mettre à jour la validation
      const [updated] = await db
        .update(validationRequests)
        .set({
          status: 'rejected',
          validatedBy: userId,
          validatedAt: new Date(),
          comments: reason
        })
        .where(eq(validationRequests.id, validationId))
        .returning();
      
      if (!updated) {
        return { success: false, error: 'Validation non trouvée' };
      }
      
      // Si c'est une validation de contrat, remettre en draft
      if (updated.type === 'contract' && updated.contractId) {
        await db
          .update(contracts)
          .set({ status: 'draft' })
          .where(eq(contracts.id, updated.contractId));
      }
      
      // Créer un audit log
      await db.insert(auditLogs).values({
        userId,
        entityType: 'validation',
        entityId: validationId,
        action: 'validation_rejected',
        details: `Validation rejetée: ${reason}`,
        timestamp: new Date()
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Récupère l'historique des validations d'un contrat
   */
  async getValidationHistory(contractId: string) {
    const validations = await db
      .select()
      .from(validationRequests)
      .where(eq(validationRequests.contractId, contractId))
      .orderBy(desc(validationRequests.requestedAt));
    
    return validations;
  }

  /**
   * Calcule la charge de travail par validateur
   */
  async getValidationWorkload() {
    const pendingValidations = await db
      .select({
        validatorId: validationRequests.assignedTo,
        count: db.count()
      })
      .from(validationRequests)
      .where(eq(validationRequests.status, 'pending'))
      .groupBy(validationRequests.assignedTo);
    
    return pendingValidations.map(v => ({
      validatorId: v.validatorId,
      pendingCount: Number(v.count)
    }));
  }

  /**
   * Escalade une validation au niveau supérieur
   */
  async escalateValidation(
    validationId: string,
    userId: string,
    reason: string
  ) {
    try {
      const [validation] = await db
        .select()
        .from(validationRequests)
        .where(eq(validationRequests.id, validationId));
      
      if (!validation) {
        return { success: false, error: 'Validation non trouvée' };
      }
      
      const newLevel = Math.min(validation.level + 1, 3);
      
      await db
        .update(validationRequests)
        .set({
          level: newLevel,
          metadata: JSON.stringify({
            ...JSON.parse(validation.metadata || '{}'),
            escalation: {
              by: userId,
              reason,
              date: new Date().toISOString(),
              previousLevel: validation.level
            }
          })
        })
        .where(eq(validationRequests.id, validationId));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export default new ValidationService();