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

  // Get indexations
  app.get("/api/indexations", async (req, res) => {
    try {
      const indexations = await storage.getIndexations();
      res.json(indexations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch indexations" });
    }
  });

  // AI Help routes
  app.use('/api/ai-help', aiHelpRouter);

  const httpServer = createServer(app);
  return httpServer;
}
