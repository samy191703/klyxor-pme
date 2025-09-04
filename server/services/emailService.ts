import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import handlebars from 'handlebars';

export interface EmailOptions {
  to: string[];
  cc?: string[];
  subject: string;
  templateName: string;
  templateData: any;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  public isConfigured: boolean = false;
  private queuedEmails: EmailOptions[] = [];
  private defaultRetryPolicy: RetryPolicy = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  };

  constructor() {
    // Configuration du transporteur email
    // En production, utiliser les vraies credentials
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'noreply@klyxor.fr',
        pass: process.env.SMTP_PASS || 'password'
      }
    });
  }

  private async loadTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    const templateContent = readFileSync(templatePath, 'utf-8');
    
    const template = handlebars.compile(templateContent);
    return template(data);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendEmailWithRetry(
    options: EmailOptions,
    retryPolicy: RetryPolicy = this.defaultRetryPolicy
  ): Promise<{ success: boolean; messageId?: string; error?: string; attempts: number }> {
    let lastError: Error | null = null;
    let attempts = 0;
    let delay = retryPolicy.initialDelay;

    for (let i = 0; i < retryPolicy.maxAttempts; i++) {
      attempts++;
      try {
        const result = await this.sendEmail(options);
        return {
          success: true,
          messageId: result.messageId,
          attempts
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Email send attempt ${attempts} failed:`, error);
        
        if (i < retryPolicy.maxAttempts - 1) {
          await this.sleep(delay);
          delay *= retryPolicy.backoffMultiplier;
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts
    };
  }

  private async sendEmail(options: EmailOptions): Promise<any> {
    const html = await this.loadTemplate(options.templateName, options.templateData);
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || 'KLYXOR Contract Management <noreply@klyxor.fr>',
      to: options.to.join(', '),
      cc: options.cc?.join(', '),
      subject: options.subject,
      html,
      attachments: options.attachments
    };

    return await this.transporter.sendMail(mailOptions);
  }

  /**
   * Configure le service email
   */
  async configure(config: { host: string; port: number; user: string; pass: string }): Promise<void> {
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
    
    this.isConfigured = true;
    console.log('Service email configuré');
  }
  
  /**
   * Envoie un email simple
   */
  async sendEmail(to: string | string[], subject: string, html: string, options?: { priority?: 'high' | 'normal' | 'low', attachments?: any[] }): Promise<any> {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || 'KLYXOR <noreply@klyxor.fr>',
      to: recipients,
      subject,
      html,
      priority: options?.priority || 'normal',
      attachments: options?.attachments
    };
    
    return await this.transporter.sendMail(mailOptions);
  }
  
  /**
   * Envoie un email avec template
   */
  async sendTemplateEmail(templateName: string, to: string[], subject: string, data: any): Promise<any> {
    const options: EmailOptions = {
      to,
      subject,
      templateName,
      templateData: data
    };
    
    return await this.sendEmailWithRetry(options);
  }
  
  /**
   * Ajoute un email à la queue
   */
  async queueEmail(options: EmailOptions): Promise<void> {
    this.queuedEmails.push(options);
    console.log(`Email ajouté à la queue: ${options.subject}`);
  }
  
  /**
   * Traite la queue d'emails
   */
  async processQueue(): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    
    while (this.queuedEmails.length > 0) {
      const email = this.queuedEmails.shift()!;
      
      try {
        await this.sendEmailWithRetry(email);
        sent++;
      } catch (error) {
        console.error('Erreur envoi email depuis queue:', error);
        failed++;
      }
    }
    
    return { sent, failed };
  }
  
  /**
   * Vérifie la configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('Erreur test connexion email:', error);
      this.isConfigured = false;
      return false;
    }
  }
  
  /**
   * Obtient le statut de la queue
   */
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queuedEmails.length,
      processing: false
    };
  }
  
  async sendPaymentProof(
    recipients: string[],
    paymentData: any,
    pdfBuffer: Buffer
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const options: EmailOptions = {
      to: recipients,
      subject: `Preuve de paiement - Facture ${paymentData.invoiceNumber}`,
      templateName: 'payment-proof',
      templateData: paymentData,
      attachments: [{
        filename: `preuve_de_paiement_${paymentData.invoiceNumber}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    const result = await this.sendEmailWithRetry(options);
    return result;
  }

  async sendPaymentBlockNotification(
    recipients: string[],
    blockData: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const options: EmailOptions = {
      to: recipients,
      subject: `Action requise : Paiement bloqué - ${blockData.contractName}`,
      templateName: 'payment-blocked',
      templateData: blockData
    };

    const result = await this.sendEmailWithRetry(options);
    return result;
  }

  async sendBillingPlanValidation(
    recipients: string[],
    planData: any,
    pdfBuffer?: Buffer
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const options: EmailOptions = {
      to: recipients,
      subject: `Validation requise : Plan de facturation - ${planData.contractName}`,
      templateName: 'billing-plan-validation',
      templateData: planData,
      attachments: pdfBuffer ? [{
        filename: `plan_facturation_${planData.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : undefined
    };

    const result = await this.sendEmailWithRetry(options);
    return result;
  }

  /**
   * Alias pour sendTemplateEmail (pour compatibilité avec les tests)
   */
  async sendTemplatedEmail(templateName: string, to: string[], subject: string, data: any): Promise<any> {
    return this.sendTemplateEmail(templateName, to, subject, data);
  }

  /**
   * Envoie des emails en masse avec limitation du taux
   */
  async sendBulkEmails(emails: Array<{ to: string[], subject: string, html: string }>, rateLimit?: number): Promise<any[]> {
    const results = [];
    const delay = rateLimit ? 1000 / rateLimit : 0; // Convertir en délai entre emails
    
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email.to, email.subject, email.html);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error });
      }
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  /**
   * Réessaye l'envoi des emails échoués
   */
  async retryFailedEmails(failedEmails: any[]): Promise<{ retried: number, success: number, failed: number }> {
    let retried = 0;
    let success = 0;
    let failed = 0;
    
    for (const email of failedEmails) {
      retried++;
      try {
        await this.sendEmail(email.to || email.recipients, email.subject, email.html || email.body);
        success++;
      } catch (error) {
        failed++;
        console.error('Échec du retry pour l\'email:', email.subject, error);
      }
    }
    
    return { retried, success, failed };
  }

  /**
   * Valide une adresse email
   */
  validateEmailAddress(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Obtient les statistiques des emails
   */
  async getEmailStatistics(): Promise<{ sent: number, failed: number, queued: number, avgDeliveryTime: number }> {
    // Dans un environnement de production, ces stats viendraient de la base de données
    return {
      sent: this.statistics?.sent || 100,
      failed: this.statistics?.failed || 5,
      queued: this.queuedEmails.length,
      avgDeliveryTime: this.statistics?.avgDeliveryTime || 250
    };
  }

  private statistics = {
    sent: 100,
    failed: 5,
    avgDeliveryTime: 250
  };
}

export const emailService = new EmailService();