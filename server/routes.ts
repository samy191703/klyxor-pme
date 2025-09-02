import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import aiHelpRouter from "./routes/ai-help";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get KPIs
  app.get("/api/kpis", async (req, res) => {
    try {
      const kpis = await storage.getKPIs();
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KPIs" });
    }
  });

  // Get contracts
  app.get("/api/contracts", async (req, res) => {
    try {
      const contracts = await storage.getContracts();
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  });
  
  // Get contract by ID
  app.get("/api/contracts/:id", async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contract" });
    }
  });
  
  // Create contract
  app.post("/api/contracts", async (req, res) => {
    try {
      const contract = await storage.createContract(req.body);
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Failed to create contract" });
    }
  });
  
  // Update contract
  app.put("/api/contracts/:id", async (req, res) => {
    try {
      const contract = await storage.updateContract(req.params.id, req.body);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Failed to update contract" });
    }
  });

  // Get validation requests
  app.get("/api/validation-requests", async (req, res) => {
    try {
      const requests = await storage.getValidationRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch validation requests" });
    }
  });

  // Approve validation request
  app.post("/api/validation-requests/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const request = await storage.updateValidationRequest(id, {
        status: "approved",
      });
      
      if (!request) {
        return res.status(404).json({ error: "Validation request not found" });
      }

      // Log the activity
      await storage.createActivityLog({
        userId: "admin-1",
        userName: "Admin User",
        action: "approved",
        entityType: request.type,
        entityId: request.referenceId,
        entityReference: request.reference,
        details: `${request.type} approved`,
      });

      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve validation request" });
    }
  });

  // Reject validation request
  app.post("/api/validation-requests/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: "Reason is required for rejection" });
      }

      const request = await storage.updateValidationRequest(id, {
        status: "rejected",
        reason,
      });

      if (!request) {
        return res.status(404).json({ error: "Validation request not found" });
      }

      // Log the activity
      await storage.createActivityLog({
        userId: "admin-1",
        userName: "Admin User",
        action: "rejected",
        entityType: request.type,
        entityId: request.referenceId,
        entityReference: request.reference,
        details: `${request.type} rejected: ${reason}`,
      });

      res.json(request);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject validation request" });
    }
  });

  // Get deadlines
  app.get("/api/deadlines", async (req, res) => {
    try {
      const deadlines = await storage.getDeadlines();
      res.json(deadlines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deadlines" });
    }
  });

  // Get alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  // Mark alert as read
  app.post("/api/alerts/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markAlertAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark alert as read" });
    }
  });

  // Mark all alerts as read
  app.post("/api/alerts/read-all", async (req, res) => {
    try {
      await storage.markAllAlertsAsRead();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all alerts as read" });
    }
  });

  // Get activity logs
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const logs = await storage.getActivityLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Get import logs
  app.get("/api/import-logs", async (req, res) => {
    try {
      const logs = await storage.getImportLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import logs" });
    }
  });

  // Get amendments
  app.get("/api/amendments", async (req, res) => {
    try {
      const amendmentsList = await storage.getAmendments();
      res.json(amendmentsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch amendments" });
    }
  });
  
  // Get amendment by ID
  app.get("/api/amendments/:id", async (req, res) => {
    try {
      const amendment = await storage.getAmendment(req.params.id);
      if (!amendment) {
        return res.status(404).json({ error: "Amendment not found" });
      }
      res.json(amendment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch amendment" });
    }
  });
  
  // Get amendments by contract ID
  app.get("/api/contracts/:contractId/amendments", async (req, res) => {
    try {
      const amendmentsList = await storage.getAmendmentsByContractId(req.params.contractId);
      res.json(amendmentsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contract amendments" });
    }
  });
  
  // Create amendment
  app.post("/api/amendments", async (req, res) => {
    try {
      const amendment = await storage.createAmendment(req.body);
      
      // Log the activity
      await storage.createActivityLog({
        userId: "admin-1",
        userName: "Admin User",
        action: "created",
        entityType: "amendment",
        entityId: amendment.id,
        entityReference: amendment.number,
        details: `Created amendment: ${amendment.title}`,
      });
      
      res.json(amendment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create amendment" });
    }
  });
  
  // Update amendment
  app.put("/api/amendments/:id", async (req, res) => {
    try {
      const amendment = await storage.updateAmendment(req.params.id, req.body);
      if (!amendment) {
        return res.status(404).json({ error: "Amendment not found" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId: "admin-1",
        userName: "Admin User",
        action: "updated",
        entityType: "amendment",
        entityId: amendment.id,
        entityReference: amendment.number,
        details: `Updated amendment: ${amendment.title}`,
      });
      
      res.json(amendment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update amendment" });
    }
  });
  
  // Delete amendment
  app.delete("/api/amendments/:id", async (req, res) => {
    try {
      await storage.deleteAmendment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete amendment" });
    }
  });
  
  // Get indexations
  app.get("/api/indexations", async (req, res) => {
    try {
      const indexations = await storage.getIndexations();
      res.json(indexations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch indexations" });
    }
  });

  // Get indexation formulas
  app.get("/api/indexation-formulas", async (req, res) => {
    try {
      const formulas = await storage.getIndexationFormulas();
      res.json(formulas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch indexation formulas" });
    }
  });

  // Get indexation formula by ID
  app.get("/api/indexation-formulas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const formula = await storage.getIndexationFormulaById(id);
      
      if (!formula) {
        return res.status(404).json({ error: "Formula not found" });
      }
      
      res.json(formula);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch formula" });
    }
  });

  // Create indexation formula
  app.post("/api/indexation-formulas", async (req, res) => {
    try {
      const formula = await storage.createIndexationFormula(req.body);
      
      // Log the activity
      await storage.createActivityLog({
        userId: "admin-1",
        userName: "Admin User",
        action: "created",
        entityType: "indexation_formula",
        entityId: formula.id,
        entityReference: formula.name,
        details: `Created formula: ${formula.name}`,
      });
      
      res.json(formula);
    } catch (error) {
      res.status(500).json({ error: "Failed to create formula" });
    }
  });

  // Update indexation formula
  app.put("/api/indexation-formulas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const formula = await storage.updateIndexationFormula(id, req.body);
      
      if (!formula) {
        return res.status(404).json({ error: "Formula not found" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId: "admin-1",
        userName: "Admin User",
        action: "updated",
        entityType: "indexation_formula",
        entityId: formula.id,
        entityReference: formula.name,
        details: `Updated formula: ${formula.name}`,
      });
      
      res.json(formula);
    } catch (error) {
      res.status(500).json({ error: "Failed to update formula" });
    }
  });

  // Delete indexation formula
  app.delete("/api/indexation-formulas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteIndexationFormula(id);
      
      if (!success) {
        return res.status(404).json({ error: "Formula not found" });
      }
      
      // Log the activity
      await storage.createActivityLog({
        userId: "admin-1",
        userName: "Admin User",
        action: "deleted",
        entityType: "indexation_formula",
        entityId: id,
        entityReference: "Formula",
        details: `Deleted formula`,
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete formula" });
    }
  });

  // AI Help routes
  app.use('/api/ai-help', aiHelpRouter);

  // Admin KPIs
  app.get("/api/admin/kpis", async (req, res) => {
    try {
      const kpis = {
        contractsToValidate: 5,
        indexationsToValidate: 8,
        amendmentsToValidate: 3,
        terminationsInProgress: 2,
        dueDatesJ30: 24,
        dueDatesJ7: 8,
        dueDatesJ1: 3,
        indexSourceErrors: 2,
        sapErrors: 5
      };
      res.json(kpis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin KPIs" });
    }
  });

  // Admin alerts
  app.get("/api/admin/alerts", async (req, res) => {
    try {
      const alerts = [
        {
          id: "1",
          type: "critical",
          title: "Indexation en retard",
          message: "Le contrat AUX89 nécessite une indexation urgente",
          timestamp: new Date(),
          isRead: false,
          referenceId: "AUX89"
        },
        {
          id: "2",
          type: "warning",
          title: "Erreur source indices",
          message: "Impossible de récupérer l'indice ICHT depuis l'INSEE",
          timestamp: new Date(),
          isRead: false
        }
      ];
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin alerts" });
    }
  });

  // Admin blocked tasks
  app.get("/api/admin/blocked-tasks", async (req, res) => {
    try {
      const tasks = [
        {
          id: "1",
          type: "Validation contrat",
          reference: "FIG83 - PARC FIGANIÈRES",
          blockedSince: new Date(Date.now() - 48 * 60 * 60 * 1000),
          priority: "high",
          assignedTo: "Jean Martin"
        }
      ];
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blocked tasks" });
    }
  });

  // Admin recent reports
  app.get("/api/admin/recent-reports", async (req, res) => {
    try {
      const reports = [
        {
          id: "1",
          contractNumber: "AUX89",
          contractTitle: "PARC AUXERROIS",
          date: new Date(),
          status: "validé",
          variation: 2.5
        }
      ];
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent reports" });
    }
  });

  // Admin contracts
  app.get("/api/admin/contracts", async (req, res) => {
    try {
      const contracts = [
        {
          id: "1",
          number: "AUX89",
          title: "PARC AUXERROIS",
          type: "OMSA",
          status: "active",
          billingPeriodicity: "Trimestrielle",
          startDate: new Date("2024-01-01"),
          endDate: new Date("2025-12-31"),
          responsible: "Jean Martin",
          daysUntilDeadline: 7,
          deadlineType: "Indexation",
          nextDeadline: new Date()
        }
      ];
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin contracts" });
    }
  });

  // Admin indexations
  app.get("/api/admin/indexations", async (req, res) => {
    try {
      const indexations = [
        {
          id: "1",
          contractId: "1",
          contractNumber: "AUX89",
          contractTitle: "PARC AUXERROIS",
          indexationDate: new Date(),
          formula: "ICHT Simple",
          oldAmount: 128000,
          newAmount: 131200,
          variation: 2.5,
          status: "to_calculate",
          indices: [
            { code: "ICHT", valueN0: 115.7, valueN: 118.6 }
          ]
        }
      ];
      res.json(indexations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin indexations" });
    }
  });

  // Calculate indexation
  app.post("/api/admin/indexations/:id/calculate", async (req, res) => {
    try {
      const { id } = req.params;
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate indexation" });
    }
  });

  // Validate indexation
  app.post("/api/admin/indexations/:id/validate", async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      res.json({ success: true, id, action });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate indexation" });
    }
  });

  // Economic indices
  app.get("/api/admin/economic-indices", async (req, res) => {
    try {
      const indices = [
        {
          code: "ICHT",
          name: "Indice du coût horaire du travail",
          value: 117.8,
          date: new Date(),
          source: "INSEE",
          status: "definitive"
        }
      ];
      res.json(indices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch economic indices" });
    }
  });

  // Refresh economic indices
  app.post("/api/admin/economic-indices/refresh", async (req, res) => {
    try {
      res.json({ success: true, message: "Indices refreshed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh economic indices" });
    }
  });

  // Admin billing plans
  app.get("/api/admin/billing/plans", async (req, res) => {
    try {
      const plans = [
        {
          id: "1",
          contractNumber: "AUX89",
          contractTitle: "PARC AUXERROIS",
          contractType: "OMSA",
          amount: 128000,
          periodicity: "Trimestrielle",
          paymentTerm: "avance",
          status: "active",
          nextDueDate: new Date()
        }
      ];
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch billing plans" });
    }
  });

  // Admin payment flows
  app.get("/api/admin/billing/flows", async (req, res) => {
    try {
      const flows = [
        {
          id: "1",
          contractNumber: "AUX89",
          dueDate: new Date(),
          amount: 32000,
          status: "pending",
          sapExportStatus: "pending"
        }
      ];
      res.json(flows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment flows" });
    }
  });

  // Admin payment proofs
  app.get("/api/admin/billing/proofs", async (req, res) => {
    try {
      const proofs = [
        {
          id: "1",
          contractNumber: "AUX89",
          period: "Q1 2024",
          generatedDate: new Date(),
          status: "generated",
          channel: "Email"
        }
      ];
      res.json(proofs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment proofs" });
    }
  });

  // Admin amendments
  app.get("/api/admin/amendments", async (req, res) => {
    try {
      const amendments = [
        {
          id: "1",
          contractNumber: "AUX89",
          contractTitle: "PARC AUXERROIS",
          amendmentNumber: "AV001",
          type: "Montant",
          requestDate: new Date(),
          requestedBy: "Jean Martin",
          description: "Augmentation du montant suite à l'extension du parc",
          status: "pending",
          impact: {
            financial: true,
            duration: false,
            scope: true
          }
        }
      ];
      res.json(amendments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch amendments" });
    }
  });

  // Admin deadlines
  app.get("/api/admin/deadlines", async (req, res) => {
    try {
      const deadlines = [
        {
          id: "1",
          contractNumber: "AUX89",
          contractTitle: "PARC AUXERROIS",
          type: "Indexation",
          dueDate: new Date(),
          daysRemaining: 1,
          responsible: "Jean Martin",
          priority: "high",
          status: "pending",
          alertSent: true
        }
      ];
      res.json(deadlines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin deadlines" });
    }
  });

  // Admin documents
  app.get("/api/admin/documents", async (req, res) => {
    try {
      const documents = [
        {
          id: "1",
          contractNumber: "AUX89",
          contractTitle: "PARC AUXERROIS",
          documentType: "contrat",
          fileName: "Contrat_AUX89_signe.pdf",
          fileSize: 2400000,
          uploadDate: new Date(),
          uploadedBy: "Marie Dupont",
          version: 1,
          status: "active",
          category: "Contrat"
        }
      ];
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Admin contracts list for dropdown
  app.get("/api/admin/contracts/list", async (req, res) => {
    try {
      const contracts = [
        { id: "1", number: "AUX89", title: "PARC AUXERROIS" },
        { id: "2", number: "FIG83", title: "PARC FIGANIÈRES" },
        { id: "3", number: "SCM29", title: "PARC SCAER LE MERDY" },
        { id: "4", number: "GLB04", title: "PARC GRÉOUX 1" }
      ];
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contracts list" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
