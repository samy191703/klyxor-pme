// server/routes/terminations-routes.ts
import type { Express, Request, Response } from "express";
import { storage } from "server/storage";
import { isAuthenticated } from "server/auth";
import { requirePermission } from "server/middlewares/authMiddleware";
import {
  contracts,
  Termination,
  terminations,
  users,
  type InsertTermination,
} from "@shared/schema";
import { aliasedTable, eq, desc } from "drizzle-orm";
import { db } from "server/db";
import {
  ValidationRequestTypes,
  ValidationRequestStatus,
} from "@shared/enums/validation-requests.enum";
import { safeUserId } from "server/utils/helpers";

// ✅ Statuts & transitions autorisées
const TerminationStatus = {
  DRAFT: "draft",
  PENDING_VALIDATION: "pending_validation",
  VALIDATED: "validated",
  REJECTED: "rejected",
  EXECUTED: "executed",
} as const;

type TStatus = (typeof TerminationStatus)[keyof typeof TerminationStatus];

const ALLOWED: Record<TStatus, TStatus[]> = {
  draft: ["pending_validation", "rejected"],
  pending_validation: ["validated", "rejected", "draft"],
  validated: ["executed"],
  rejected: ["draft"],
  executed: [],
};

function canTransition(from: TStatus, to: TStatus) {
  return ALLOWED[from]?.includes(to) ?? false;
}

// Simple coercions
const toDate = (v: any) => (v ? new Date(v) : null);

export function registerTerminationRoutes(app: Express): void {
  /**
   * @openapi
   * /api/terminations:
   *   get:
   *     summary: List terminations
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.get(
    "/api/terminations",
    isAuthenticated,
    async (_req: Request, res: Response) => {
      try {
        // Aliases for multi-join on users
        const validator = aliasedTable(users, "validator");
        const assignee = aliasedTable(users, "assignee");
        const executor = aliasedTable(users, "executor");

        const rows = await db
          .select({
            // core termination fields
            id: terminations.id,
            contractId: terminations.contractId,
            number: terminations.number,
            reason: terminations.reason,
            type: terminations.type,
            status: terminations.status,
            effectiveDate: terminations.effectiveDate,
            noticeDate: terminations.noticeDate,
            compensationAmount: terminations.compensationAmount,
            description: terminations.description,
            rejectionReason: terminations.rejectionReason,
            requestedBy: terminations.requestedBy,
            validatedBy: terminations.validatedBy,
            validatedAt: terminations.validatedAt,
            assignedValidator: terminations.assignedValidator,
            executedBy: terminations.executedBy,
            executedAt: terminations.executedAt,
            createdAt: terminations.createdAt,
            updatedAt: terminations.updatedAt,

            // 🔗 joins
            contractNumber: contracts.number,

            // requester
            reqUserId: users.id,
            reqUserName: users.name,
            reqUserEmail: users.email,

            // validator
            valUserId: validator.id,
            valUserName: validator.name,
            valUserEmail: validator.email,

            // assigned validator
            asgUserId: assignee.id,
            asgUserName: assignee.name,
            asgUserEmail: assignee.email,

            // executor
            exeUserId: executor.id,
            exeUserName: executor.name,
            exeUserEmail: executor.email,
          })
          .from(terminations)
          .leftJoin(contracts, eq(terminations.contractId, contracts.id))
          .leftJoin(users, eq(terminations.requestedBy, users.id))
          .leftJoin(validator, eq(terminations.validatedBy, validator.id))
          .leftJoin(assignee, eq(terminations.assignedValidator, assignee.id))
          .leftJoin(executor, eq(terminations.executedBy, executor.id))
          .orderBy(desc(terminations.createdAt)); // ✅ newest first

        // Nest user objects (same style as amendments)
        const enriched = rows.map((r) => ({
          id: r.id,
          contractId: r.contractId,
          contractNumber: r.contractNumber ?? null,

          number: r.number,
          reason: r.reason,
          type: r.type,
          status: r.status,
          effectiveDate: r.effectiveDate,
          noticeDate: r.noticeDate,
          compensationAmount: r.compensationAmount,
          description: r.description,
          rejectionReason: r.rejectionReason,

          validatedAt: r.validatedAt,
          executedAt: r.executedAt,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,

          requestedByUser: r.reqUserId
            ? { id: r.reqUserId, name: r.reqUserName, email: r.reqUserEmail }
            : null,
          validatedByUser: r.valUserId
            ? { id: r.valUserId, name: r.valUserName, email: r.valUserEmail }
            : null,
          assignedValidatorUser: r.asgUserId
            ? { id: r.asgUserId, name: r.asgUserName, email: r.asgUserEmail }
            : null,
          executedByUser: r.exeUserId
            ? { id: r.exeUserId, name: r.exeUserName, email: r.exeUserEmail }
            : null,
        }));

        res.json(enriched);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch terminations" });
      }
    }
  );

  /**
   * @openapi
   * /api/terminations/{id}:
   *   get:
   *     summary: Get termination by ID
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.get("/api/terminations/:id", isAuthenticated, async (req, res) => {
    try {
      const t = await storage.getTermination(req.params.id);
      if (!t) return res.status(404).json({ error: "Termination not found" });
      res.json(t);
    } catch {
      res.status(500).json({ error: "Failed to fetch termination" });
    }
  });

  /**
   * @openapi
   * /api/contracts/{contractId}/terminations:
   *   get:
   *     summary: List terminations for a contract
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.get(
    "/api/contracts/:contractId/terminations",
    isAuthenticated,
    async (req, res) => {
      try {
        const exists = await storage.getContract(req.params.contractId);
        if (!exists)
          return res.status(404).json({ error: "Contract not found" });
        const list = await storage.getTerminationsByContractId(
          req.params.contractId
        );
        res.json(list);
      } catch {
        res
          .status(500)
          .json({ error: "Failed to fetch contract terminations" });
      }
    }
  );

  /**
   * @openapi
   * /api/terminations:
   *   post:
   *     summary: Create termination (draft or pending_validation)
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/terminations",
    requirePermission("terminations", "create"),
    async (req: Request, res: Response) => {
      try {
        const {
          contractId,
          number,
          reason,
          type,
          effectiveDate,
          noticeDate,
          compensationAmount,
          description,
          submit,
        } = req.body as Partial<InsertTermination> & { submit?: boolean };

        // 🔎 Required + contract exists
        if (!contractId) {
          return res.status(400).json({ error: "contractId is required" });
        }
        const contract = await storage.getContract(contractId);
        if (!contract) {
          return res.status(404).json({ error: "Contract not found" });
        }
        if (!reason || !type || !effectiveDate) {
          return res.status(400).json({
            error: "Missing required fields (reason, type, effectiveDate)",
          });
        }

        // Number generation
        let resolvedNumber = number ?? null;
        try {
          const { TerminationNumberGenerator } = await import(
            "../services/references-generator/terminationNumberGenerator"
          );
          resolvedNumber =
            resolvedNumber ??
            (await TerminationNumberGenerator.generateTerminationNumber(
              contractId
            ));
        } catch {
          const year = new Date().getFullYear();
          resolvedNumber =
            resolvedNumber || `RE-${year}-${Date.now().toString().slice(-5)}`;
        }

        // We currently set everything to pending_validation (as before)
        const status: Termination["status"] = "pending_validation";

        const insert: InsertTermination = {
          contractId,
          number: String(resolvedNumber),
          reason: String(reason),
          type: String(type),
          effectiveDate: new Date(effectiveDate as any),
          status,
          noticeDate: toDate(noticeDate),
          compensationAmount:
            compensationAmount != null ? String(compensationAmount) : undefined,
          description: description ?? null,
          requestedBy: safeUserId(req) || "system",
          validatedBy: null,
          validatedAt: null,
          executedBy: null,
          rejectionReason: null,
        };

        const created = await storage.createTermination(insert);

        // 🔔 Validation request trigger (like contracts)
        if (created.status === "pending_validation") {
          const ctx = {
            type: ValidationRequestTypes.TERMINATION, // "termination"
            businessUnit: contract.businessUnit,
            contractType: contract.type,
            parkCode: contract.parkCode ?? undefined,
            amount:
              created.compensationAmount != null
                ? Number(created.compensationAmount)
                : undefined,
          };

          const { selectedUserId } = await storage.resolveValidationAssignee(
            ctx
          );

          let finalAssignee = selectedUserId;
          if (!finalAssignee) {
            const allUsers = await storage.getUsers();
            const fallbackValidator = allUsers.find(
              (u) => u.role === "validator"
            );
            finalAssignee = fallbackValidator?.id || null;
          }

          if (!finalAssignee) {
            throw new Error("No validator found for termination approval.");
          }

          await storage.createValidationRequest({
            type: "termination",
            referenceId: created.id,
            reference: created.number,
            subject: `Termination validation — ${created.number}`,
            requestedBy: safeUserId(req) || "system",
            assignedTo: finalAssignee,
            status:
              (ValidationRequestStatus as any)?.PENDING ?? ("pending" as any),
          });
        }

        // 🧾 Audit log (best-effort)
        try {
          await storage.createAuditLog?.({
            userId: safeUserId(req) || "system",
            username: (req as any)?.user?.name || "system",
            action: "create",
            entityType: "termination",
            entityId: created.id,
            traceId: `termination-${created.id}`,
            details: JSON.stringify({
              number: created.number,
              status: created.status,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch {}

        res.json(created);
      } catch (error: any) {
        const isDup =
          error?.code === "23505" &&
          String(error?.detail || "").includes("(number)");
        if (isDup) {
          return res.status(409).json({
            error: "Duplicate",
            field: "number",
            message: "Ce numéro de résiliation est déjà utilisé.",
            detail: error?.detail,
          });
        }
        res.status(500).json({ error: "Failed to create termination" });
      }
    }
  );

  /**
   * @openapi
   * /api/terminations/{id}:
   *   put:
   *     summary: Replace a termination (full payload)
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.put(
    "/api/terminations/:id",
    isAuthenticated,
    requirePermission("terminations", "update"),
    async (req, res) => {
      try {
        const existing = await storage.getTermination(req.params.id);
        if (!existing)
          return res.status(404).json({ error: "Termination not found" });

        // Règle: on autorise le replace seulement en draft/rejected
        if (!["draft", "rejected"].includes(existing.status)) {
          return res.status(400).json({
            error:
              "Seules les résiliations en brouillon ou rejetées sont modifiables",
          });
        }

        const payload = {
          ...req.body,
          effectiveDate: req.body.effectiveDate
            ? new Date(req.body.effectiveDate)
            : undefined,
          noticeDate: req.body.noticeDate
            ? new Date(req.body.noticeDate)
            : undefined,
          updatedAt: new Date(),
        };

        const updated = await storage.updateTermination(req.params.id, payload);
        res.json(updated);
      } catch (e) {
        res.status(500).json({ error: "Failed to update termination" });
      }
    }
  );

  /**
   * @openapi
   * /api/terminations/{id}:
   *   patch:
   *     summary: Partially update a termination
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.patch(
    "/api/terminations/:id",
    isAuthenticated,
    requirePermission("terminations", "update"),
    async (req, res) => {
      try {
        const existing = await storage.getTermination(req.params.id);
        if (!existing)
          return res.status(404).json({ error: "Termination not found" });

        const patch: Record<string, unknown> = {};
        const fields = [
          "reason",
          "type",
          "description",
          "compensationAmount",
          "rejectionReason",
        ] as const;

        for (const f of fields) {
          if (req.body[f] !== undefined) patch[f] = req.body[f];
        }
        if (req.body.effectiveDate !== undefined) {
          patch.effectiveDate = req.body.effectiveDate
            ? new Date(req.body.effectiveDate)
            : null;
        }
        if (req.body.noticeDate !== undefined) {
          patch.noticeDate = req.body.noticeDate
            ? new Date(req.body.noticeDate)
            : null;
        }
        patch.updatedAt = new Date();

        const updated = await storage.updateTermination(req.params.id, patch);
        res.json(updated);
      } catch {
        res.status(500).json({ error: "Failed to patch termination" });
      }
    }
  );

  /**
   * @openapi
   * /api/terminations/{id}:
   *   delete:
   *     summary: Delete a termination (draft/rejected only)
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.delete(
    "/api/terminations/:id",
    requirePermission("terminations", "delete"),
    async (req, res) => {
      try {
        const existing = await storage.getTermination(req.params.id);
        if (!existing)
          return res.status(404).json({ error: "Termination not found" });

        if (!["draft", "rejected"].includes(existing.status)) {
          return res.status(400).json({
            error:
              "Seules les résiliations en brouillon ou rejetées peuvent être supprimées",
          });
        }

        await storage.deleteTermination(req.params.id);
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to delete termination" });
      }
    }
  );

  /**
   * @openapi
   * /api/terminations/{id}/status:
   *   patch:
   *     summary: Update termination status (with transition rules)
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.patch(
    "/api/terminations/:id/status",
    isAuthenticated,
    requirePermission("terminations", "update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { status, reason } = req.body as {
          status: TStatus;
          reason?: string;
        };

        const existing = await storage.getTermination(id);
        if (!existing)
          return res.status(404).json({ error: "Termination not found" });

        const from = (existing.status as TStatus) ?? TerminationStatus.DRAFT;
        const to = status;

        if (!to || !canTransition(from, to)) {
          return res.status(400).json({
            error: "Invalid status transition",
            message: `Transition ${from} → ${to} interdite`,
          });
        }

        // Préconditions simples
        if (to === TerminationStatus.PENDING_VALIDATION) {
          const errs: string[] = [];
          if (!existing.reason) errs.push("Motif requis");
          if (!existing.effectiveDate) errs.push("Date d'effet requise");
          if (errs.length) {
            return res.status(400).json({
              error: "Préconditions non respectées",
              message: errs.join("; "),
            });
          }
        }

        const updated = await storage.updateTermination(id, {
          status: to,
          updatedAt: new Date(),
        });

        // Audit
        try {
          await storage.createAuditLog?.({
            userId: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "status_change",
            entityType: "termination",
            entityId: id,
            traceId: `termination-${id}`,
            details: JSON.stringify({ from, to, reason: reason || null }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch {}

        return res.json(updated);
      } catch (err) {
        return res
          .status(500)
          .json({ error: "Failed to set termination status" });
      }
    }
  );

  /**
   * @openapi
   * /api/terminations/{id}/decision:
   *   post:
   *     summary: Validate or reject a termination
   *     description: Sets status to `validated` or `rejected`, records validator & timestamps.
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/terminations/:id/decision",
    isAuthenticated,
    requirePermission("terminations", "update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { decision, rejectionReason } = req.body as {
          decision: "validate" | "reject";
          rejectionReason?: string;
        };

        const t = await storage.getTermination(id);
        if (!t) return res.status(404).json({ error: "Termination not found" });
        if (t.status !== "pending_validation") {
          return res
            .status(400)
            .json({ error: "Termination not in pending_validation" });
        }

        if (decision === "reject" && !rejectionReason) {
          return res
            .status(400)
            .json({ error: "rejectionReason is required when rejecting" });
        }

        const patch: any =
          decision === "validate"
            ? {
                status: "validated",
                validatedBy: (req as any).user?.id || "system",
                validatedAt: new Date(),
                rejectionReason: null,
                updatedAt: new Date(),
              }
            : {
                status: "rejected",
                validatedBy: (req as any).user?.id || "system",
                validatedAt: new Date(),
                rejectionReason: String(rejectionReason),
                updatedAt: new Date(),
              };

        const updated = await storage.updateTermination(id, patch);

        // Audit
        try {
          await storage.createAuditLog?.({
            userId: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: decision === "validate" ? "validate" : "reject",
            entityType: "termination",
            entityId: id,
            traceId: `termination-${id}`,
            details: JSON.stringify({
              decision,
              rejectionReason: rejectionReason ?? null,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch {}

        res.json(updated);
      } catch {
        res.status(500).json({ error: "Failed to apply decision" });
      }
    }
  );

  /**
   * @openapi
   * /api/terminations/{id}/execute:
   *   post:
   *     summary: Execute a validated termination (apply on contract)
   *     description: Sets status to `executed`, records executor & date, and marks contract as terminated.
   *     tags: [Terminations]
   *     security:
   *       - cookieAuth: []
   */
  app.post(
    "/api/terminations/:id/execute",
    isAuthenticated,
    requirePermission("terminations", "update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const t = await storage.getTermination(id);
        if (!t) return res.status(404).json({ error: "Termination not found" });
        if (t.status !== "validated") {
          return res
            .status(400)
            .json({ error: "Termination must be validated before execution" });
        }

        const executed = await storage.updateTermination(id, {
          status: "executed",
          executedBy: (req as any).user?.id || "system",
          executedAt: new Date(),
          updatedAt: new Date(),
        });

        // ⚙️ Appliquer sur le contrat (best-effort)
        try {
          await storage.updateContract(t.contractId, {
            status: "terminated",
            endDate: t.effectiveDate ?? new Date(),
            updatedAt: new Date(),
          });
        } catch (e) {
          // Non bloquant — on log seulement
          console.warn("Failed to update contract on termination execution", e);
        }

        // Audit
        try {
          await storage.createAuditLog?.({
            userId: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "execute",
            entityType: "termination",
            entityId: id,
            traceId: `termination-${id}`,
            details: JSON.stringify({ appliedToContract: t.contractId }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch {}

        res.json(executed);
      } catch {
        res.status(500).json({ error: "Failed to execute termination" });
      }
    }
  );
}
