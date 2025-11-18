import type { Express, Request, Response } from "express";
import { z } from "zod";

import path from "path";
import fs from "fs";
import { storage } from "server/storage";
import puppeteer, { Browser, Page } from "puppeteer";
import { isAuthenticated } from "server/auth";
import { requirePermission } from "server/middlewares/authMiddleware";
import { db } from "server/db";
import { invoices, contracts, users, billingLines } from "@shared/schema";
import { eq, desc, aliasedTable, inArray, ilike, gte, and, lte, sql, asc } from "drizzle-orm";
import { InvoiceNumberGenerator } from "server/services/references-generator/invoiceNumberGenerator";
import { renderInvoiceHtml } from "server/templates/invoice-billing-schedule.template";

// ---- Helpers ----
const safeUserId = (req: Request) => (req as any)?.user?.id || "system";

// ---- enum ----

export enum TypeInvoice {
    NORMAL = "NORMAL",
    ADJUSTEMENT = "ADJUSTEMENT",
    AVOIR = "AVOIR",
}

export enum InvoiceStatus {
    Draft = "draft",
    InPaid = "inpaid",          // facture non payée
    Paid = "paid",              // facture payée
    Cancelled = "cancelled",    // facture annulée
    PaidPartially = "paid_parsely" // paiement partiel
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
};

// ---- Zod schema ----
const invoiceCreateSchema = z.object({
    contractId: z.string().uuid(),
    billingLineId: z.string().uuid(),
    dueDate: z.string(),
    description: z.string().optional().default(""),
})
    .refine((data) => {
        const due = new Date(data.dueDate);
        if (isNaN(due.getTime())) return false;

        // 🕒 Normaliser les dates à minuit pour comparaison vraie
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueNormalized = new Date(due);
        dueNormalized.setHours(0, 0, 0, 0);

        return dueNormalized > today;
    }, {
        message: "La date d'échéance doit être strictement future (après aujourd'hui).",
        path: ["dueDate"],
    });

// ---- Zod schema pour update ----
const invoiceUpdateSchema = z.object({
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
    status: z.enum(["draft", "inpaid", "paid", "cancelled", "paid_parsely"]).optional(),
    dueDate: z.string().optional(), // date-time au format ISO
    generatedAt: z.string().optional(), // date-time
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

                // --- Fetch all invoices ---
                const rows = await db
                    .select({
                        id: invoices.id,
                        status: invoices.status,
                        type: invoices.type,
                        totalAmount: invoices.totalAmount,
                    })
                    .from(invoices);

                // --- Compute KPIs ---
                const kpis = {
                    totalInvoices: rows.length,

                    byStatus: {
                        draft: rows.filter(i => i.status === "draft").length,
                        inpaid: rows.filter(i => i.status === "inpaid").length,
                        paid: rows.filter(i => i.status === "paid").length,
                        cancelled: rows.filter(i => i.status === "cancelled").length,
                        paid_parsely: rows.filter(i => i.status === "paid_parsely").length,
                    },

                    byType: {
                        NORMAL: rows.filter(i => i.type === "NORMAL").length,
                        ADJUSTEMENT: rows.filter(i => i.type === "ADJUSTEMENT").length,
                        AVOIR: rows.filter(i => i.type === "AVOIR").length,
                    }
                };

                return res.status(200).json(kpis);

            } catch (error) {
                console.error(error);
                return res.status(500).json({ error: "Failed to fetch invoice KPIs" });
            }
        }
    );

    // --- GET all invoices with filters , pagination, sort ---
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
      *         required: false
      *       - in: query
      *         name: type
      *         schema:
      *           type: string
      *           enum: [NORMAL, ADJUSTEMENT, AVOIR]
      *         required: false
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
      *     responses:
      *       200:
      *         description: List of filtered invoices
      *       500:
      *         description: Server error
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

                // Filter by contract number
                if (contractNumber) {
                    whereConditions.push(
                        ilike(contracts.number, `%${contractNumber.toString().trim()}%`)
                    );
                }

                // Filter by invoice number
                if (invoiceNumber) {
                    whereConditions.push(
                        ilike(invoices.invoiceNumber, `%${invoiceNumber.toString().trim()}%`)
                    );
                }

                // Filter by status
                if (status) {
                    whereConditions.push(eq(invoices.status, String(status)));
                }

                // Filter by type
                if (type) {
                    whereConditions.push(eq(invoices.type, String(type)));
                }

                // Filter by generatedBy
                if (generatedBy) {
                    whereConditions.push(eq(invoices.generatedBy, String(generatedBy)));
                }

                // Filter by date range
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

                // Search
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

                const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

                // Sorting
                let orderColumn: any = invoices.createdAt;
                switch (String(sortBy)) {
                    case "invoiceNumber": orderColumn = invoices.invoiceNumber; break;
                    case "status": orderColumn = invoices.status; break;
                    case "amount": orderColumn = invoices.totalAmount; break;
                    case "contractNumber": orderColumn = contracts.number; break;
                }

                // Query invoices
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

                        // enrichissements
                        contractNumber: contracts.number,
                        clientName: contracts.clientName,
                    })
                    .from(invoices)
                    .leftJoin(contracts, eq(invoices.contractId, contracts.id))
                    .where(where as any)
                    .orderBy(parsedSortOrder === "asc" ? asc(orderColumn) : desc(orderColumn))
                    .limit(parsedLimit)
                    .offset(parsedOffset);


                // Fetch billing lines
                const billingLineIds = rows.map(r => r.billingLineId).filter(Boolean);
                const billingLinesMap = Object.fromEntries(
                    (await db
                        .select()
                        .from(billingLines)
                        .where(inArray(billingLines.id, billingLineIds)))
                        .map(bl => [bl.id, bl])
                );

                // Fetch users
                // Récupérer les userIds depuis rows
                const userIdsClean = [...new Set(
                    rows
                        .map(r => r.generatedBy)
                        .filter((id): id is string => typeof id === "string")
                )];

                const usersRows = userIdsClean.length
                    ? await db
                        .select()
                        .from(users)
                        .where(inArray(users.id, userIdsClean))
                    : [];

                const usersMap = Object.fromEntries(
                    usersRows.map(u => [u.id, u])
                );


                // Enrich invoices
                const enriched = rows.map(inv => ({
                    ...inv,
                    line: inv.billingLineId ? billingLinesMap[inv.billingLineId] || null : null,
                    generatedByUser: inv.generatedBy ? usersMap[inv.generatedBy] || null : null,
                }));
                const total = await db
                    .select({ count: sql`COUNT(*)` })
                    .from(invoices)
                    .leftJoin(contracts, eq(invoices.contractId, contracts.id))
                    .where(where as any)
                    .then(r => Number(r[0]?.count ?? 0));

                return res.status(200).json({
                    rows: enriched,
                    total,
                });

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
   *     responses:
   *       200:
   *         description: Invoice details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       404:
   *         description: Invoice not found
   */
    app.get("/api/invoices/:id",
        isAuthenticated,
        requirePermission("invoices", "read"),
        async (req, res) => {
            try {
                const invoice = await storage.getInvoice(req.params.id);
                if (!invoice) return res.status(404).json({ error: "Invoice not found" });
                res.json(invoice);
            } catch (error) {
                res.status(500).json({ error: "Failed to fetch invoice" });
            }
        });

    // --- POST create invoice --- 
    /**
   * @openapi
   * /api/invoices:
   *   post:
   *     summary: Create a new invoice
   *     description: Create an invoice for a given contract and billing line.
   *     tags:
   *       - Invoices
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               contractId:
   *                 type: string
   *               billingLineId:
   *                 type: string
   *               description:
   *                 type: string
   *                 nullable: true
   *               dueDate:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       200:
   *         description: The created invoice
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       400:
   *         description: Invalid data
   *       404:
   *         description: Contract or billing line not found
   *       409:
   *         description: Duplicate invoice number
   *       500:
   *         description: Failed to create invoice
   */
    app.post(
        "/api/invoices",
        isAuthenticated,
        requirePermission("invoices", "create"),
        async (req: Request, res: Response) => {
            try {
                // 1️⃣ Validation Zod
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

                // 2️⃣ Vérifier que le contrat existe
                const existingContract = await db
                    .select()
                    .from(contracts)
                    .where(eq(contracts.id, d.contractId))
                    .limit(1)
                    .then((rows) => rows[0]);

                if (!existingContract) {
                    return res.status(404).json({ error: "Contract not found" });
                }

                // 3️⃣ Vérifier que la billing line existe
                const billingLineRow = await db
                    .select()
                    .from(billingLines)
                    .where(eq(billingLines.id, d.billingLineId))
                    .limit(1)
                    .then((rows) => rows[0]);

                if (!billingLineRow) {
                    return res.status(404).json({ error: "Billing line not found" });
                }

                // 4️⃣ Générer un numéro de facture
                let invoiceNumber: string;
                try {
                    invoiceNumber = await InvoiceNumberGenerator.generateInvoiceNumber(d.contractId);
                } catch {
                    invoiceNumber = `INV-${Date.now()}`;
                }

                // ✅ FIX: Use billing line's amountHt instead of contract amount
                // BUG FIX: Previously used existingContract.amount which could be null/undefined,
                // causing "amount: Required" validation error. Invoices should use the billing
                // line's amountHt which represents the actual amount to invoice.
                const amountHt = Number(billingLineRow.amountHt ?? 0);
                
                // Get VAT rate from contract (stored as decimal, e.g., 0.20 for 20%)
                // Invoice schema stores vatRate as percentage (e.g., 20 for 20%)
                const contractVatRate = Number(existingContract.tvaRate ?? 0.20);
                // Convert to percentage format for invoice:
                // - If < 1, it's a decimal (0.20 -> 20), multiply by 100
                // - If >= 1, it's already a percentage (20 -> 20), use as-is
                const vatRatePercent = contractVatRate < 1 ? contractVatRate * 100 : contractVatRate;
                // For calculations, always use decimal format
                const contractVatRateDecimal = contractVatRate < 1 ? contractVatRate : contractVatRate / 100;

                const formatDecimal = (num: string | number | null | undefined): string => {
                    const n = Number(num) || 0;
                    return n.toFixed(2);
                };

                // Calculate amounts: HT (amountHt), TVA, TTC (totalAmount)
                // - baseAmount: Base amount before VAT (same as amountHt)
                // - amount: HT amount (before VAT) - required by database schema
                // - vatAmount: VAT amount = HT * rate (e.g., 100 * 0.20 = 20)
                // - totalAmount: TTC (all taxes included) = HT + VAT
                const baseAmount = amountHt;
                const amount = amountHt; // HT amount (same as baseAmount)
                const vatAmount = amountHt * contractVatRateDecimal; // VAT = HT * rate (e.g., 100 * 0.20 = 20)
                const totalAmount = amountHt + vatAmount; // TTC = HT + VAT

                const invoiceData = {
                    contractId: d.contractId,
                    billingLineId: d.billingLineId,
                    description: d.description || null,
                    dueDate: new Date(d.dueDate),
                    amount: formatDecimal(amount),
                    vatRate: formatDecimal(vatRatePercent),
                    vatAmount: formatDecimal(vatAmount),
                    baseAmount: formatDecimal(baseAmount),
                    redactionAmount: formatDecimal(0),
                    type: TypeInvoice.NORMAL,
                    totalAmount: formatDecimal(totalAmount),
                    status: InvoiceStatus.Draft,
                    invoiceNumber,
                    generatedBy: safeUserId(req),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };


                const invoice = await storage.createInvoice(invoiceData);

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
                } catch { }

                // 8️⃣ Succès
                return res.json(invoice);
            } catch (error: any) {
                // Conflit (invoice_number déjà utilisé)
                const detail = String(error?.detail || "");
                if (error?.code === "23505" && detail.includes("(invoice_number)")) {
                    return res.status(409).json({
                        error: "Duplicate",
                        field: "invoiceNumber",
                        message: "Invoice number already used.",
                        detail,
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
     *     description: Update an existing invoice by ID. Only the provided fields will be updated.
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
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               type:
     *                 type: string
     *                 enum: [NORMAL, ADJUSTEMENT, AVOIR]
     *               description:
     *                 type: string
     *               baseAmount:
     *                 type: number
     *               amount:
     *                 type: number
     *               vatRate:
     *                 type: number
     *               vatAmount:
     *                 type: number
     *               redactionAmount:
     *                 type: number
     *               totalAmount:
     *                 type: number
     *               status:
     *                 type: string
     *                 enum: [draft, inpaid, paid, cancelled, paid_parsely]
     *               dueDate:
     *                 type: string
     *                 format: date-time
     *               generatedAt:
     *                 type: string
     *                 format: date-time
     *     responses:
     *       200:
     *         description: Updated invoice
     *       400:
     *         description: Invalid data
     *       404:
     *         description: Invoice not found
     *       500:
     *         description: Failed to update invoice
     */
    app.put("/api/invoices/:id",
        requirePermission("invoices", "update"),
        isAuthenticated,
        async (req, res) => {
            try {
                const invoiceId = req.params.id;

                // Validation des données
                const parsed = invoiceUpdateSchema.partial().safeParse(req.body);
                if (!parsed.success) {
                    return res.status(400).json({
                        error: "Invalid data",
                        errors: parsed.error.errors.map((e) => ({
                            field: e.path.join("."),
                            message: e.message,
                        })),
                    });
                }

                const updates: any = { ...parsed.data };

                // 🔹 Convertir les dates en objet Date pour Drizzle
                if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
                if (updates.generatedAt) updates.generatedAt = new Date(updates.generatedAt);

                // 🔹 Convertir les nombres en string car le storage attend string
                ["amount", "baseAmount", "vatRate", "vatAmount", "redactionAmount", "totalAmount"].forEach((field) => {
                    if (updates[field] !== undefined && updates[field] !== null) {
                        updates[field] = String(updates[field]);
                    }
                });

                // 🔹 Mise à jour
                const updatedInvoice = await storage.updateInvoice(invoiceId, updates);
                if (!updatedInvoice) return res.status(404).json({ error: "Invoice not found" });

                res.json(updatedInvoice);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Failed to update invoice" });
            }
        });

    // ---- DELETE invoice ----
    /**
     * @openapi
     * /api/invoices/{id}:
     *   delete:
     *     summary: Delete an invoice
     *     description: Delete an invoice by its ID.
     *     tags: [Invoices]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: ID of the invoice
     *     responses:
     *       200:
     *         description: Invoice deleted successfully
     *       404:
     *         description: Invoice not found
     *       500:
     *         description: Failed to delete invoice
     */
    app.delete("/api/invoices/:id",
        isAuthenticated,
        requirePermission("invoices", "delete"), async (req, res) => {
            try {
                const deleted = await storage.deleteInvoice(req.params.id);
                if (!deleted) return res.status(404).json({ error: "Invoice not found" });

                res.json({ message: "Invoice deleted successfully" });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Failed to delete invoice" });
            }
        });

    // ---- GET invoice PDF ----
    /** 
     * @openapi 
     * /api/invoices/{id}/pdf: 
     *   get: 
     *     summary: Export invoice as PDF 
     *     description: > 
     *       Generates a PDF document for a given invoice, including contract info, 
     *       billing line info, amounts, and VAT. Uses Puppeteer to render HTML to PDF. 
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
     *           format: uuid 
     *         description: The ID of the invoice to export 
     *     responses: 
     *       200: 
     *         description: Successfully generated invoice PDF 
     *         content: 
     *           application/pdf: 
     *             schema: 
     *               type: string 
     *               format: binary 
     *       404: 
     *         description: Invoice not found 
     *       500: 
     *         description: Failed to generate PDF 
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
                if (!invoice) return res.status(404).json({ error: "Facture introuvable" });

                const contract = await db
                    .select()
                    .from(contracts)
                    .where(eq(contracts.id, invoice.contractId))
                    .limit(1)
                    .then(rows => rows[0]);

                let logoDataUrl: string | undefined;
                try {
                    const logoPath = path.join(process.cwd(), "server", "assets", "logo.jpeg");
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
                    ].filter(Boolean).join(", "),
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
                        .then(rows =>
                            rows.map((ln, idx) => {
                                const amountHt = Number(ln.amountHt ?? 0);
                                const vatRate = Number(invoice.vatRate ?? 0);
                                const vatAmount = amountHt * (vatRate / 100);
                                const totalAmount = amountHt + vatAmount;

                                return {
                                    sequenceNo: ln.sequenceNo ?? idx + 1,
                                    description: invoice.description || `Service - Seq ${ln.sequenceNo ?? idx + 1}`,
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

                invoiceForPdf.totalAmount = invoiceLines.reduce((sum, l) => sum + (l.amount ?? 0), 0);

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



                const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: "domcontentloaded" });
                const pdfBuffer = await page.pdf({
                    format: "A4",
                    printBackground: true,
                    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
                });
                await browser.close();

                const cleanInvoiceNumber = invoice.invoiceNumber.replace(/[\u2013\u2014]/g, "-");
                const filename = `FACTURE-${cleanInvoiceNumber}.pdf`;

                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
                res.end(pdfBuffer);
            } catch (err: any) {
                console.error("[PDF] Erreur lors de la génération de la facture PDF:", err);
                res.status(500).json({ error: err.message || "Échec de génération du PDF" });
            }
        }
    );

}

