import { db } from "../db";
import { billingPlans, type InsertBillingPlan } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface BillingSchedule {
  date: Date;
  amount: number;
  description: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue';
}

export interface BillingPlanConfig {
  contractId: string;
  contractAmount: number;
  startDate: Date;
  endDate: Date;
  periodicity: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  paymentTerms: number; // Délai de paiement en jours
  includeIndexation: boolean;
  indexationFormula?: string;
  businessUnit?: string;
}

/**
 * Service de génération automatique des plans de facturation
 * Conforme aux exigences ENGIE pour la facturation des contrats énergétiques
 */
export class BillingPlanGenerator {
  /**
   * Génère un plan de facturation complet pour un contrat
   */
  static async generateBillingPlan(config: BillingPlanConfig): Promise<BillingSchedule[]> {
    const schedule: BillingSchedule[] = [];
    const { startDate, endDate, periodicity, contractAmount } = config;
    
    // Calculer le nombre de périodes
    const periods = this.calculatePeriods(startDate, endDate, periodicity);
    
    // Calculer le montant par période
    const amountPerPeriod = contractAmount / periods;
    
    // Générer les échéances
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < periods; i++) {
      const billingDate = new Date(currentDate);
      
      // Ajuster la date selon la périodicité
      switch (periodicity) {
        case 'monthly':
          billingDate.setMonth(billingDate.getMonth() + i);
          break;
        case 'quarterly':
          billingDate.setMonth(billingDate.getMonth() + (i * 3));
          break;
        case 'semi_annual':
          billingDate.setMonth(billingDate.getMonth() + (i * 6));
          break;
        case 'annual':
          billingDate.setFullYear(billingDate.getFullYear() + i);
          break;
      }
      
      // S'assurer que la date ne dépasse pas la fin du contrat
      if (billingDate > endDate) {
        break;
      }
      
      schedule.push({
        date: billingDate,
        amount: Math.round(amountPerPeriod * 100) / 100, // Arrondir à 2 décimales
        description: this.generateDescription(i + 1, periods, periodicity),
        status: 'pending'
      });
    }
    
    return schedule;
  }

  /**
   * Calcule le nombre de périodes de facturation
   */
  private static calculatePeriods(
    startDate: Date,
    endDate: Date,
    periodicity: string
  ): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    switch (periodicity) {
      case 'monthly':
        return Math.ceil(diffDays / 30);
      case 'quarterly':
        return Math.ceil(diffDays / 90);
      case 'semi_annual':
        return Math.ceil(diffDays / 180);
      case 'annual':
        return Math.ceil(diffDays / 365);
      default:
        return 12; // Par défaut mensuel
    }
  }

  /**
   * Génère la description d'une échéance
   */
  private static generateDescription(
    periodNumber: number,
    totalPeriods: number,
    periodicity: string
  ): string {
    const periodicityLabels: Record<string, string> = {
      'monthly': 'Mensualité',
      'quarterly': 'Trimestre',
      'semi_annual': 'Semestre',
      'annual': 'Annualité'
    };
    
    const label = periodicityLabels[periodicity] || 'Échéance';
    return `${label} ${periodNumber}/${totalPeriods}`;
  }

  /**
   * Ajuste le plan de facturation avec l'indexation
   */
  static async adjustForIndexation(
    schedule: BillingSchedule[],
    indexationFormula: string,
    baseAmount: number
  ): Promise<BillingSchedule[]> {
    // TODO: Implémenter le calcul d'indexation selon la formule
    // Pour l'instant, on applique une augmentation fictive de 2%
    const indexationRate = 0.02;
    
    return schedule.map((item, index) => {
      const adjustedAmount = item.amount * (1 + (indexationRate * (index / schedule.length)));
      return {
        ...item,
        amount: Math.round(adjustedAmount * 100) / 100
      };
    });
  }

  /**
   * Génère des factures proforma
   */
  static generateProformaInvoices(
    schedule: BillingSchedule[],
    contractNumber: string,
    clientName: string
  ): any[] {
    return schedule.map((item, index) => ({
      invoiceNumber: `PRO-${contractNumber}-${(index + 1).toString().padStart(3, '0')}`,
      date: item.date,
      dueDate: new Date(item.date.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      client: clientName,
      amount: item.amount,
      vatRate: 0.20,
      totalWithVat: Math.round(item.amount * 1.20 * 100) / 100,
      description: item.description,
      status: 'draft'
    }));
  }

  /**
   * Sauvegarde le plan de facturation en base de données
   */
  static async saveBillingPlan(
    contractId: string,
    schedule: BillingSchedule[]
  ): Promise<void> {
    // TODO: Implémenter la sauvegarde en base
    // Nécessite la création de la table billing_plans
    console.log('Saving billing plan for contract:', contractId);
    console.log('Schedule:', schedule);
  }

  /**
   * Récupère le plan de facturation d'un contrat
   */
  static async getBillingPlan(contractId: string): Promise<BillingSchedule[]> {
    // TODO: Implémenter la récupération depuis la base
    return [];
  }

  /**
   * Met à jour le statut d'une échéance
   */
  static async updateBillingStatus(
    contractId: string,
    scheduleIndex: number,
    status: 'pending' | 'sent' | 'paid' | 'overdue'
  ): Promise<void> {
    // TODO: Implémenter la mise à jour du statut
    console.log('Updating billing status:', { contractId, scheduleIndex, status });
  }

  /**
   * Génère un rappel de paiement
   */
  static generatePaymentReminder(
    invoice: any,
    reminderLevel: 1 | 2 | 3
  ): string {
    const templates = {
      1: `Rappel de paiement - Facture ${invoice.invoiceNumber}\n\nMontant dû: ${invoice.totalWithVat}€\nDate d'échéance: ${invoice.dueDate}`,
      2: `2ème Rappel - Facture ${invoice.invoiceNumber}\n\nMontant dû: ${invoice.totalWithVat}€\nDate d'échéance dépassée: ${invoice.dueDate}\n\nMerci de régulariser votre situation rapidement.`,
      3: `Mise en demeure - Facture ${invoice.invoiceNumber}\n\nMontant dû: ${invoice.totalWithVat}€\n\nSans règlement sous 8 jours, nous serons contraints d'engager des poursuites.`
    };
    
    return templates[reminderLevel];
  }
}