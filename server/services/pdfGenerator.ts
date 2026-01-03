import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface PaymentProofData {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentDate: string;
  amount: number;
  currency: string;
  method: string;
  beneficiary: string;
  payer?: string;
  bankReference?: string;
  balanceDue: number;
  isPartialPayment: boolean;
  contractName: string;
  contractId: string;
  entityInfo: {
    name: string;
    siren: string;
    address: string;
    logo?: string;
  };
  legalMentions?: string;
}

export class PDFGenerator {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async generatePaymentProof(data: PaymentProofData, templateName: string = 'default'): Promise<Buffer> {
    await this.initialize();
    
    // Charger le template HTML
    const templatePath = join(__dirname, '..', 'templates', `payment-proof-${templateName}.html`);
    const templateContent = readFileSync(templatePath, 'utf-8');
    
    // Compiler le template avec Handlebars
    const template = handlebars.compile(templateContent);
    
    // Ajouter des helpers Handlebars
    handlebars.registerHelper('formatAmount', (amount: number, currency: string) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });
    
    handlebars.registerHelper('formatDate', (date: string) => {
      return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });
    
    // Générer le HTML final
    const html = template(data);
    
    // Créer une nouvelle page
    const page = await this.browser!.newPage();
    
    try {
      // Définir le contenu HTML
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });
      
      // Générer le PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      return pdf;
    } finally {
      await page.close();
    }
  }

  async generateBillingPlanPDF(planData: any): Promise<Buffer> {
    await this.initialize();
    
    const templatePath = join(__dirname, '..', 'templates', 'billing-plan.html');
    const templateContent = readFileSync(templatePath, 'utf-8');
    
    const template = handlebars.compile(templateContent);
    const html = template(planData);
    
    const page = await this.browser!.newPage();
    
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
      });
      
      return pdf;
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Instance singleton
export const pdfGenerator = new PDFGenerator();