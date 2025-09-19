// server/routes/validation.routes.ts

import type { Express, Request, Response } from "express";
import { isAuthenticated } from "server/auth";
import {
  requirePermission,
  requireValidator,
} from "server/middlewares/authMiddleware";
import { storage } from "server/storage";

// Use your shared Zod schema so we always match the DB
import { insertValidationRequestSchema } from "@shared/schema";
import { z } from "zod";

/**
 * @function registerValidationRoutes
 * @description Registers validation-request related HTTP endpoints.
 * @param app Express application instance.
 */
export function registerValidationRoutes(app: Express): void {
  /**
   * @openapi
   * /api/validation-requests:
   *   get:
   *     summary: List validation requests
   *     description: Returns all validation requests visible to the current user.
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, approved, rejected, redirected, in_progress, canceled]
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *         description: contract | indexation | amendment | termination | manual_amount
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Free-text search on subject/reference
   *     responses:
   *       200:
   *         description: List of validation requests
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/validation-requests",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { status, type, q } = req.query as {
          status?: string;
          type?: string;
          q?: string;
        };

        const items = await storage.getValidationRequests();
        const filtered = items.filter((r: any) => {
          if (status && r.status !== status) return false;
          if (type && r.type !== type) return false;
          if (q) {
            const s = String(q).toLowerCase();
            const hay = `${r.subject ?? ""} ${r.reference ?? ""} ${
              r.referenceId ?? ""
            }`.toLowerCase();
            if (!hay.includes(s)) return false;
          }
          return true;
        });

        res.json(filtered);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch validation requests" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests:
   *   post:
   *     summary: Create a new validation request
   *     description: Creates a validation request and logs an audit entry.
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [type, subject, referenceId, reference, assignedTo]
   *             properties:
   *               type:
   *                 type: string
   *                 example: contract
   *               subject:
   *                 type: string
   *                 example: "Validation du contrat CT-2025-00123"
   *               referenceId:
   *                 type: string
   *                 description: Related entity ID (e.g., contract ID)
   *               reference:
   *                 type: string
   *                 description: Human-readable reference (e.g., contract number)
   *               assignedTo:
   *                 type: string
   *                 description: Validator user ID (main validator)
   *               status:
   *                 type: string
   *                 enum: [pending, approved, rejected, redirected]
   *                 default: pending
   *               reason:
   *                 type: string
   *                 description: Optional initial reason/notes
   *     responses:
   *       201:
   *         description: Validation request created
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/validation-requests",
    isAuthenticated,
    requirePermission("validation", "create"),
    async (req: Request, res: Response) => {
      try {
        // Map legacy client payload (title/contractRef) to schema fields if they are sent.
        const payload = {
          ...req.body,
          subject: req.body.subject ?? req.body.title, // backwards compat
          reference: req.body.reference ?? req.body.contractRef, // backwards compat
          requestedBy:
            req.body.requestedBy ??
            (req as any)?.user?.id ??
            (req as any)?.user?.email,
          status: req.body.status ?? "pending",
        };

        // Validate strictly against your insert schema (omitting DB-generated fields)
        const parsed = insertValidationRequestSchema.safeParse(payload);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Validation error",
            details: parsed.error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          });
        }

        // Persist (Drizzle will generate id/createdAt/age)
        const created = await storage.createValidationRequest(parsed.data);

        // AUDIT LOG (match your contract submit-for-validation pattern)
        try {
          await storage.createAuditLog?.({
            user: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_request_created",
            traceId: `validation-${created.id || "unknown"}`,
            entityType: parsed.data.type,
            entityId: parsed.data.referenceId,
            details: JSON.stringify({
              requestId: created.id,
              subject: parsed.data.subject,
              assignedTo: parsed.data.assignedTo,
              status: parsed.data.status,
              reference: parsed.data.reference,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch (e) {
          // non-blocking
          console.warn("Failed to write audit log for validation creation", e);
        }

        res.status(201).json({
          success: true,
          message: "Demande de validation créée",
          request: created,
        });
      } catch (error) {
        console.error("POST /api/validation-requests error:", error);
        res.status(500).json({ error: "Failed to create validation request" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/{id}/workflow:
   *   get:
   *     summary: Get validation workflow status
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Workflow status
   *       404:
   *         description: Validation request not found
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/validation-requests/:id/workflow",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const requests = await storage.getValidationRequests();
        const reqItem = requests.find((r: any) => r.id === id);
        if (!reqItem) {
          return res
            .status(404)
            .json({ error: "Validation request not found" });
        }

        // Replace by a real workflow if you store it; keep a light, non-breaking shape meanwhile
        const workflow = {
          requestId: id,
          currentStep: 1,
          totalSteps: 3,
          steps: [
            {
              step: 1,
              name: "Revue",
              assignee: reqItem.assignedTo,
              status:
                reqItem.status === "pending" ? "in_progress" : "completed",
            },
            {
              step: 2,
              name: "Validation financière",
              assignee: null,
              status: "pending",
            },
            {
              step: 3,
              name: "Approbation finale",
              assignee: null,
              status: "pending",
            },
          ],
          history: [
            {
              action: "created",
              by: reqItem.requestedBy,
              at: reqItem.createdAt,
              details: reqItem.subject,
            },
          ],
        };

        res.json(workflow);
      } catch (error) {
        console.error(
          "GET /api/validation-requests/:id/workflow error:",
          error
        );
        res.status(500).json({ error: "Failed to fetch workflow status" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/{id}/approve:
   *   post:
   *     summary: Approve a validation request
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Request approved
   *       404:
   *         description: Validation request not found
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/validation-requests/:id/approve",
    isAuthenticated,
    requireValidator,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const request = await storage.updateValidationRequest(id, {
          status: "approved",
          reason: null,
        });

        if (!request) {
          return res
            .status(404)
            .json({ error: "Validation request not found" });
        }

        // AUDIT LOG (same pattern as contracts)
        try {
          await storage.createAuditLog?.({
            user: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_request_approved",
            traceId: `validation-${id}`,
            entityType: request.type,
            entityId: request.referenceId,
            details: JSON.stringify({
              requestId: id,
              reference: request.reference,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch (e) {
          console.warn("Failed to write audit log (approve)", e);
        }

        res.json(request);
      } catch (error) {
        console.error(
          "POST /api/validation-requests/:id/approve error:",
          error
        );
        res.status(500).json({ error: "Failed to approve validation request" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/{id}/reject:
   *   post:
   *     summary: Reject a validation request
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 5
   *                 example: "Non conforme aux conditions financières"
   *     responses:
   *       200:
   *         description: Request rejected
   *       400:
   *         description: Validation error
   *       404:
   *         description: Validation request not found
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/validation-requests/:id/reject",
    isAuthenticated,
    requireValidator,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { reason } = (req.body ?? {}) as { reason?: string };

        if (!reason || String(reason).trim().length < 5) {
          return res.status(400).json({
            error: "Reason is required (min length 5)",
          });
        }

        const request = await storage.updateValidationRequest(id, {
          status: "rejected",
          reason,
        });

        if (!request) {
          return res
            .status(404)
            .json({ error: "Validation request not found" });
        }

        // AUDIT LOG (same pattern as contracts)
        try {
          await storage.createAuditLog?.({
            user: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_request_rejected",
            traceId: `validation-${id}`,
            entityType: request.type,
            entityId: request.referenceId,
            details: JSON.stringify({
              requestId: id,
              reference: request.reference,
              reason,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch (e) {
          console.warn("Failed to write audit log (reject)", e);
        }

        res.json(request);
      } catch (error) {
        console.error("POST /api/validation-requests/:id/reject error:", error);
        res.status(500).json({ error: "Failed to reject validation request" });
      }
    }
  );
}
