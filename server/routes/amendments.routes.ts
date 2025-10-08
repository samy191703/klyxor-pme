// server/routes/amendments-routes.ts

import type { Express, Request, Response } from "express";
import { z } from "zod";

import { storage } from "server/storage";
import { isAuthenticated } from "server/auth";
import { requirePermission } from "server/middlewares/authMiddleware";
import { sql, eq, desc, aliasedTable } from "drizzle-orm";
import { db } from "server/db";
import { amendments, contracts, users } from "@shared/schema";

// ---- Small helpers ---------------------------------------------------------
import { relations } from "drizzle-orm";

export const contractsRelations = relations(contracts, ({ many }) => ({
  amendments: many(amendments),
}));

export const amendmentsRelations = relations(amendments, ({ one }) => ({
  contract: one(contracts, {
    fields: [amendments.contractId],
    references: [contracts.id],
  }),
  requester: one(users, {
    fields: [amendments.requestedBy],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [amendments.approvedBy],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  requestedAmendments: many(amendments),
  approvedAmendments: many(amendments),
}));

const toDateOrNull = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

const safeUserId = (req: Request) => (req as any)?.user?.id || "system";

// Allowed transitions for amendments:
// draft -> pending_signature
// pending_signature -> active | rejected
// rejected -> draft (optional, for rework)
// active -> (no forward transitions here)
const AmendmentStatusEnum = z.enum([
  "draft",
  "pending_signature",
  "active",
  "rejected",
]);
type AmendmentStatus = z.infer<typeof AmendmentStatusEnum>;

const AmendmentTypeEnum = z.enum([
  "price_revision",
  "scope_change",
  "duration_extension",
  "indexation_change",
]);

// Treat "", null, undefined as undefined; otherwise parse number.
const numberOrUndef = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.number()
);

// Base object (ZodObject) so we can reuse for both create and update.
const amendmentUpsertBase = z.object({
  contractId: z.string().uuid(),
  type: AmendmentTypeEnum,

  // Optional by default; enforced conditionally inside superRefine.
  title: z.string().optional().default(""),
  description: z.string().optional().default(""),

  status: AmendmentStatusEnum.optional(), // creation defaults to draft in route
  effectiveDate: z.string().optional(), // later coerced with toDateOrNull

  // Accept string or number; do not coerce "" -> 0.
  originalAmount: numberOrUndef.optional(),
  newAmount: numberOrUndef.optional(),

  // Kept for backward-compat (UI no longer sends it).
  impactDescription: z.string().optional(),

  requestedBy: z.string().uuid().optional(),
  approvedBy: z.string().uuid().nullable().optional(),
  signedDate: z.string().optional(),
});

// CREATE schema (POST): enforce **full** requirements by type
const amendmentCreateSchema = amendmentUpsertBase.superRefine((d, ctx) => {
  switch (d.type) {
    case "price_revision": {
      /*  if (!d.effectiveDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["effectiveDate"],
          message: "La date d'effet est requise pour une révision de prix.",
        });
      } */
      if (d.originalAmount == null || Number.isNaN(d.originalAmount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["originalAmount"],
          message: "Le montant original est requis et doit être numérique.",
        });
      }
      if (d.newAmount == null || Number.isNaN(d.newAmount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newAmount"],
          message: "Le nouveau montant est requis et doit être numérique.",
        });
      }
      break;
    }

    case "duration_extension": {
      if (!d.effectiveDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["effectiveDate"],
          message:
            "La nouvelle date d'effet est requise pour une extension de durée.",
        });
      }
      break;
    }

    case "scope_change": {
      if (!d.title?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["title"],
          message: "Le titre est requis pour un changement de périmètre.",
        });
      }
      if (!d.description?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["description"],
          message:
            "La description est requise pour un changement de périmètre.",
        });
      }
      break;
    }

    case "indexation_change": {
      // Aucun champ supplémentaire requis
      break;
    }
  }
});

// UPDATE schema (PUT/PATCH): allow partial payloads.
// Only validate fields **if provided**; type-specific checks apply only if `type` is provided.
const amendmentUpdateSchema = amendmentUpsertBase
  .partial()
  .superRefine((d, ctx) => {
    if (!d.type) return; // If type not provided, skip type-specific checks.

    switch (d.type) {
      case "price_revision": {
        if ("effectiveDate" in d && !d.effectiveDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["effectiveDate"],
            message: "La date d'effet ne peut pas être vide.",
          });
        }
        if (
          "originalAmount" in d &&
          (d.originalAmount == null || Number.isNaN(d.originalAmount))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["originalAmount"],
            message: "Le montant original doit être numérique.",
          });
        }
        if (
          "newAmount" in d &&
          (d.newAmount == null || Number.isNaN(d.newAmount))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["newAmount"],
            message: "Le nouveau montant doit être numérique.",
          });
        }
        break;
      }

      case "duration_extension": {
        if ("effectiveDate" in d && !d.effectiveDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["effectiveDate"],
            message: "La nouvelle date d'effet ne peut pas être vide.",
          });
        }
        break;
      }

      case "scope_change": {
        if ("title" in d && !d.title?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["title"],
            message: "Le titre ne peut pas être vide.",
          });
        }
        if ("description" in d && !d.description?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["description"],
            message: "La description ne peut pas être vide.",
          });
        }
        break;
      }

      case "indexation_change": {
        // nothing extra
        break;
      }
    }
  });

function makeSetAmendmentStatusSchema(current: AmendmentStatus) {
  const schema = z.object({
    status: AmendmentStatusEnum,
    reason: z.string().max(500).optional(),
    approvedBy: z.string().uuid().optional(), // when moving to active
    signedDate: z.string().optional(), // ISO date-time or yyyy-mm-dd
  });

  return {
    safeParse(payload: unknown) {
      const parsed = schema.safeParse(payload);
      if (!parsed.success) return parsed;

      const { status } = parsed.data;

      // Validate transition
      const valid =
        (current === "draft" && status === "pending_signature") ||
        (current === "pending_signature" &&
          (status === "active" || status === "rejected")) ||
        (current === "rejected" && status === "draft") ||
        status === current; // allow idempotent

      if (!valid) {
        return {
          success: false as const,
          error: {
            errors: [
              {
                path: ["status"],
                message: `Transition invalide: ${current} -> ${status}`,
              },
            ],
          },
        };
      }

      return { success: true as const, data: parsed.data };
    },
  };
}

// ---- Route Registrar --------------------------------------------------------

export function registerAmendmentRoutes(app: Express): void {
  /**
   * @openapi
   * /api/amendments:
   *   get:
   *     summary: List amendments
   *     tags: [Amendments]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200: { description: List of amendments }
   *       500: { description: Server error }
   */
  app.get(
    "/api/amendments",
    isAuthenticated,
    async (_req: Request, res: Response) => {
      try {
        const approver = aliasedTable(users, "approver");

        const rows = await db
          .select({
            id: amendments.id,
            contractId: amendments.contractId,
            number: amendments.number,
            type: amendments.type,
            title: amendments.title,
            description: amendments.description,
            status: amendments.status,
            effectiveDate: amendments.effectiveDate,
            originalAmount: amendments.originalAmount,
            newAmount: amendments.newAmount,
            impactDescription: amendments.impactDescription,
            requestedBy: amendments.requestedBy,
            approvedBy: amendments.approvedBy,
            signedDate: amendments.signedDate,
            createdAt: amendments.createdAt,
            updatedAt: amendments.updatedAt,

            // 🔗 joins
            contractNumber: contracts.number,

            requestedByUserId: users.id,
            requestedByName: users.name,
            requestedByEmail: users.email,

            approvedByUserId: approver.id,
            approvedByName: approver.name,
            approvedByEmail: approver.email,
          })
          .from(amendments)
          .leftJoin(contracts, eq(amendments.contractId, contracts.id))
          .leftJoin(users, eq(amendments.requestedBy, users.id))
          .leftJoin(approver, eq(amendments.approvedBy, approver.id))
          .orderBy(desc(amendments.createdAt)); // ✅ newest first

        // Optional: nest requester/approver in objects
        const enriched = rows.map((r) => ({
          ...r,
          requestedByUser: r.requestedByUserId
            ? {
                id: r.requestedByUserId,
                name: r.requestedByName,
                email: r.requestedByEmail,
              }
            : null,
          approvedByUser: r.approvedByUserId
            ? {
                id: r.approvedByUserId,
                name: r.approvedByName,
                email: r.approvedByEmail,
              }
            : null,
        }));

        res.json(enriched);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch amendments" });
      }
    }
  );

  /**
   * @openapi
   * /api/amendments/{id}:
   *   get:
   *     summary: Get an amendment by ID
   *     tags: [Amendments]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Amendment found }
   *       404: { description: Amendment not found }
   *       500: { description: Server error }
   */
  app.get(
    "/api/amendments/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const amendment = await storage.getAmendment(req.params.id);
        if (!amendment) {
          return res.status(404).json({ error: "Amendment not found" });
        }
        res.json(amendment);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch amendment" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{contractId}/amendments:
   *   get:
   *     summary: List amendments for a contract
   *     tags: [Amendments]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: contractId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Amendments list }
   *       500: { description: Server error }
   */
  app.get(
    "/api/contracts/:contractId/amendments",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const amendments = await storage.getAmendmentsByContractId(
          req.params.contractId
        );
        res.json(amendments);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch contract amendments" });
      }
    }
  );

  /**
   * @openapi
   * /api/amendments:
   *   post:
   *     summary: Create an amendment (draft)
   *     tags: [Amendments]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200: { description: Amendment created }
   *       400: { description: Validation error }
   *       500: { description: Server error }
   */
  app.post(
    "/api/amendments",
    requirePermission("amendments", "create"),
    async (req: Request, res: Response) => {
      try {
        const parsed = amendmentCreateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Données invalides",
            errors: parsed.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          });
        }
        const d = parsed.data;

        // Generate amendment number if not provided
        let resolvedNumber = "AVN-" + Date.now(); // fallback
        try {
          const { AmendmentNumberGenerator } = await import(
            "../services/references-generator/amendmentNumberGenerator"
          );

          const number = await AmendmentNumberGenerator.generateAmendmentNumber(
            d.contractId
          );

          resolvedNumber = number;
        } catch {
          resolvedNumber = resolvedNumber || `AVN-${Date.now()}`;
        }

        const amendmentData = {
          contractId: d.contractId,
          number: resolvedNumber,
          type: d.type,
          title: d.title,
          description: d.description ?? null,
          status: d.status ?? "draft",
          effectiveDate: toDateOrNull(d.effectiveDate) /* ?? new Date() */,
          originalAmount: d.originalAmount ?? null,
          newAmount: d.newAmount ?? null,
          impactDescription: d.impactDescription ?? null,
          requestedBy: d.requestedBy || safeUserId(req),
          approvedBy: d.approvedBy ?? null,
          signedDate: toDateOrNull(d.signedDate),
        };

        const amendment = await storage.createAmendment(amendmentData as any);

        // Activity log (non-blocking)
        await storage.createActivityLog?.({
          userId: safeUserId(req),
          userName: (req as any)?.user?.name || "system",
          action: "created",
          entityType: "amendment",
          entityId: amendment.id,
          entityReference: amendment.number,
          details: `Created amendment: ${amendment.title}`,
        });

        return res.json(amendment);
      } catch (error: any) {
        // Handle duplicate numbers gracefully if DB unique constraint
        const detail = String(error?.detail || "");
        if (error?.code === "23505" && detail.includes("(number)")) {
          return res.status(409).json({
            error: "Duplicate",
            field: "number",
            message: "Ce numéro d’avenant est déjà utilisé.",
            detail,
          });
        }
        return res.status(500).json({ error: "Failed to create amendment" });
      }
    }
  );

  /**
   * @openapi
   * /api/amendments/{id}:
   *   put:
   *     summary: Replace an amendment
   *     tags: [Amendments]
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
   *     responses:
   *       200: { description: Amendment updated }
   *       404: { description: Amendment not found }
   *       400: { description: Validation error }
   *       500: { description: Server error }
   */
  app.put(
    "/api/amendments/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const parsed = amendmentUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Données invalides",
            errors: parsed.error.errors.map((e: any) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          });
        }
        const d = parsed.data;
        const update = {
          ...d,
          effectiveDate:
            "effectiveDate" in d
              ? d.effectiveDate
                ? toDateOrNull(d.effectiveDate)
                : null
              : undefined,
          signedDate:
            "signedDate" in d
              ? d.signedDate
                ? toDateOrNull(d.signedDate)
                : null
              : undefined,
        };

        const amendment = await storage.updateAmendment(
          req.params.id,
          update as any
        );
        if (!amendment) {
          return res.status(404).json({ error: "Amendment not found" });
        }

        await storage.createActivityLog?.({
          userId: safeUserId(req),
          userName: (req as any)?.user?.name || "system",
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
    }
  );

  /**
   * @openapi
   * /api/amendments/{id}:
   *   patch:
   *     summary: Partially update an amendment
   *     tags: [Amendments]
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
   *           schema: { type: object }
   *     responses:
   *       200: { description: Amendment updated }
   *       404: { description: Amendment not found }
   *       500: { description: Server error }
   */
  app.patch(
    "/api/amendments/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        // (Optional) Validate patch payload as well:
        const parsed = amendmentUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Données invalides",
            errors: parsed.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          });
        }
        const d = parsed.data;

        const patch: Record<string, unknown> = { ...d };

        if ("effectiveDate" in d) {
          patch.effectiveDate = d.effectiveDate
            ? toDateOrNull(d.effectiveDate)
            : null;
        }
        if ("signedDate" in d) {
          patch.signedDate = d.signedDate ? toDateOrNull(d.signedDate) : null;
        }

        const amendment = await storage.updateAmendment(req.params.id, patch);
        if (!amendment) {
          return res.status(404).json({ error: "Amendment not found" });
        }
        res.json(amendment);
      } catch (error) {
        res.status(500).json({ error: "Failed to update amendment" });
      }
    }
  );

  /**
   * @openapi
   * /api/amendments/{id}/status:
   *   patch:
   *     summary: Update amendment status (with transition rules)
   *     tags: [Amendments]
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
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [draft, pending_signature, active, rejected]
   *               reason: { type: string, maxLength: 500 }
   *               approvedBy: { type: string, format: uuid }
   *               signedDate: { type: string, format: date-time }
   *     responses:
   *       200: { description: Status updated }
   *       400: { description: Invalid transition }
   *       404: { description: Amendment not found }
   *       500: { description: Server error }
   */
  app.patch(
    "/api/amendments/:id/status",
    isAuthenticated,
    requirePermission("amendments", "update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const existing = await storage.getAmendment(id);
        if (!existing) {
          return res.status(404).json({ error: "Amendment not found" });
        }

        const schema = makeSetAmendmentStatusSchema(
          existing.status as AmendmentStatus
        );
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Données invalides",
            errors: (parsed as any).error.errors.map((e: any) => ({
              field: e.path?.join?.(".") ?? "status",
              message: e.message,
            })),
          });
        }

        const { status, reason, approvedBy, signedDate } = parsed.data;
        const patch: Record<string, unknown> = {
          status,
          updatedAt: new Date(),
        };

        // If moving to active, allow saving signer meta
        if (status === "active") {
          if (approvedBy) patch.approvedBy = approvedBy;
          if (signedDate) patch.signedDate = toDateOrNull(signedDate);
        }

        const updated = await storage.updateAmendment(id, patch);

        // Audit log (non-blocking)
        await storage.createAuditLog?.({
          userId: safeUserId(req),
          action: "amendment_status_change",
          entityType: "amendment",
          entityId: id,
          details: JSON.stringify({
            from: existing.status,
            to: status,
            reason: reason || null,
            approvedBy: approvedBy || null,
            signedDate: signedDate || null,
          }),
          traceId: `amendment-${id}`,
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });

        return res.json(updated);
      } catch (error) {
        return res
          .status(500)
          .json({ error: "Failed to update amendment status" });
      }
    }
  );

  /**
   * @openapi
   * /api/amendments/{id}:
   *   delete:
   *     summary: Delete an amendment
   *     description: Only `draft` or `rejected` amendments are deletable.
   *     tags: [Amendments]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Amendment deleted }
   *       400: { description: Business rule violation }
   *       500: { description: Server error }
   */
  app.delete(
    "/api/amendments/:id",
    requirePermission("amendments", "delete"),
    async (req: Request, res: Response) => {
      try {
        const existing = await storage.getAmendment(req.params.id);
        if (!existing) {
          return res.status(404).json({ error: "Amendment not found" });
        }
        if (!["draft", "rejected"].includes(existing.status)) {
          return res.status(400).json({
            error:
              "Seuls les avenants en brouillon ou rejetés peuvent être supprimés",
          });
        }

        await storage.deleteAmendment(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete amendment" });
      }
    }
  );
}
