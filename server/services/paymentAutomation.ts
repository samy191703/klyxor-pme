import { pdfGenerator, PaymentProofData } from './pdfGenerator';
import { emailService } from './emailService';
import { storage } from '../storage';
import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '@shared/schema';

export interface PaymentConfirmedEvent {
  paymentId: string;
  invoiceIds: string[];
  amount: number;
  currency: string;
  method: string;
  paymentDate: Date;
  contractId: string;
  payer?: string;
  bankReference?: string;
}

export interface PaymentProofGenerationResult {
  success: boolean;
  proofId?: string;
  pdfPath?: string;
  emailSent?: boolean;
  error?: string;
}

export class PaymentAutomationService {
  private stripeClient: any = null;
  private processingQueue: Map<string, boolean> = new Map();

  /**
   * Configure Stripe
   */
  async configureStripe(apiKey: string): Promise<void> {
    const Stripe = require('stripe');
    this.stripeClient = new Stripe(apiKey);
    console.log('Stripe configuré avec succès');
  }
  
  /**
   * Crée une intention de paiement
   */
  async createPaymentIntent(amount: number, currency: string = 'eur'): Promise<any> {
    if (!this.stripeClient) {
      throw new Error('Stripe non configuré');
    }
    
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100), // Convertir en centimes
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      return paymentIntent;
    } catch (error) {
      console.error('Erreur création payment intent:', error);
      throw error;
    }
  }
  
  /**
   * Crée un abonnement
   */
  async createSubscription(customerId: string, priceId: string): Promise<any> {
    if (!this.stripeClient) {
      throw new Error('Stripe non configuré');
    }
    
    try {
      const subscription = await this.stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      
      return subscription;
    } catch (error) {
      console.error('Erreur création abonnement:', error);
      throw error;
    }
  }
  
  /**
   * Traite un webhook Stripe
   */
  async handleWebhook(payload: any, signature: string): Promise<void> {
    if (!this.stripeClient) {
      throw new Error('Stripe non configuré');
    }
    
    try {
      const event = this.stripeClient.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (error) {
      console.error('Erreur traitement webhook:', error);
      throw error;
    }
  }
  
  /**
   * Gère un paiement réussi
   */
  private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    console.log('Paiement réussi:', paymentIntent.id);
    // Logique de traitement du paiement réussi
  }
  
  /**
   * Gère un échec de paiement
   */
  private async handlePaymentFailure(paymentIntent: any): Promise<void> {
    console.log('Paiement échoué:', paymentIntent.id);
    // Logique de traitement de l'échec
  }
  
  /**
   * Obtient l'historique des paiements
   */
  async getPaymentHistory(customerId?: string): Promise<any[]> {
    if (!this.stripeClient) {
      return [];
    }
    
    try {
      const params: any = { limit: 100 };
      if (customerId) {
        params.customer = customerId;
      }
      
      const payments = await this.stripeClient.paymentIntents.list(params);
      return payments.data;
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      return [];
    }
  }
  
  /**
   * Vérifie le statut d'un paiement
   */
  async getPaymentStatus(paymentIntentId: string): Promise<string> {
    if (!this.stripeClient) {
      throw new Error('Stripe non configuré');
    }
    
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status;
    } catch (error) {
      console.error('Erreur vérification statut:', error);
      throw error;
    }
  }
  
  /**
   * Gère l'événement de paiement confirmé
   * Génère automatiquement les preuves de paiement et les envoie
   */
  async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<PaymentProofGenerationResult[]> {
    const results: PaymentProofGenerationResult[] = [];

    // Vérifier l'idempotence
    const idempotenceKey = `${event.paymentId}_${event.invoiceIds.join('_')}`;
    if (this.processingQueue.has(idempotenceKey)) {
      console.log(`Payment proof already being processed for ${idempotenceKey}`);
      return [{
        success: false,
        error: 'Already processing'
      }];
    }

    this.processingQueue.set(idempotenceKey, true);

    try {
      // Traiter chaque facture séparément (une preuve par facture)
      for (const invoiceId of event.invoiceIds) {
        const result = await this.generateAndSendPaymentProof(event, invoiceId);
        results.push(result);
      }

      return results;
    } finally {
      this.processingQueue.delete(idempotenceKey);
    }
  }

  /**
   * Génère et envoie une preuve de paiement pour une facture spécifique
   */
  private async generateAndSendPaymentProof(
    event: PaymentConfirmedEvent,
    invoiceId: string
  ): Promise<PaymentProofGenerationResult> {
    try {
      // Vérifier si une preuve existe déjà (idempotence)
      const existingProof = await this.checkExistingProof(event.paymentId, invoiceId);
      if (existingProof) {
        return {
          success: false,
          proofId: existingProof.id,
          error: 'Proof already exists'
        };
      }

      // Récupérer les informations du contrat et de la facture
      const contractInfo = await this.getContractInfo(event.contractId);
      const invoiceInfo = await this.getInvoiceInfo(invoiceId);
      
      if (!contractInfo || !invoiceInfo) {
        throw new Error('Contract or invoice not found');
      }

      // Calculer le solde restant (pour les paiements partiels)
      const isPartialPayment = event.amount < invoiceInfo.totalAmount;
      const balanceDue = Math.max(0, invoiceInfo.totalAmount - event.amount);

      // Préparer les données pour la génération du PDF
      const proofData: PaymentProofData = {
        paymentId: event.paymentId,
        invoiceId: invoiceId,
        invoiceNumber: invoiceInfo.number,
        paymentDate: event.paymentDate.toISOString(),
        amount: event.amount,
        currency: event.currency,
        method: event.method,
        beneficiary: contractInfo.beneficiary,
        payer: event.payer,
        bankReference: event.bankReference,
        balanceDue: balanceDue,
        isPartialPayment: isPartialPayment,
        contractName: contractInfo.name,
        contractId: event.contractId,
        entityInfo: {
          name: 'KLYXOR Solutions France',
          siren: '123456789',
          address: '123 Avenue des Champs-Élysées, 75008 Paris',
        },
        legalMentions: 'Document généré automatiquement. Conservation légale : 10 ans.'
      };

      // Générer le PDF
      const pdfBuffer = await pdfGenerator.generatePaymentProof(proofData, 'default');

      // Sauvegarder la preuve en base de données
      const proofRecord = await this.savePaymentProof({
        paymentId: event.paymentId,
        invoiceId: invoiceId,
        pdfData: pdfBuffer,
        generatedAt: new Date(),
        status: 'generated'
      });

      // Récupérer les destinataires email
      const recipients = await this.getRecipientEmails(contractInfo.id);

      if (recipients.length > 0) {
        // Envoyer l'email avec la preuve en pièce jointe
        const emailResult = await emailService.sendPaymentProof(
          recipients,
          {
            ...proofData,
            currentDate: new Date().toISOString(),
            portalLink: `https://klyxor.fr/portal/payment-proofs/${proofRecord.id}`
          },
          pdfBuffer
        );

        // Mettre à jour le statut
        await this.updateProofStatus(proofRecord.id, emailResult.success ? 'sent' : 'send_failed');

        // Logger l'envoi
        await this.logProofSending({
          proofId: proofRecord.id,
          recipients: recipients,
          status: emailResult.success ? 'success' : 'failed',
          messageId: emailResult.messageId,
          error: emailResult.error,
          timestamp: new Date()
        });

        return {
          success: true,
          proofId: proofRecord.id,
          pdfPath: proofRecord.pdfPath,
          emailSent: emailResult.success
        };
      } else {
        // Pas d'email valide, archiver seulement sur le portail
        await this.updateProofStatus(proofRecord.id, 'portal_only');
        
        return {
          success: true,
          proofId: proofRecord.id,
          pdfPath: proofRecord.pdfPath,
          emailSent: false,
          error: 'No valid email recipients'
        };
      }
    } catch (error) {
      console.error('Error generating payment proof:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Génère automatiquement les flux de paiement à partir d'un plan de facturation validé
   */
  async generatePaymentFlowsFromPlan(planId: string): Promise<{ success: boolean; flowsCreated: number }> {
    try {
      // Récupérer le plan de facturation
      const plan = await this.getBillingPlan(planId);
      if (!plan || plan.status !== 'validated') {
        throw new Error('Plan not found or not validated');
      }

      // Générer les flux pour chaque ligne du plan
      let flowsCreated = 0;
      for (const line of plan.lines) {
        const flow = await this.createPaymentFlow({
          planId: planId,
          contractId: plan.contractId,
          dueDate: line.dueDate,
          amount: line.amount,
          currency: plan.currency,
          invoiceRef: line.invoiceRef,
          status: 'generated'
        });
        
        if (flow) {
          flowsCreated++;
        }
      }

      // Synchroniser avec SAP/ERP
      await this.syncFlowsToERP(planId);

      return {
        success: true,
        flowsCreated: flowsCreated
      };
    } catch (error) {
      console.error('Error generating payment flows:', error);
      return {
        success: false,
        flowsCreated: 0
      };
    }
  }

  /**
   * Bloque automatiquement un flux de paiement lors d'un changement de montant non approuvé
   */
  async blockPaymentOnAmountChange(
    flowId: string,
    oldAmount: number,
    newAmount: number,
    modifiedBy: string,
    reason: string
  ): Promise<boolean> {
    try {
      // Créer l'enregistrement de blocage
      const block = await this.createPaymentBlock({
        flowId: flowId,
        amountBefore: oldAmount,
        amountAfter: newAmount,
        blockDate: new Date(),
        modifiedBy: modifiedBy,
        reason: reason,
        status: 'blocked'
      });

      // Mettre à jour le statut du flux
      await this.updateFlowStatus(flowId, 'blocked');

      // Synchroniser avec l'ERP
      await this.syncBlockStatusToERP(flowId, 'BLOCKED');

      // Notifier les validateurs
      const validators = await this.getValidators();
      if (validators.length > 0) {
        await emailService.sendPaymentBlockNotification(
          validators.map(v => v.email),
          {
            flowId: flowId,
            contractName: block.contractName,
            amountBefore: oldAmount,
            amountAfter: newAmount,
            currency: 'EUR',
            dueDate: block.dueDate,
            modifiedBy: modifiedBy,
            reason: reason,
            validationLink: `https://klyxor.fr/payment-blocks/${block.id}`
          }
        );
      }

      return true;
    } catch (error) {
      console.error('Error blocking payment:', error);
      return false;
    }
  }

  /**
   * Débloquer un paiement après validation
   */
  async unblockPayment(blockId: string, validatedBy: string): Promise<boolean> {
    try {
      // Mettre à jour le blocage
      await this.updateBlockStatus(blockId, 'validated', validatedBy);

      // Récupérer les infos du blocage
      const block = await this.getPaymentBlock(blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Mettre à jour le statut du flux
      await this.updateFlowStatus(block.flowId, 'exported_erp');

      // Synchroniser avec l'ERP
      await this.syncBlockStatusToERP(block.flowId, 'AUTHORIZED');

      return true;
    } catch (error) {
      console.error('Error unblocking payment:', error);
      return false;
    }
  }

  // Méthodes helper (à implémenter selon le schéma de base de données)
  private async checkExistingProof(paymentId: string, invoiceId: string): Promise<any> {
    // Implémenter la vérification en base de données
    return null;
  }

  private async getContractInfo(contractId: string): Promise<any> {
    // Récupérer les infos du contrat depuis la base
    return {
      id: contractId,
      name: 'Contrat Test',
      beneficiary: 'KLYXOR Solutions'
    };
  }

  private async getInvoiceInfo(invoiceId: string): Promise<any> {
    // Récupérer les infos de la facture
    return {
      id: invoiceId,
      number: 'FAC-2025-001',
      totalAmount: 10000
    };
  }

  private async savePaymentProof(data: any): Promise<any> {
    // Sauvegarder la preuve en base
    return {
      id: 'PROOF-' + Date.now(),
      pdfPath: '/proofs/' + data.paymentId + '.pdf'
    };
  }

  private async getRecipientEmails(contractId: string): Promise<string[]> {
    // Récupérer les emails des destinataires
    return ['comptabilite@klyxor.fr'];
  }

  private async updateProofStatus(proofId: string, status: string): Promise<void> {
    // Mettre à jour le statut de la preuve
  }

  private async logProofSending(data: any): Promise<void> {
    // Logger l'envoi
  }

  private async getBillingPlan(planId: string): Promise<any> {
    // Récupérer le plan de facturation
    return null;
  }

  private async createPaymentFlow(data: any): Promise<any> {
    // Créer un flux de paiement
    return null;
  }

  private async syncFlowsToERP(planId: string): Promise<void> {
    // Synchroniser avec l'ERP
  }

  private async createPaymentBlock(data: any): Promise<any> {
    // Créer un blocage
    return null;
  }

  private async updateFlowStatus(flowId: string, status: string): Promise<void> {
    // Mettre à jour le statut du flux
  }

  private async syncBlockStatusToERP(flowId: string, status: string): Promise<void> {
    // Synchroniser le statut avec l'ERP
  }

  private async getValidators(): Promise<any[]> {
    // Récupérer les validateurs
    return [];
  }

  private async updateBlockStatus(blockId: string, status: string, validatedBy: string): Promise<void> {
    // Mettre à jour le statut du blocage
  }

  private async getPaymentBlock(blockId: string): Promise<any> {
    // Récupérer le blocage
    return null;
  }
}

export const paymentAutomation = new PaymentAutomationService();