// server/routes/invoice.routes.ts
import type { Express, Request, Response } from "express";
import { z } from "zod";

import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";

import { storage } from "server/storage";
import { isAuthenticated } from "server/auth";
import { requirePermission } from "server/middlewares/authMiddleware";
import { db } from "server/db";
import {
  invoices,
  contracts,
  users,
  billingLines,
  billingSchedules,
  validationRequests,
} from "@shared/schema";
import {
  eq,
  desc,
  inArray,
  ilike,
  gte,
  and,
  lte,
  sql,
  asc,
} from "drizzle-orm";
import { InvoiceNumberGenerator } from "server/services/references-generator/invoiceNumberGenerator";
import { renderInvoiceHtml } from "server/templates/invoice-billing-schedule.template";
import { BillingLineStatus } from "@shared/enums/billing.enum";

// ---- Helpers ----

const safeUserId = (req: Request): string =>
  (req as any)?.user?.id || "system";

// ---- Enums ----

export enum TypeInvoice {
  NORMAL = "NORMAL",
  ADJUSTEMENT = "ADJUSTEMENT",
  AVOIR = "AVOIR",
}

export enum InvoiceStatus {
  Draft = "draft",
  InPaid = "inpaid", // facture non payée
  Paid = "paid", // facture payée
  Cancelled = "cancelled", // facture annulée
  PaidPartially = "paid_parsely", // paiement partiel
}

type InvoiceForPdf = {
  invoiceNumber: string;
  contractNumber: string;
  description: string;
  dueDate: Date | string;
  generatedAt: Date | string;
  status: string;
  baseAmount: number;
  tvaRate: number;
  amount?: number;
  vatAmount: number;
  redactionAmount: number;
  totalAmount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  clientName?: string;
  clientAddress?: string;
  billingPeriodStart?: Date | string;
  billingPeriodEnd?: Date | string;
};

export enum InvoiceAction {
  Validate = "validate",
  RevertToDraft = "revertToDraft",
}

export enum PaymentTermsEnum {
  "30J" = "30j",
  "60J" = "60j",
  "A_COMMANDE" = "a_commande",
  "A_LIVRAISON" = "a_livraison",
  "50_50" = "50/50",
}

// ---- Zod schemas ----

const invoiceCreateSchema = z
  .object({
    contractId: z.string().uuid(),
    billingLineId: z.string().uuid(),
    dueDate: z.string(),
    description: z.string().optional().default(""),
    paymentTerms: z.nativeEnum(PaymentTermsEnum).optional().nullable(),
  })
  .refine(
    (data) => {
      const due = new Date(data.dueDate);
      if (isNaN(due.getTime())) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueNormalized = new Date(due);
      dueNormalized.setHours(0, 0, 0, 0);

      return dueNormalized > today;
    },
    {
      message: "La date d'échéance doit être strictement future (après aujourd'hui).",
      path: ["dueDate"],
    }
  );

const invoiceUpdateSchema = z.object({
  invoiceAction: z.enum(["validate", "revertToDraft"]).optional(),
  type: z.enum(["NORMAL", "ADJUSTEMENT", "AVOIR"]).optional(),
  contractId: z.string().uuid().optional(),
  billingLineId: z.string().uuid().optional(),
  description: z.string().optional(),
  baseAmount: z.number().positive().optional(),
  amount: z.number().positive().optional(),
  vatRate: z.number().nonnegative().optional(),
  vatAmount: z.number().nonnegative().optional(),
  redactionAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().positive().optional(),
  paymentTerms: z.nativeEnum(PaymentTermsEnum).optional().nullable(),
  status: z
    .enum(["draft", "inpaid", "paid", "cancelled", "paid_parsely"])
    .optional(),
  dueDate: z.string().optional(),
  generatedAt: z.string().optional(),
  generatedBy: z.string().uuid().optional(),
});

// ---- Routes ----

export function registerInvoiceRoutes(app: Express) {
  // --- GET all for KPIS ---
  /**
   * @openapi
   * /api/invoices/kpis/_invoices:
   *   get:
   *     summary: Get global KPI counters for invoices
   *     description: Returns global counters without filters or pagination.
   *     tags: [Invoices]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: KPI counters
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/invoices/kpis/_invoices",
    isAuthenticated,
    requirePermission("invoices", "read"),
    async (req: Request, res: Response) => {
      try {
        const rows = await db
          .select({
            id: invoices.id,
            status: invoices.status,
            type: invoices.type,
            totalAmount: invoices.totalAmount,
          })
          .from(invoices);

        const kpis = {
          totalInvoices: rows.length,
          byStatus: {
            draft: rows.filter((i) => i.status === "draft").length,
            inpaid: rows.filter((i) => i.status === "inpaid").length,
            paid: rows.filter((i) => i.status === "paid").length,
            cancelled: rows.filter((i) => i.status === "cancelled").length,
            paid_parsely: rows.filter((i) => i.status === "paid_parsely").length,
          },
          byType: {
            NORMAL: rows.filter((i) => i.type === "NORMAL").length,
            ADJUSTEMENT: rows.filter((i) => i.type === "ADJUSTEMENT").length,
            AVOIR: rows.filter((i) => i.type === "AVOIR").length,
          },
        };

        return res.status(200).json(kpis);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch invoice KPIs" });
      }
    }
  );

  // --- GET invoice validation requests ---
  /**
   * @openapi
   * /api/invoices/validation-requests:
   *   get:
   *     summary: Get pending invoice validation requests for the current user
   *     description: |
   *       Liste les demandes de validation de type "invoice" assignées à l'utilisateur connecté,
   *       avec les infos principales de la facture.
   *     tags:
   *       - Invoices
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of invoice validation requests
   *       500:
   *         description: Server error
   */
  app.get(
  "/api/invoices/validation-requests",
  isAuthenticated,
  requirePermission("invoices", "read"),
  async (req: Request, res: Response) => {
    try {
      const userId = safeUserId(req) || "system";

      const rows = await db
        .select({
          id: validationRequests.id,
          type: validationRequests.type,
          status: validationRequests.status,
          subject: validationRequests.subject,
          referenceId: validationRequests.referenceId,
          reference: validationRequests.reference,
          createdAt: validationRequests.createdAt,
          requestedBy: validationRequests.requestedBy,

          // Infos facture
          invoiceId: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          totalAmount: invoices.totalAmount,

          // Infos contrat
          contractNumber: contracts.number,
          clientName: contracts.clientName,

          // 🆕 PÉRIODE DE FACTURATION
          billingPeriodStart: billingSchedules.startDate,
          billingPeriodEnd: billingSchedules.endDate,
        })
        .from(validationRequests)
        .leftJoin(invoices, eq(validationRequests.referenceId, invoices.id))
        .leftJoin(contracts, eq(invoices.contractId, contracts.id))
        .leftJoin(billingLines, eq(billingLines.id, invoices.billingLineId))
        .leftJoin(
          billingSchedules,
          eq(billingSchedules.id, billingLines.scheduleId)
        )
        .where(
          and(
            eq(validationRequests.type, "invoice"),
            eq(validationRequests.assignedTo, userId),
            eq(validationRequests.status, "pending")
          )
        )
        .orderBy(desc(validationRequests.createdAt));

      return res.status(200).json({ rows });
    } catch (error) {
      console.error("[Invoice] Failed to fetch invoice validation requests:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch invoice validation requests" });
    }
  }
);




  // --- GET all invoices with filters, pagination, sort ---
  /**
   * @openapi
   * /api/invoices:
   *   get:
   *     summary: Get all invoices with filters
   *     description: List invoices with filtering, search, sorting and pagination.
   *     tags: [Invoices]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: contractNumber
   *         schema:
   *           type: string
   *       - in: query
   *         name: invoiceNumber
   *         schema:
   *           type: string
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [draft, inpaid, paid, cancelled, paid_parsely]
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [NORMAL, ADJUSTEMENT, AVOIR]
   *       - in: query
   *         name: generatedBy
   *         schema:
   *           type: string
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 200
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   */
  app.get(
    "/api/invoices",
    isAuthenticated,
    requirePermission("invoices", "read"),
    async (req: Request, res: Response) => {
      try {
        const {
          contractNumber,
          invoiceNumber,
          status,
          type,
          generatedBy,
          search,
          from,
          to,
          limit = 25,
          offset = 0,
          sortBy = "createdAt",
          sortOrder = "desc",
        } = req.query;

        const parsedLimit = Math.min(Number(limit) || 25, 200);
        const parsedOffset = Number(offset) || 0;
        const parsedSortOrder = sortOrder === "asc" ? "asc" : "desc";

        const parsedFrom = from ? new Date(from as string) : undefined;
        const parsedTo = to ? new Date(to as string) : undefined;

        const whereConditions: any[] = [];

        if (contractNumber) {
          whereConditions.push(
            ilike(contracts.number, `%${contractNumber.toString().trim()}%`)
          );
        }

        if (invoiceNumber) {
          whereConditions.push(
            ilike(invoices.invoiceNumber, `%${invoiceNumber.toString().trim()}%`)
          );
        }

        if (status) {
          whereConditions.push(eq(invoices.status, String(status)));
        }

        if (type) {
          whereConditions.push(eq(invoices.type, String(type)));
        }

        if (generatedBy) {
          whereConditions.push(eq(invoices.generatedBy, String(generatedBy)));
        }

        if (parsedFrom && parsedTo) {
          whereConditions.push(
            and(
              gte(invoices.createdAt, parsedFrom),
              lte(invoices.createdAt, parsedTo)
            )
          );
        } else if (parsedFrom) {
          whereConditions.push(gte(invoices.createdAt, parsedFrom));
        } else if (parsedTo) {
          whereConditions.push(lte(invoices.createdAt, parsedTo));
        }

        if (search?.toString().trim()) {
          const s = search.toString().trim().toLowerCase();
          whereConditions.push(
            sql`(
              LOWER(${invoices.invoiceNumber}) LIKE ${"%" + s + "%"} OR
              LOWER(${contracts.number}) LIKE ${"%" + s + "%"} OR
              LOWER(${invoices.status}) LIKE ${"%" + s + "%"} OR
              LOWER(${invoices.type}) LIKE ${"%" + s + "%"} OR
              CAST(${invoices.totalAmount} AS TEXT) LIKE ${"%" + s + "%"}
            )`
          );
        }

        const where =
          whereConditions.length > 0 ? and(...whereConditions) : undefined;

        let orderColumn: any = invoices.createdAt;
        switch (String(sortBy)) {
          case "invoiceNumber":
            orderColumn = invoices.invoiceNumber;
            break;
          case "status":
            orderColumn = invoices.status;
            break;
          case "amount":
            orderColumn = invoices.totalAmount;
            break;
          case "contractNumber":
            orderColumn = contracts.number;
            break;
        }

        const rows = await db
          .select({
            id: invoices.id,
            contractId: invoices.contractId,
            invoiceNumber: invoices.invoiceNumber,
            type: invoices.type,
            billingLineId: invoices.billingLineId,
            description: invoices.description,
            baseAmount: invoices.baseAmount,
            amount: invoices.amount,
            vatRate: invoices.vatRate,
            vatAmount: invoices.vatAmount,
            redactionAmount: invoices.redactionAmount,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            dueDate: invoices.dueDate,
            generatedAt: invoices.generatedAt,
            generatedBy: invoices.generatedBy,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
            contractNumber: contracts.number,
            clientName: contracts.clientName,
          })
          .from(invoices)
          .leftJoin(contracts, eq(invoices.contractId, contracts.id))
          .where(where as any)
          .orderBy(
            parsedSortOrder === "asc" ? asc(orderColumn) : desc(orderColumn)
          )
          .limit(parsedLimit)
          .offset(parsedOffset);

        const billingLineIds = rows.map((r) => r.billingLineId).filter(Boolean);

        const billingLinesMap = Object.fromEntries(
          (
            await db
              .select()
              .from(billingLines)
              .where(inArray(billingLines.id, billingLineIds))
          ).map((bl) => [bl.id, bl])
        );

        const userIdsClean = [
          ...new Set(
            rows
              .map((r) => r.generatedBy)
              .filter((id): id is string => typeof id === "string")
          ),
        ];

        const usersRows =
          userIdsClean.length > 0
            ? await db
                .select()
                .from(users)
                .where(inArray(users.id, userIdsClean))
            : [];

        const usersMap = Object.fromEntries(usersRows.map((u) => [u.id, u]));

        const enriched = rows.map((inv) => ({
          ...inv,
          line: inv.billingLineId
            ? billingLinesMap[inv.billingLineId] || null
            : null,
          generatedByUser: inv.generatedBy
            ? usersMap[inv.generatedBy] || null
            : null,
        }));

        const total = await db
          .select({ count: sql`COUNT(*)` })
          .from(invoices)
          .leftJoin(contracts, eq(invoices.contractId, contracts.id))
          .where(where as any)
          .then((r) => Number(r[0]?.count ?? 0));

        return res.status(200).json({ rows: enriched, total });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch invoices" });
      }
    }
  );

  // --- GET invoice by ID ---
  /**
   * @openapi
   * /api/invoices/{id}:
   *   get:
   *     summary: Get invoice by ID
   *     description: Retrieve a single invoice by its ID.
   *     tags:
   *       - Invoices
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the invoice
   */
  app.get(
    "/api/invoices/:id",
    isAuthenticated,
    requirePermission("invoices", "read"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const [row] = await db
          .select({
            id: invoices.id,
            contractId: invoices.contractId,
            invoiceNumber: invoices.invoiceNumber,
            type: invoices.type,
            billingLineId: invoices.billingLineId,
            description: invoices.description,
            baseAmount: invoices.baseAmount,
            amount: invoices.amount,
            vatRate: invoices.vatRate,
            vatAmount: invoices.vatAmount,
            redactionAmount: invoices.redactionAmount,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            dueDate: invoices.dueDate,
            generatedAt: invoices.generatedAt,
            generatedBy: invoices.generatedBy,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
            contractNumber: contracts.number,
            clientName: contracts.clientName,
            billingPeriodStart: billingSchedules.startDate,
            billingPeriodEnd: billingSchedules.endDate,
          })
          .from(invoices)
          .leftJoin(contracts, eq(invoices.contractId, contracts.id))
          .leftJoin(billingLines, eq(billingLines.id, invoices.billingLineId))
          .leftJoin(
            billingSchedules,
            eq(billingSchedules.id, billingLines.scheduleId)
          )
          .where(eq(invoices.id, id));

        if (!row) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        return res.json(row);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch invoice" });
      }
    }
  );

  // --- POST create invoice ---
  /**
   * @openapi
   * /api/invoices:
   *   post:
   *     summary: Create a new invoice
   *     description: Create an invoice for a given contract and billing line.
   *     tags:
   *       - Invoices
   */
  app.post(
    "/api/invoices",
    isAuthenticated,
    requirePermission("invoices", "create"),
    async (req: Request, res: Response) => {
      try {
        const parsed = invoiceCreateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid data",
            errors: parsed.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          });
        }
        const d = parsed.data;

        const existingContract = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, d.contractId))
          .limit(1)
          .then((rows) => rows[0]);
        if (!existingContract) {
          return res.status(404).json({ error: "Contract not found" });
        }

        const billingLineRow = await db
          .select()
          .from(billingLines)
          .where(eq(billingLines.id, d.billingLineId))
          .limit(1)
          .then((rows) => rows[0]);
        if (!billingLineRow) {
          return res.status(404).json({ error: "Billing line not found" });
        }

        const totalInvoices = await db
          .select({ count: sql`COUNT(*)` })
          .from(invoices)
          .then((r) => Number(r[0]?.count ?? 0));

        let invoiceNumber: string;
        try {
          invoiceNumber = await InvoiceNumberGenerator.generateInvoiceNumber({
            tableLength: totalInvoices,
            type: "INV",
            checkExists: async (num: string) => {
              const exists = await db
                .select()
                .from(invoices)
                .where(eq(invoices.invoiceNumber, num))
                .limit(1);
              return exists.length > 0;
            },
          });
        } catch {
          invoiceNumber = `INV-${Date.now()}`;
        }

        const amountHt = Number(billingLineRow.amountHt ?? 0);
        const contractVatRate = Number(existingContract.tvaRate ?? 0.2);

        const vatRatePercent =
          contractVatRate < 1 ? contractVatRate * 100 : contractVatRate;
        const contractVatRateDecimal =
          contractVatRate < 1 ? contractVatRate : contractVatRate / 100;

        const formatDecimal = (
          num: string | number | null | undefined
        ): string => {
          const n = Number(num) || 0;
          return n.toFixed(2);
        };

        const baseAmount = amountHt;
        const amount = amountHt;
        const vatAmount = amountHt * contractVatRateDecimal;
        const totalAmount = amountHt + vatAmount;

        const invoiceData = {
          contractId: d.contractId,
          billingLineId: d.billingLineId,
          description: d.description || null,
          dueDate: new Date(d.dueDate),
          amount: formatDecimal(amount),
          vatRate: formatDecimal(vatRatePercent),
          vatAmount: formatDecimal(vatAmount),
          baseAmount: formatDecimal(baseAmount),
          redactionAmount: "0.00",
          type: TypeInvoice.NORMAL,
          paymentTerms: d.paymentTerms ?? null,
          totalAmount: formatDecimal(totalAmount),
          status: InvoiceStatus.Draft,
          invoiceNumber,
          generatedBy: safeUserId(req),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const invoice = await storage.createInvoice(invoiceData);

        await db
          .update(billingLines)
          .set({
            status: BillingLineStatus.FACTUREE,
            updatedAt: new Date(),
          })
          .where(eq(billingLines.id, d.billingLineId));

        try {
          await storage.createAuditLog?.({
            userId: safeUserId(req) || "system",
            username: (req as any)?.user?.name || "system",
            action: "created",
            traceId: `invoice-${invoice.id}`,
            entityType: "invoice",
            entityId: invoice.id,
            details: JSON.stringify({
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch {
          // audit non bloquant
        }

        try {
          const requestedBy = safeUserId(req) || "system";

          await db.insert(validationRequests).values({
            type: "invoice",
            referenceId: invoice.id,
            reference: invoice.invoiceNumber,
            subject: `Validation facture ${invoice.invoiceNumber}`,
            requestedBy,
            assignedTo: requestedBy,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (e) {
          console.warn(
            "[Invoice] Impossible de créer la validationRequest:",
            e
          );
        }

        return res.json(invoice);
      } catch (error: any) {
        if (
          error?.code === "23505" &&
          String(error?.detail || "").includes("(invoice_number)")
        ) {
          return res.status(409).json({
            error: "Duplicate",
            field: "invoiceNumber",
            message: "Invoice number already used.",
          });
        }
        console.error(error);
        return res.status(500).json({ error: "Failed to create invoice" });
      }
    }
  );

  // ---- PUT update invoice ----
  /**
   * @openapi
   * /api/invoices/{id}:
   *   put:
   *     summary: Update an invoice
   *     description: Update an existing invoice by ID.
   *     tags:
   *       - Invoices
   */
  app.put(
    "/api/invoices/:id",
    isAuthenticated,
    requirePermission("invoices", "update"),
    async (req: Request, res: Response) => {
      try {
        const invoiceId = req.params.id;

        const parsed = invoiceUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid data",
            errors: parsed.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          });
        }

        const existingInvoice = await storage.getInvoice(invoiceId);
        if (!existingInvoice) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        const updates: any = { ...parsed.data };

        if (updates.status) {
          delete updates.status;
        }

        const action = parsed.data.invoiceAction;
        const isEmitted = existingInvoice.status === InvoiceStatus.InPaid;

        if (isEmitted && action !== InvoiceAction.RevertToDraft) {
          const forbiddenFields = [
            "baseAmount",
            "amount",
            "vatRate",
            "vatAmount",
            "redactionAmount",
            "totalAmount",
            "billingLineId",
            "contractId",
          ];

          for (const field of forbiddenFields) {
            if (field in updates) {
              return res.status(400).json({
                error: `Impossible de modifier ${field} sur une facture déjà émise. Remettre en brouillon d'abord.`,
              });
            }
          }
        }

        if (action === InvoiceAction.Validate) {
          if (existingInvoice.status !== InvoiceStatus.Draft) {
            return res.status(400).json({
              error: "Seules les factures en brouillon peuvent être validées.",
            });
          }

          updates.status = InvoiceStatus.InPaid;
          updates.updatedAt = new Date();
        }

        if (action === InvoiceAction.RevertToDraft) {
          if (existingInvoice.status !== InvoiceStatus.InPaid) {
            return res.status(400).json({
              error:
                "Seules les factures en impayé peuvent être remises en brouillon",
            });
          }

          updates.status = InvoiceStatus.Draft;
          updates.updatedAt = new Date();
        }

        Object.keys(updates).forEach((key) => {
          if (updates[key] === undefined) delete updates[key];
        });

        if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
        if (updates.generatedAt)
          updates.generatedAt = new Date(updates.generatedAt);

        [
          "amount",
          "baseAmount",
          "vatRate",
          "vatAmount",
          "redactionAmount",
          "totalAmount",
          "paymentTerms",
        ].forEach((field) => {
          if (updates[field] !== undefined && updates[field] !== null) {
            updates[field] = String(updates[field]);
          }
        });

        const updatedInvoice = await storage.updateInvoice(invoiceId, updates);
        if (!updatedInvoice) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        if (action === InvoiceAction.Validate) {
          try {
            const userId = safeUserId(req) || "system";

            await db
              .update(validationRequests)
              .set({
                status: "approved",
                validatedBy: userId,
                validatedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(validationRequests.referenceId, invoiceId),
                  eq(validationRequests.type, "invoice"),
                  eq(validationRequests.status, "pending")
                )
              );
          } catch (e) {
            console.warn(
              "[Invoice] Impossible de mettre à jour la validationRequest liée:",
              e
            );
          }
        }

        return res.json(updatedInvoice);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to update invoice" });
      }
    }
  );

  /**
 * @openapi
 * /api/invoices/{id}/reject:
 *   post:
 *     summary: Refuser une facture (rejeter la demande de validation)
 *     description: >
 *       Marque la validation_request liée à cette facture comme "rejected".
 *       Ne modifie pas le statut de la facture elle-même.
 *     tags:
 *       - Invoices
 */
app.post(
  "/api/invoices/:id/reject",
  isAuthenticated,
  requirePermission("invoices", "update"),
  async (req: Request, res: Response) => {
    try {
      const invoiceId = req.params.id;
      const userId = safeUserId(req) || "system";

      const result = await db
        .update(validationRequests)
        .set({
          status: "rejected",
          validatedBy: userId,
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(validationRequests.referenceId, invoiceId),
            eq(validationRequests.type, "invoice"),
            eq(validationRequests.status, "pending")
          )
        );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Invoice] Failed to reject invoice validation request:", error);
      return res
        .status(500)
        .json({ error: "Failed to reject invoice validation request" });
    }
  }
);


  // ---- DELETE invoice ----
  /**
   * @openapi
   * /api/invoices/{id}:
   *   delete:
   *     summary: Delete an invoice
   *     description: Delete an invoice by its ID.
   *     tags: [Invoices]
   */
  app.delete(
    "/api/invoices/:id",
    isAuthenticated,
    requirePermission("invoices", "delete"),
    async (req: Request, res: Response) => {
      try {
        const invoice = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, req.params.id))
          .limit(1)
          .then((rows) => rows[0]);

        if (!invoice) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        if (invoice.status !== InvoiceStatus.Draft) {
          return res.status(400).json({
            error:
              "Seules les factures au statut Brouillon peuvent être supprimées",
          });
        }

        const deleted = await storage.deleteInvoice(req.params.id);
        if (!deleted) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        if (invoice.billingLineId) {
          await db
            .update(billingLines)
            .set({
              status: BillingLineStatus.A_FACTURER,
              updatedAt: new Date(),
            })
            .where(eq(billingLines.id, invoice.billingLineId));
        }

        return res.json({ message: "Invoice deleted successfully" });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to delete invoice" });
      }
    }
  );

  // ---- GET invoice PDF ----
  /**
   * @openapi
   * /api/invoices/{id}/pdf:
   *   get:
   *     summary: Export invoice as PDF
   *     tags:
   *       - Invoices
   */
  app.get(
    "/api/invoices/:id/pdf",
    isAuthenticated,
    requirePermission("invoices", "read"),
    async (req: Request, res: Response) => {
      const invoiceId = req.params.id;
      console.log("[PDF] Request for invoice", invoiceId);

      try {
        const invoice = await storage.getInvoice(invoiceId);
        if (!invoice) {
          return res.status(404).json({ error: "Facture introuvable" });
        }

        const contract = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, invoice.contractId))
          .limit(1)
          .then((rows) => rows[0]);

        let billingPeriodStart: Date | null = null;
        let billingPeriodEnd: Date | null = null;

        if (invoice.billingLineId) {
          const [scheduleRow] = await db
            .select({
              startDate: billingSchedules.startDate,
              endDate: billingSchedules.endDate,
            })
            .from(billingLines)
            .leftJoin(
              billingSchedules,
              eq(billingSchedules.id, billingLines.scheduleId)
            )
            .where(eq(billingLines.id, invoice.billingLineId));

          if (scheduleRow) {
            billingPeriodStart = scheduleRow.startDate;
            billingPeriodEnd = scheduleRow.endDate;
          }
        }

        let logoDataUrl: string | undefined;
        try {
          const logoPath = path.join(
            process.cwd(),
            "server",
            "assets",
            "logo.jpeg"
          );
          const logoBuffer = fs.readFileSync(logoPath);
          logoDataUrl = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
        } catch (err) {
          console.warn("[PDF] Logo introuvable:", err);
        }

        const invoiceForPdf: InvoiceForPdf & {
          maxAnnualProduction?: string;
          numberOfTurbines?: string;
          pricePerMWh?: string;
          currency?: string;
        } = {
          invoiceNumber: invoice.invoiceNumber,
          contractNumber: contract?.number ?? "—",
          description: invoice.description ?? "",
          dueDate: invoice.dueDate ?? new Date(),
          generatedAt: invoice.generatedAt ?? new Date(),
          billingPeriodStart: billingPeriodStart ?? invoice.dueDate ?? new Date(),
          billingPeriodEnd: billingPeriodEnd ?? invoice.dueDate ?? new Date(),
          status: invoice.status,
          baseAmount: Number(invoice.baseAmount ?? 0),
          amount: Number(invoice.amount ?? invoice.baseAmount ?? 0),
          tvaRate: Number(invoice.vatRate ?? 0),
          vatAmount: Number(invoice.vatAmount ?? 0),
          redactionAmount: Number(invoice.redactionAmount ?? 0),
          totalAmount: Number(invoice.totalAmount ?? 0),
          createdAt: invoice.createdAt ?? new Date(),
          updatedAt: invoice.updatedAt ?? new Date(),
          clientName: contract?.clientName ?? "Client",
          clientAddress: [
            contract?.type,
            contract?.technology,
            contract?.businessUnit,
            contract?.parkCode,
          ]
            .filter(Boolean)
            .join(", "),
          maxAnnualProduction: contract?.maxAnnualProduction ?? undefined,
          numberOfTurbines: contract?.numberOfTurbines ?? undefined,
          pricePerMWh: contract?.pricePerMWh ?? undefined,
          currency: contract?.currency ?? "EUR",
        };

        let invoiceLines: {
          sequenceNo?: number;
          description?: string;
          quantity?: number;
          unitPrice?: number;
          amount?: number;
          amountHt?: number;
          vatAmount?: number;
          totalAmount?: number;
          dueDate?: Date | string;
          status?: string;
        }[] = [];

        if (invoice.billingLineId) {
          invoiceLines = await db
            .select()
            .from(billingLines)
            .where(eq(billingLines.id, invoice.billingLineId))
            .then((rows) =>
              rows.map((ln, idx) => {
                const amountHt = Number(ln.amountHt ?? 0);
                const vatRate = Number(invoice.vatRate ?? 0);
                const vatAmount = amountHt * (vatRate / 100);
                const totalAmount = amountHt + vatAmount;

                return {
                  sequenceNo: ln.sequenceNo ?? idx + 1,
                  description:
                    invoice.description ||
                    `Service - Seq ${ln.sequenceNo ?? idx + 1}`,
                  quantity: 1,
                  unitPrice: amountHt,
                  amount: totalAmount,
                  amountHt,
                  vatAmount,
                  totalAmount,
                  dueDate: ln.dueDate ?? new Date(),
                  status: ln.status ?? undefined,
                };
              })
            );
        }

        invoiceForPdf.totalAmount = invoiceLines.reduce(
          (sum, l) => sum + (l.amount ?? 0),
          0
        );

        const html = renderInvoiceHtml(invoiceForPdf, invoiceLines, {
          logoDataUrl,
          companyName: "KLYXOR Solutionssss",
          companyAddress: "123 Rue de la Paix, 75000 Paris, France",
          companyPhone: "01 23 45 67 89",
          companyEmail: "contact@klyxor.com",
          companyWebsite: "https://www.klyxor.com",
          customerCode: "1234567890",
          bank: {
            bankName: "Banque de France",
            accountNumber: "1234567890",
            iban: "FR7612345678901234567890123",
            swift: "BNPAFRPP761",
            owner: "KLYXOR Solutions",
            address: "123 Rue de la Paix, 75000 Paris, France",
          },
          companyFooter: {
            capital: "1000000",
            rc: "1234567890",
            patente: "1234567890",
            if: "1234567890",
            cnss: "1234567890",
            ice: "1234567890",
          },
          paymentConditions: "À réception",
          currency: "EUR",
        });

        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox"],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "domcontentloaded" });
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm",
          },
        });
        await browser.close();

        const cleanInvoiceNumber = invoice.invoiceNumber.replace(
          /[\u2013\u2014]/g,
          "-"
        );
        const filename = `FACTURE-${cleanInvoiceNumber}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        return res.end(pdfBuffer);
      } catch (err: any) {
        console.error("[PDF] Erreur lors de la génération de la facture PDF:", err);
        return res.status(500).json({
          error: err.message || "Échec de génération du PDF",
        });
      }
    }
  );

  // ---- POST create credit note / avoir ----
  /**
   * @openapi
   * /api/invoices/{id}/avoir:
   *   post:
   *     summary: Create a credit note (avoir) from an existing invoice
   *     tags: [Invoices]
   */
  app.post(
    "/api/invoices/:id/avoir",
    isAuthenticated,
    requirePermission("invoices", "create"),
    async (req: Request, res: Response) => {
      try {
        const originalInvoiceId = req.params.id;
        const { description, dueDate } = req.body;

        const original = await storage.getInvoice(originalInvoiceId);
        if (!original) {
          return res.status(404).json({ error: "Invoice not found" });
        }

        let avoir: any;
        let attempts = 0;
        const maxAttempts = 10;

        while (!avoir && attempts < maxAttempts) {
          attempts++;

          const totalInvoices = await db
            .select({ count: sql`COUNT(*)` })
            .from(invoices)
            .then((r) => Number(r[0]?.count ?? 0));

          let invoiceNumber: string;
          try {
            invoiceNumber = await InvoiceNumberGenerator.generateInvoiceNumber({
              tableLength: totalInvoices,
              type: "AV",
              checkExists: async (num: string) => {
                const exists = await db
                  .select()
                  .from(invoices)
                  .where(eq(invoices.invoiceNumber, num))
                  .limit(1);
                return exists.length > 0;
              },
            });
          } catch {
            invoiceNumber = `AV-${Date.now()}`;
          }

          const avoirData = {
            contractId: original.contractId,
            billingLineId: original.billingLineId,
            description: description || `Avoir de ${original.invoiceNumber}`,
            dueDate: dueDate
              ? new Date(dueDate)
              : original.dueDate
              ? new Date(original.dueDate)
              : new Date(),
            amount: original.amount,
            baseAmount: original.baseAmount,
            vatRate: original.vatRate,
            vatAmount: original.vatAmount,
            redactionAmount: "0.00",
            type: TypeInvoice.AVOIR,
            totalAmount: original.totalAmount,
            status: InvoiceStatus.Draft,
            paymentTerms: original.paymentTerms,
            invoiceNumber,
            generatedBy: safeUserId(req),
            refundedInvoiceId: original.id,
            generatedAt: dueDate
              ? new Date(dueDate)
              : original.dueDate
              ? new Date(original.dueDate)
              : new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          try {
            avoir = await storage.createInvoice(avoirData);
          } catch (error: any) {
            if (
              error?.code === "23505" &&
              String(error?.detail || "").includes("(invoice_number)")
            ) {
              console.warn("Duplicate invoice number, retrying...");
              continue;
            }
            throw error;
          }
        }

        if (!avoir) {
          return res.status(500).json({
            error: "Failed to create credit note after multiple attempts",
          });
        }

        return res.json(avoir);
      } catch (error: any) {
        if (
          error?.code === "23505" &&
          String(error?.detail || "").includes("(invoice_number)")
        ) {
          return res.status(409).json({
            error: "Duplicate",
            field: "invoiceNumber",
            message: "Invoice number already used.",
          });
        }
        console.error(error);
        return res.status(500).json({ error: "Failed to create invoice" });
      }
    }
  );

  /**
   * @openapi
   * /api/dev/validation-requests:
   *   get:
   *     summary: DEBUG - Liste les dernières demandes de validation
   *     tags:
   *       - Debug
   */
  app.get(
    "/api/dev/validation-requests",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const rows = await db
          .select({
            id: validationRequests.id,
            type: validationRequests.type,
            status: validationRequests.status,
            subject: validationRequests.subject,
            referenceId: validationRequests.referenceId,
            reference: validationRequests.reference,
            requestedBy: validationRequests.requestedBy,
            assignedTo: validationRequests.assignedTo,
            createdAt: validationRequests.createdAt,
            validatedBy: validationRequests.validatedBy,
            validatedAt: validationRequests.validatedAt,
          })
          .from(validationRequests)
          .orderBy(desc(validationRequests.createdAt))
          .limit(20);

        return res.status(200).json({ rows });
      } catch (error) {
        console.error("[DEV] Failed to fetch validation_requests:", error);
        return res
          .status(500)
          .json({ error: "Failed to fetch validation_requests" });
      }
    }
  );
}
