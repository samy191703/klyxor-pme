import { v4 as uuidv4 } from 'uuid';
import { IndexationProposal, IndexationReport } from '../types';

/**
 * Service de génération des rapports d'indexation
 */
export class ReportingService {
  private reports: Map<string, IndexationReport> = new Map();

  /**
   * Génère un rapport d'indexation
   */
  async generateReport(proposal: IndexationProposal): Promise<IndexationReport> {
    try {
      console.log(`[ReportingService] Génération rapport pour proposition ${proposal.id}`);
      
      // Préparer le contenu du rapport
      const reportContent = this.prepareReportContent(proposal);
      
      // Générer les fichiers
      const pdfUri = await this.generatePDF(reportContent);
      const xlsUri = await this.generateExcel(reportContent);
      
      // Créer le rapport
      const report: IndexationReport = {
        id: uuidv4(),
        proposalId: proposal.id,
        contractId: proposal.contractId,
        period: proposal.period,
        pdfUri,
        xlsUri,
        checksum: this.calculateChecksum(reportContent),
        generatedAt: new Date(),
        content: reportContent
      };
      
      // Sauvegarder le rapport
      await this.saveReport(report);
      
      console.log(`[ReportingService] Rapport ${report.id} généré`);
      return report;
    } catch (error) {
      console.error('[ReportingService] Erreur génération rapport:', error);
      throw error;
    }
  }

  /**
   * Prépare le contenu du rapport
   */
  private prepareReportContent(proposal: IndexationProposal): any {
    const indices = [];
    
    // Formater les indices selon la formule
    if (proposal.formulaCode === '2.A' || proposal.formulaCode === '2.B') {
      if (proposal.indices.ICHT0 !== undefined) {
        indices.push({
          name: 'ICHT',
          originalValue: proposal.indices.ICHT0,
          originalDate: '2023-01', // TODO: Récupérer la vraie date
          revisedValue: proposal.indices.ICHT_rev || 0,
          revisedDate: proposal.period,
          source: 'INSEE'
        });
      }
      
      if (proposal.indices.FM0A0 !== undefined) {
        indices.push({
          name: 'FM0A',
          originalValue: proposal.indices.FM0A0,
          originalDate: '2023-01',
          revisedValue: proposal.indices.FM0A_rev || 0,
          revisedDate: proposal.period,
          source: 'INSEE'
        });
      }
    } else if (proposal.formulaCode === '3') {
      if (proposal.indices.CPI0 !== undefined) {
        indices.push({
          name: 'CPI',
          originalValue: proposal.indices.CPI0,
          originalDate: '2023-01',
          revisedValue: proposal.indices.CPI_rev || 0,
          revisedDate: proposal.period,
          source: 'INSEE'
        });
      }
    }
    
    return {
      contract: proposal.contractId, // TODO: Récupérer le nom du contrat
      formula: this.getFormulaDescription(proposal.formulaCode),
      indices,
      previousAmount: proposal.baseAmount,
      newAmount: proposal.newAmount,
      variation: proposal.deltaAbsolute,
      variationPercent: proposal.deltaPercent,
      decision: proposal.status === 'applied' ? 'Validée' : proposal.status,
      decisionBy: proposal.validatedBy || 'Système',
      decisionDate: proposal.validatedAt || new Date()
    };
  }

  /**
   * Génère le PDF du rapport
   */
  private async generatePDF(content: any): Promise<string> {
    // TODO: Utiliser une librairie comme puppeteer ou pdfkit
    const pdfContent = this.formatPDFContent(content);
    
    // Simuler la génération
    const pdfId = uuidv4();
    const pdfUri = `/reports/pdf/${pdfId}.pdf`;
    
    console.log('PDF généré:', pdfUri);
    return pdfUri;
  }

  /**
   * Génère le fichier Excel du rapport
   */
  private async generateExcel(content: any): Promise<string> {
    // TODO: Utiliser une librairie comme exceljs
    const excelContent = this.formatExcelContent(content);
    
    // Simuler la génération
    const excelId = uuidv4();
    const xlsUri = `/reports/excel/${excelId}.xlsx`;
    
    console.log('Excel généré:', xlsUri);
    return xlsUri;
  }

  /**
   * Formate le contenu pour PDF
   */
  private formatPDFContent(content: any): string {
    return `
RAPPORT D'INDEXATION
====================

Contrat: ${content.contract}
Période: ${content.decisionDate.toLocaleDateString('fr-FR')}
Formule: ${content.formula}

INDICES UTILISÉS
----------------
${content.indices.map((i: any) => `
${i.name}:
  - Valeur d'origine (${i.originalDate}): ${i.originalValue}
  - Valeur révisée (${i.revisedDate}): ${i.revisedValue}
  - Source: ${i.source}
`).join('\n')}

CALCUL D'INDEXATION
-------------------
Montant précédent: ${content.previousAmount.toFixed(2)} EUR
Nouveau montant: ${content.newAmount.toFixed(2)} EUR
Variation: ${content.variation.toFixed(2)} EUR (${content.variationPercent.toFixed(2)}%)

DÉCISION
--------
Statut: ${content.decision}
Validé par: ${content.decisionBy}
Date: ${content.decisionDate.toLocaleDateString('fr-FR')}
    `;
  }

  /**
   * Formate le contenu pour Excel
   */
  private formatExcelContent(content: any): any[][] {
    return [
      ['RAPPORT D\'INDEXATION'],
      [],
      ['Contrat', content.contract],
      ['Période', content.decisionDate.toLocaleDateString('fr-FR')],
      ['Formule', content.formula],
      [],
      ['INDICES'],
      ['Nom', 'Valeur origine', 'Date origine', 'Valeur révisée', 'Date révision', 'Source'],
      ...content.indices.map((i: any) => [
        i.name,
        i.originalValue,
        i.originalDate,
        i.revisedValue,
        i.revisedDate,
        i.source
      ]),
      [],
      ['RÉSULTAT'],
      ['Montant précédent', content.previousAmount],
      ['Nouveau montant', content.newAmount],
      ['Variation', content.variation],
      ['Variation %', content.variationPercent],
      [],
      ['VALIDATION'],
      ['Statut', content.decision],
      ['Validé par', content.decisionBy],
      ['Date', content.decisionDate.toLocaleDateString('fr-FR')]
    ];
  }

  /**
   * Calcule le checksum du rapport
   */
  private calculateChecksum(content: any): string {
    // TODO: Utiliser crypto pour un vrai checksum
    const data = JSON.stringify(content);
    return Buffer.from(data).toString('base64').substring(0, 16);
  }

  /**
   * Sauvegarde le rapport
   */
  private async saveReport(report: IndexationReport): Promise<void> {
    // TODO: Sauvegarder en DB
    this.reports.set(report.id, report);
  }

  /**
   * Récupère un rapport
   */
  async getReport(reportId: string): Promise<IndexationReport | null> {
    // TODO: Récupérer depuis DB
    return this.reports.get(reportId) || null;
  }

  /**
   * Recherche des rapports
   */
  async searchReports(criteria: {
    contractId?: string;
    period?: string;
    proposalId?: string;
    limit?: number;
  }): Promise<IndexationReport[]> {
    // TODO: Implémenter la recherche en DB
    const reports = Array.from(this.reports.values());
    
    return reports.filter(r => {
      if (criteria.contractId && r.contractId !== criteria.contractId) return false;
      if (criteria.period && r.period !== criteria.period) return false;
      if (criteria.proposalId && r.proposalId !== criteria.proposalId) return false;
      return true;
    }).slice(0, criteria.limit || 100);
  }

  /**
   * Archive un rapport
   */
  async archiveReport(reportId: string): Promise<void> {
    const report = await this.getReport(reportId);
    if (!report) {
      throw new Error(`Rapport ${reportId} introuvable`);
    }
    
    // TODO: Déplacer vers stockage d'archive (S3, etc.)
    console.log(`Rapport ${reportId} archivé`);
  }

  /**
   * Retourne la description de la formule
   */
  private getFormulaDescription(formulaCode: string): string {
    const descriptions: Record<string, string> = {
      '2.A': 'OMSFn = OMSF0 × (0,15 + 0,55×(ICHTn/ICHT0) + 0,3×(FM0An/FM0A0))',
      '2.B': 'OMSFn = OMSFn-1 × (0,15 + 0,55×(ICHTn/ICHT0) + 0,3×(FM0An/FM0A0))',
      '3': 'OMSFn = OMSF0 × (CPIn/CPI0)'
    };
    
    return descriptions[formulaCode] || formulaCode;
  }

  /**
   * Exporte plusieurs rapports
   */
  async exportBatch(
    reportIds: string[],
    format: 'pdf' | 'excel' | 'zip'
  ): Promise<string> {
    // TODO: Implémenter l'export batch
    const exportId = uuidv4();
    const exportUri = `/exports/${format}/${exportId}.${format}`;
    
    console.log(`Export batch créé: ${exportUri}`);
    return exportUri;
  }

  /**
   * Statistiques des rapports
   */
  async getStats(): Promise<{
    totalReports: number;
    averageVariation: number;
    formulas: Record<string, number>;
  }> {
    const reports = Array.from(this.reports.values());
    
    const formulas: Record<string, number> = {};
    let totalVariation = 0;
    
    reports.forEach(r => {
      const formula = r.content.formula;
      formulas[formula] = (formulas[formula] || 0) + 1;
      totalVariation += r.content.variationPercent;
    });
    
    return {
      totalReports: reports.length,
      averageVariation: reports.length > 0 ? totalVariation / reports.length : 0,
      formulas
    };
  }
}