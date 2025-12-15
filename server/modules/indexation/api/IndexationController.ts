import { Request, Response } from 'express';
import { IndexationScheduler } from '../scheduler/IndexationScheduler';
import { ProposalService } from '../services/ProposalService';
import { ValidationBridge } from '../services/ValidationBridge';
import { ApplyService } from '../services/ApplyService';
import { ReportingService } from '../services/ReportingService';
import { IndexSourceAdapter } from '../adapters/IndexSourceAdapter';
import { FormulaEngine } from '../engine/FormulaEngine';

/**
 * Contrôleur API pour le module d'indexation
 */
export class IndexationController {
  private scheduler: IndexationScheduler;
  private proposalService: ProposalService;
  private validationBridge: ValidationBridge;
  private applyService: ApplyService;
  private reportingService: ReportingService;
  private indexAdapter: IndexSourceAdapter;
  private formulaEngine: FormulaEngine;

  constructor() {
    // Initialiser les services
    this.scheduler = new IndexationScheduler();
    this.proposalService = new ProposalService();
    this.applyService = new ApplyService();
    this.reportingService = new ReportingService();
    this.validationBridge = new ValidationBridge(
      this.proposalService,
      this.applyService
    );
    this.indexAdapter = new IndexSourceAdapter();
    this.formulaEngine = new FormulaEngine();
  }

  /**
   * Démarre le scheduler
   */
  startScheduler(req: Request, res: Response): void {
    try {
      this.scheduler.start();
      res.json({ 
        success: true, 
        message: 'Scheduler démarré' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Arrête le scheduler
   */
  stopScheduler(req: Request, res: Response): void {
    try {
      this.scheduler.stop();
      res.json({ 
        success: true, 
        message: 'Scheduler arrêté' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Exécute manuellement le scheduler
   */
  async runScheduler(req: Request, res: Response): Promise<void> {
    try {
      await this.scheduler.run();
      res.json({ 
        success: true, 
        message: 'Détection exécutée' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Crée une proposition d'indexation
   */
  async createProposal(req: Request, res: Response): Promise<void> {
    try {
      const contract = req.body;
      const proposal = await this.proposalService.createProposal(contract);
      res.json({ 
        success: true, 
        proposal 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Soumet une proposition pour validation
   */
  async submitProposal(req: Request, res: Response): Promise<void> {
    try {
      const { proposalId } = req.params;
      await this.proposalService.submitForValidation(proposalId);
      res.json({ 
        success: true, 
        message: 'Proposition soumise pour validation' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Valide ou rejette une proposition
   */
  async validateProposal(req: Request, res: Response): Promise<void> {
    try {
      const { proposalId } = req.params;
      const { decision, validatedBy, reason } = req.body;
      
      await this.proposalService.processValidation(
        proposalId,
        decision,
        validatedBy,
        reason
      );
      
      res.json({ 
        success: true, 
        message: `Proposition ${decision}` 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Récupère une proposition
   */
  async getProposal(req: Request, res: Response): Promise<void> {
    try {
      const { proposalId } = req.params;
      const proposal = await this.proposalService.getProposal(proposalId);
      
      if (!proposal) {
        res.status(404).json({ 
          success: false, 
          error: 'Proposition introuvable' 
        });
        return;
      }
      
      res.json({ 
        success: true, 
        proposal 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Recherche des propositions
   */
  async searchProposals(req: Request, res: Response): Promise<void> {
    try {
      const proposals = await this.proposalService.searchProposals(req.query);
      res.json({ 
        success: true, 
        proposals 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Récupère la valeur d'un indice
   */
  async getIndexValue(req: Request, res: Response): Promise<void> {
    try {
      const { indexKey, period } = req.params;
      const value = await this.indexAdapter.getIndexValue(indexKey, period);
      
      if (!value) {
        res.status(404).json({ 
          success: false, 
          error: 'Indice introuvable' 
        });
        return;
      }
      
      res.json({ 
        success: true, 
        value 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Enregistre une valeur manuelle d'indice
   */
  async saveManualIndex(req: Request, res: Response): Promise<void> {
    try {
      const { indexKey, period, value, enteredBy } = req.body;
      const indexValue = await this.indexAdapter.saveManualEntry(
        indexKey,
        period,
        value,
        enteredBy
      );
      
      res.json({ 
        success: true, 
        indexValue 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Teste une formule
   */
  testFormula(req: Request, res: Response): void {
    try {
      const params = req.body;
      const result = this.formulaEngine.calculate(params);
      res.json({ 
        success: true, 
        result 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Récupère un rapport
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const report = await this.reportingService.getReport(reportId);
      
      if (!report) {
        res.status(404).json({ 
          success: false, 
          error: 'Rapport introuvable' 
        });
        return;
      }
      
      res.json({ 
        success: true, 
        report 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Recherche des rapports
   */
  async searchReports(req: Request, res: Response): Promise<void> {
    try {
      const reports = await this.reportingService.searchReports(req.query);
      res.json({ 
        success: true, 
        reports 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Statistiques du module
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = {
        scheduler: this.scheduler.getStats(),
        proposals: await this.proposalService.getStats(),
        reports: await this.reportingService.getStats(),
        cache: this.indexAdapter.getCacheStats(),
        formulas: this.formulaEngine.getAvailableFormulas()
      };
      
      res.json({ 
        success: true, 
        stats 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  }
}