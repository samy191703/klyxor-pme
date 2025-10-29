// server/routes/validation.routes.ts
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "server/auth";
import {
  requirePermission,
  requireValidator,
} from "server/middlewares/authMiddleware";
import { storage } from "server/storage";

import {
  AuditLog,
  insertValidationRequestSchema,
  insertValidationRequestsRuleSchema,
  users,
  validationRequests,
} from "@shared/schema";
import { z } from "zod";

// ⬇️ Use enums for type & status
import {
  ValidationRequestTypes as ValidationRequestType,
  ValidationRequestStatus,
} from "@shared/enums/validation-requests.enum";
import { aliasedTable, eq, ilike, and, desc } from "drizzle-orm";
import { db } from "server/db";
import { generateBillingScheduleForContract } from "server/services/billing.service";

type VStatus =
  (typeof ValidationRequestStatus)[keyof typeof ValidationRequestStatus];

const ALLOWED: Record<VStatus, VStatus[]> = {
  [ValidationRequestStatus.PENDING]: [
    ValidationRequestStatus.APPROVED,
    ValidationRequestStatus.REJECTED,
    ValidationRequestStatus.REDIRECTED,
  ],
  [ValidationRequestStatus.REDIRECTED]: [
    ValidationRequestStatus.PENDING,
    ValidationRequestStatus.APPROVED,
    ValidationRequestStatus.REJECTED,
  ],
  [ValidationRequestStatus.APPROVED]: [],
  [ValidationRequestStatus.REJECTED]: [],
};

const canTransition = (from: VStatus, to: VStatus) =>
  (ALLOWED[from] ?? []).includes(to);

/* ------------------------------------------------------------------ */
/*         ✅ Decision side-effects on underlying entities            */
/* ------------------------------------------------------------------ */
/**
 * Mapping:
 * - contract:
 *    approve → contracts.status = "active"
 *    reject  → contracts.status = "draft"
 * - amendment:
 *    approve → amendments.status = "active"
 *    reject  → amendments.status = "rejected"
 * - termination:
 *    approve → terminations.status = "validated" AND related contracts.status = "terminated"
 *    reject  → terminations.status = "rejected" (contract unchanged)
 * - indexation-proposal: TODO when entity exists
 */
type Decision = "approved" | "rejected";

async function applyDecisionSideEffects(opts: {
  type: string;
  referenceId: string;
  decision: Decision;
  reason?: string | null;
}) {
  const { type, referenceId, decision } = opts;
  try {
    switch (type) {
      case ValidationRequestType.CONTRACT: {
        console.log(referenceId, decision);
        if (decision === "approved") {
          await storage.updateContract?.(referenceId, { status: "active" });
          await generateBillingScheduleForContract({
            contractId: referenceId,
            userId: "system",
          });
        } else {
          await storage.updateContract?.(referenceId, { status: "draft" });
        }
        break;
      }
      case ValidationRequestType.AMENDMENT: {
        if (decision === "approved") {
          await storage.updateAmendment?.(referenceId, { status: "active" });
        } else {
          await storage.updateAmendment?.(referenceId, { status: "rejected" });
        }
        break;
      }
      case ValidationRequestType.TERMINATION: {
        if (decision === "approved") {
          // validate termination
          await storage.updateTermination?.(referenceId, {
            status: "validated",
          });
          // and terminate related contract
          const term = await storage.getTermination?.(referenceId);
          const contractId =
            (term as any)?.contractId ?? (term as any)?.contract_id ?? null;
          if (contractId) {
            await storage.updateContract?.(contractId, {
              status: "terminated",
            });
          }
        } else {
          await storage.updateTermination?.(referenceId, {
            status: "rejected",
          });
        }
        break;
      }
      case ValidationRequestType.INDEXATION: {
        // TODO: implement when indexation-proposals entity exists
        break;
      }
      default:
        // no-op
        break;
    }
  } catch {
    // best-effort; do not block validation endpoints
  }
}

/**
 * @function registerValidationRoutes
 * @description Registers validation-request related HTTP endpoints.
 */
export function registerValidationRoutes(app: Express): void {
  /* ------------------------------------------------------------------ */
  /*                       VALIDATION REQUESTS                          */
  /* ------------------------------------------------------------------ */

  /**
   * @openapi
   * /api/validation-requests:
   *   get:
   *     summary: List validation requests (with filters)
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.get("/api/validation-requests", isAuthenticated, async (req, res) => {
    try {
      const { status, type, assignedTo, requestedBy, referenceId, q } =
        req.query as any;

      const requester = users; // alias 1
      const assignee = aliasedTable(users, "assignee");
      const validator = aliasedTable(users, "validator");

      const conditions = [
        type ? eq(validationRequests.type, type) : undefined,
        assignedTo ? eq(validationRequests.assignedTo, assignedTo) : undefined,
        requestedBy
          ? eq(validationRequests.requestedBy, requestedBy)
          : undefined,
        referenceId
          ? eq(validationRequests.referenceId, referenceId)
          : undefined,
        q ? ilike(validationRequests.subject, `%${q}%`) : undefined,
        // status CSV -> tableau
        status
          ? (validationRequests.status as any).in(
              (status as string).split(",").map((s) => s.trim())
            )
          : undefined,
      ].filter(Boolean) as any[];

      const rows = await db
        .select({
          id: validationRequests.id,
          type: validationRequests.type,
          referenceId: validationRequests.referenceId,
          reference: validationRequests.reference,
          subject: validationRequests.subject,
          requestedBy: validationRequests.requestedBy,
          assignedTo: validationRequests.assignedTo,
          validatedBy: validationRequests.validatedBy,
          status: validationRequests.status,
          reason: validationRequests.reason,
          createdAt: validationRequests.createdAt,
          updatedAt: validationRequests.updatedAt,

          reqUserId: requester.id,
          reqUserName: requester.name,
          reqUserEmail: requester.email,
          asgUserId: assignee.id,
          asgUserName: assignee.name,
          asgUserEmail: assignee.email,
          valUserId: validator.id,
          valUserName: validator.name,
          valUserEmail: validator.email,
        })
        .from(validationRequests)
        .leftJoin(requester, eq(validationRequests.requestedBy, requester.id))
        .leftJoin(assignee, eq(validationRequests.assignedTo, assignee.id))
        .leftJoin(validator, eq(validationRequests.validatedBy, validator.id))
        .where(and(...conditions))
        .orderBy(desc(validationRequests.createdAt));

      const enriched = rows.map((r) => ({
        id: r.id,
        type: r.type,
        referenceId: r.referenceId,
        reference: r.reference,
        subject: r.subject,
        requestedBy: r.requestedBy,
        assignedTo: r.assignedTo,
        validatedBy: r.validatedBy,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,

        requestedByUser: r.reqUserId
          ? { id: r.reqUserId, name: r.reqUserName, email: r.reqUserEmail }
          : null,
        assignedToUser: r.asgUserId
          ? { id: r.asgUserId, name: r.asgUserName, email: r.asgUserEmail }
          : null,
        validatedByUser: r.valUserId
          ? { id: r.valUserId, name: r.valUserName, email: r.valUserEmail }
          : null,
      }));

      res.json(enriched);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch validation requests" });
    }
  });

  /**
   * @openapi
   * /api/validation-requests/{id}:
   *   get:
   *     summary: Get a validation request by ID
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.get(
    "/api/validation-requests/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const item = await storage.getValidationRequest(req.params.id);
        if (!item) return res.status(404).json({ error: "Not found" });
        res.json(item);
      } catch {
        res.status(500).json({ error: "Failed to fetch validation request" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests:
   *   post:
   *     summary: Create a new validation request
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/validation-requests",
    isAuthenticated,
    requirePermission("validation", "create"),
    async (req: Request, res: Response) => {
      try {
        // Back-compat mapping if client still sends title/contractRef
        const payload = {
          ...req.body,
          subject: req.body.subject ?? req.body.title,
          reference: req.body.reference ?? req.body.contractRef,
          requestedBy:
            req.body.requestedBy ??
            (req as any)?.user?.id ??
            (req as any)?.user?.email,
          status: req.body.status ?? ValidationRequestStatus.PENDING,
          age: 0,
        };

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

        const created = await storage.createValidationRequest(parsed.data);

        // 🔎 Audit (non-blocking)
        try {
          await storage.createAuditLog?.({
            user: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_request_created",
            entityType: parsed.data.type,
            entityId: parsed.data.referenceId,
            traceId: `validation-${created.id}`,
            details: JSON.stringify({
              requestId: created.id,
              subject: created.subject,
              assignedTo: created.assignedTo,
              status: created.status,
              reference: created.reference,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          } as any);
        } catch {}

        res.status(201).json(created);
      } catch (error) {
        res.status(500).json({ error: "Failed to create validation request" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/{id}/status:
   *   patch:
   *     summary: Update status with transition rules
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.patch(
    "/api/validation-requests/:id/status",
    isAuthenticated,
    requirePermission("validation", "update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { status } = req.body as { status: VStatus };

        const existing = await storage.getValidationRequest(id);
        if (!existing)
          return res
            .status(404)
            .json({ error: "Validation request not found" });

        const from =
          (existing.status as VStatus) ?? ValidationRequestStatus.PENDING;
        const to = status;
        if (!to || !canTransition(from, to)) {
          return res.status(400).json({
            error: "Invalid status transition",
            message: `Transition ${from} → ${to} interdite`,
          });
        }

        const updated = await storage.updateValidationRequest(id, {
          status: to,
          age: 0,
        });

        // Audit
        try {
          await storage.createAuditLog?.({
            user: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_status_change",
            entityType: existing.type,
            entityId: existing.referenceId,
            traceId: `validation-${id}`,
            details: JSON.stringify({ from, to }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          } as any);
        } catch {}

        res.json(updated);
      } catch {
        res.status(500).json({ error: "Failed to update status" });
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
   */
  app.post(
    "/api/validation-requests/:id/approve",
    isAuthenticated,
    requireValidator,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const existing = await storage.getValidationRequest(id);
        if (!existing)
          return res
            .status(404)
            .json({ error: "Validation request not found" });
        if (
          !canTransition(
            existing.status as VStatus,
            ValidationRequestStatus.APPROVED
          )
        ) {
          return res.status(400).json({
            error: `Request not approvable from ${existing.status}`,
          });
        }

        const request = await storage.updateValidationRequest(id, {
          status: ValidationRequestStatus.APPROVED,
          reason: null,
          validatedBy: (req as any).user?.id || "system",
          validatedAt: new Date(),
          age: 0,
        });

        // 🔁 Side-effects (best-effort, non-blocking)
        void applyDecisionSideEffects({
          type: request!.type,
          referenceId: request!.referenceId,
          decision: "approved",
        });

        try {
          await storage.createAuditLog?.({
            user: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_request_approved",
            traceId: `validation-${id}`,
            entityType: request?.type,
            entityId: request?.referenceId,
            details: JSON.stringify({
              requestId: id,
              reference: request?.reference,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          } as any);
        } catch {}

        res.json(request);
      } catch {
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
          return res
            .status(400)
            .json({ error: "Reason is required (min length 5)" });
        }

        const existing = await storage.getValidationRequest(id);
        if (!existing)
          return res
            .status(404)
            .json({ error: "Validation request not found" });
        if (
          !canTransition(
            existing.status as VStatus,
            ValidationRequestStatus.REJECTED
          )
        ) {
          return res.status(400).json({
            error: `Request not rejectable from ${existing.status}`,
          });
        }

        const request = await storage.updateValidationRequest(id, {
          status: ValidationRequestStatus.REJECTED,
          reason,
          validatedBy: (req as any).user?.id || "system",
          validatedAt: new Date(),
          age: 0,
        });

        // 🔁 Side-effects (best-effort, non-blocking)
        void applyDecisionSideEffects({
          type: request!.type,
          referenceId: request!.referenceId,
          decision: "rejected",
          reason,
        });

        try {
          await storage.createAuditLog?.({
            userId: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_request_rejected",
            traceId: `validation-${id}`,
            entityType: "validation-request",
            entityId: request?.referenceId,
            details: JSON.stringify({
              requestId: id,
              reference: request?.reference,
              reason,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch {}

        res.json(request);
      } catch {
        res.status(500).json({ error: "Failed to reject validation request" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/{id}/redirect:
   *   post:
   *     summary: Redirect a request to another validator and set status 'redirected'
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/validation-requests/:id/redirect",
    isAuthenticated,
    requireValidator,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { assignedTo, reason } = (req.body ?? {}) as {
          assignedTo?: string;
          reason?: string;
        };

        if (!assignedTo) {
          return res
            .status(400)
            .json({ error: "assignedTo is required for redirection" });
        }

        const existing = await storage.getValidationRequest(id);
        if (!existing)
          return res
            .status(404)
            .json({ error: "Validation request not found" });
        if (
          !canTransition(
            existing.status as VStatus,
            ValidationRequestStatus.REDIRECTED
          )
        ) {
          return res.status(400).json({
            error: `Request not redirectable from ${existing.status}`,
          });
        }

        const updated = await storage.updateValidationRequest(id, {
          status: ValidationRequestStatus.REDIRECTED,
          assignedTo,
          reason: reason ?? null,
          validatedBy: null,
          validatedAt: null,
          age: 0,
        });

        try {
          await storage.createAuditLog({
            userId: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_request_redirected",
            traceId: `validation-${id}`,
            entityType: "validation-request",
            entityId: updated?.referenceId,
            details: JSON.stringify({
              requestId: id,
              from: existing.assignedTo ?? null,
              to: assignedTo,
              reason: reason ?? null,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch {}

        res.json(updated);
      } catch {
        res
          .status(500)
          .json({ error: "Failed to redirect validation request" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/{id}/requeue:
   *   post:
   *     summary: Requeue a redirected request back to 'pending'
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/validation-requests/:id/requeue",
    isAuthenticated,
    requireValidator,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const existing = await storage.getValidationRequest(id);
        if (!existing)
          return res
            .status(404)
            .json({ error: "Validation request not found" });
        if (
          !canTransition(
            existing.status as VStatus,
            ValidationRequestStatus.PENDING
          )
        ) {
          return res.status(400).json({
            error: `Request not requeueable from ${existing.status}`,
          });
        }

        const updated = await storage.updateValidationRequest(id, {
          status: ValidationRequestStatus.PENDING,
          age: 0,
        });

        try {
          await storage.createAuditLog({
            userId: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_request_requeued",
            traceId: `validation-${id}`,
            entityType: existing.type,
            entityId: existing.referenceId,
            details: JSON.stringify({
              from: existing.status,
              to: ValidationRequestStatus.PENDING,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          } as any);
        } catch {}

        res.json(updated);
      } catch {
        res.status(500).json({ error: "Failed to requeue validation request" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/bulk:
   *   patch:
   *     summary: Bulk update validation requests
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.patch(
    "/api/validation-requests/bulk",
    isAuthenticated,
    requirePermission("validation", "update"),
    async (req: Request, res: Response) => {
      try {
        const body = z
          .object({
            ids: z.array(z.string().min(1)).min(1),
            patch: z
              .object({
                status: z.nativeEnum(ValidationRequestStatus).optional(),
                assignedTo: z.string().min(1).optional(),
                reason: z.string().optional().nullable(),
              })
              .passthrough(),
          })
          .parse(req.body);

        // optional: validate transitions? (skip for bulk simplicity)
        const updated = await storage.bulkUpdateValidationRequests(
          body.ids,
          body.patch as any
        );

        // Audit (best-effort)
        try {
          await storage.createAuditLog?.({
            user: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "validation_bulk_update",
            traceId: `validation-bulk-${Date.now()}`,
            entityType: "validationRequest",
            entityId: "",
            details: JSON.stringify(body),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          } as any);
        } catch {}

        res.json(updated);
      } catch (e) {
        res.status(400).json({ error: "Invalid bulk payload" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/age-bump:
   *   post:
   *     summary: Increment age for all pending requests (scheduler hook)
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/validation-requests/age-bump",
    isAuthenticated,
    requirePermission("validation", "update"),
    async (_req: Request, res: Response) => {
      try {
        await storage.incrementAgesForPending();
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to increment ages" });
      }
    }
  );

  /* ------------------------------------------------------------------ */
  /*                VALIDATION REQUESTS RULES (Routing)                 */
  /* ------------------------------------------------------------------ */

  // Shared zod for rule updates (partial)
  const updateRuleSchema = insertValidationRequestsRuleSchema.partial().refine(
    (obj) => Object.keys(obj).length > 0 && !("id" in obj), // avoid accidental id changes
    { message: "Empty update or illegal 'id' field" }
  );

  /**
   * @openapi
   * /api/validation-request-rules:
   *   get:
   *     summary: List rules (with filters)
   *     tags: [Validation Rules]
   *     security:
   *       - cookieAuth: []
   */
  app.get(
    "/api/validation-request-rules",
    isAuthenticated,
    requirePermission("validation_rules", "read"),
    async (req: Request, res: Response) => {
      try {
        const { type, isActive, bu, contractType, parkCode, limit, offset } =
          req.query as {
            type?: string;
            isActive?: string;
            bu?: string;
            contractType?: string;
            parkCode?: string;
            limit?: string;
            offset?: string;
          };

        const items = await storage.findValidationRequestRules?.({
          type, // you can also validate against ValidationRequestType if desired
          isActive:
            typeof isActive === "string" ? isActive === "true" : undefined,
          scopeBusinessUnit: bu,
          scopeContractType: contractType,
          scopeParkCode: parkCode,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        });

        res.json(items ?? []);
      } catch {
        res.status(500).json({ error: "Failed to fetch rules" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-request-rules/{id}:
   *   get:
   *     summary: Get one rule
   *     tags: [Validation Rules]
   *     security:
   *       - cookieAuth: []
   */
  app.get(
    "/api/validation-request-rules/:id",
    isAuthenticated,
    requirePermission("validation_rules", "read"),
    async (req: Request, res: Response) => {
      try {
        const rule = await storage.getValidationRequestRule?.(req.params.id);
        if (!rule) return res.status(404).json({ error: "Not found" });
        res.json(rule);
      } catch {
        res.status(500).json({ error: "Failed to fetch rule" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-request-rules:
   *   post:
   *     summary: Create a rule
   *     tags: [Validation Rules]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/validation-request-rules",
    isAuthenticated,
    requirePermission("validation_rules", "create"),
    async (req: Request, res: Response) => {
      try {
        const parsed = insertValidationRequestsRuleSchema.safeParse({
          ...req.body,
          createdBy: (req as any).user?.id ?? null,
        });
        if (!parsed.success) {
          return res.status(400).json({
            error: "Validation error",
            details: parsed.error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          });
        }

        const created = await storage.createValidationRequestRule?.(
          parsed.data
        );
        res.status(201).json(created);
      } catch {
        res.status(500).json({ error: "Failed to create rule" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-request-rules/{id}:
   *   patch:
   *     summary: Update a rule (partial)
   *     tags: [Validation Rules]
   *     security:
   *       - cookieAuth: []
   */
  app.patch(
    "/api/validation-request-rules/:id",
    isAuthenticated,
    requirePermission("validation_rules", "update"),
    async (req: Request, res: Response) => {
      try {
        const patch = updateRuleSchema.parse(req.body);
        const updated = await storage.updateValidationRequestRule?.(
          req.params.id,
          patch
        );
        if (!updated) return res.status(404).json({ error: "Not found" });
        res.json(updated);
      } catch (e) {
        res.status(400).json({ error: "Invalid rule update payload" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-request-rules/{id}:
   *   delete:
   *     summary: Delete a rule
   *     tags: [Validation Rules]
   *     security:
   *       - cookieAuth: []
   */
  app.delete(
    "/api/validation-request-rules/:id",
    isAuthenticated,
    requirePermission("validation_rules", "delete"),
    async (req: Request, res: Response) => {
      try {
        const ok = await storage.deleteValidationRequestRule?.(req.params.id);
        if (!ok) return res.status(404).json({ error: "Not found" });
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to delete rule" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-request-rules/resolve:
   *   post:
   *     summary: Resolve assignee for a request context using active rules
   *     tags: [Validation Rules]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               type: { type: string }
   *               businessUnit: { type: string }
   *               contractType: { type: string }
   *               parkCode: { type: string }
   *               amount: { type: number }
   *     responses:
   *       200:
   *         description: Resolved assignee or null
   */
  app.post(
    "/api/validation-request-rules/resolve",
    isAuthenticated,
    requirePermission("validation_rules", "read"),
    async (req: Request, res: Response) => {
      try {
        const ctx = z
          .object({
            type: z.nativeEnum(ValidationRequestType).or(z.string().min(1)), // tolerate custom types if any
            businessUnit: z.string().optional(),
            contractType: z.string().optional(),
            parkCode: z.string().optional(),
            amount: z.coerce.number().optional(),
          })
          .parse(req.body);

        const result =
          (await storage.resolveValidationAssignee?.(ctx)) ??
          ({ selectedUserId: null, ruleId: null } as any);

        res.json(result);
      } catch {
        res.status(400).json({ error: "Invalid resolve payload" });
      }
    }
  );

  /**
   * @openapi
   * /api/validation-requests/{id}/assign-from-rules:
   *   post:
   *     summary: Auto-assign a request using rules and set status accordingly
   *     tags: [Validation]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/validation-requests/:id/assign-from-rules",
    isAuthenticated,
    requirePermission("validation", "update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const request = await storage.getValidationRequest(id);
        if (!request)
          return res
            .status(404)
            .json({ error: "Validation request not found" });

        // Allow optional overrides in body (e.g., contractType)
        const ctx = {
          type: request.type,
          businessUnit: (req.body?.businessUnit as string) ?? undefined,
          contractType: (req.body?.contractType as string) ?? undefined,
          parkCode: (req.body?.parkCode as string) ?? undefined,
          amount:
            typeof req.body?.amount === "number" ? req.body.amount : undefined,
        };

        const resolved = await storage.resolveValidationAssignee?.(ctx);
        if (!resolved?.selectedUserId) {
          return res.status(409).json({
            error: "No matching rule/assignee for this context",
            context: ctx,
          });
        }

        const updated = await storage.updateValidationRequest(id, {
          assignedTo: resolved.selectedUserId,
          // keep status unchanged (usually 'pending' or 'redirected')
          age: 0,
        });

        res.json({
          ok: true,
          request: updated,
          assignedTo: resolved.selectedUserId,
          ruleId: resolved.ruleId ?? null,
        });
      } catch {
        res.status(500).json({ error: "Failed to assign from rules" });
      }
    }
  );
}
