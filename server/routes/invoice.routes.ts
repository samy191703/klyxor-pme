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
import { eq, desc, aliasedTable, inArray } from "drizzle-orm";
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
    // --- GET all invoices ---
    /** 
     * @openapi 
     * /api/invoices: 
     *   get: 
     *     summary: Get all invoices with their billing line 
     *     description: Returns a list of invoices including contract info, creator info, and their billing line. 
     *     tags: [Invoices] 
     *     security: 
     *       - cookieAuth: [] 
     *     responses: 
     *       200: 
     *         description: List of invoices with their billing line 
     *       500: 
     *         description: Server error 
     */
    app.get("/api/invoices",
        isAuthenticated,
        requirePermission("invoices", "read"),
        async (_req, res) => {
            try {
                // 🔹 Récupérer toutes les invoices depuis le storage
                const invoicesRows = await storage.getInvoices();

                // 🔹 Récupérer les créateurs et les contrats en batch pour éviter N+1
                const contractIds = [...new Set(invoicesRows.map(inv => inv.contractId))].filter(Boolean);
                const userIds = [...new Set(
                    invoicesRows
                        .map(inv => inv.generatedBy)
                        .filter((id): id is string => typeof id === "string") // <-- Type guard
                )];

                const usersMap = Object.fromEntries(
                    (await db.select().from(users).where(inArray(users.id, userIds)))
                        .map(u => [u.id, { id: u.id, name: u.name, email: u.email }])
                );


                const contractsMap = Object.fromEntries(
                    (await db.select().from(contracts).where(inArray(contracts.id, contractIds)))
                        .map(c => [c.id, { number: c.number }])
                );

                // 🔹 Récupérer toutes les billing lines en batch
                const billingLineIds = invoicesRows.map(inv => inv.billingLineId).filter(Boolean);
                const billingLinesMap = Object.fromEntries(
                    (await db.select().from(billingLines).where(inArray(billingLines.id, billingLineIds)))
                        .map(bl => [bl.id, { id: bl.id, amount: bl.amountHt, dueDate: bl.dueDate, status: bl.status }])
                );

                // 🔹 Enrichir les invoices
                const enriched = invoicesRows.map(inv => ({
                    ...inv,
                    generatedByUser: inv.generatedBy ? usersMap[inv.generatedBy] || null : null,
                    contract: inv.contractId ? contractsMap[inv.contractId] || null : null,
                    line: inv.billingLineId ? billingLinesMap[inv.billingLineId] || null : null,
                }));

                return res.status(200).json(enriched);

            } catch (error) {
                console.error(error);
                return res.status(500).json({ error: "Failed to fetch invoices" });
            }
        });

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

                // 5️⃣ Préparer l'objet facture
                const amount = existingContract.amount ?? 0;
                const vatRate = existingContract.tvaRate ?? 0;

                const invoiceData = {
                    contractId: d.contractId,
                    billingLineId: d.billingLineId,
                    description: d.description || null,
                    dueDate: new Date(d.dueDate),
                    amount: amount.toString(),
                    vatRate: vatRate.toString(),
                    vatAmount: (amount * vatRate).toString(),
                    baseAmount: amount.toString(),
                    redactionAmount: "0",
                    type: TypeInvoice.NORMAL,
                    totalAmount: (amount + amount * vatRate).toString(),
                    status: InvoiceStatus.Draft,
                    invoiceNumber,
                    generatedBy: safeUserId(req),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                // 6️⃣ Insérer la facture
                const invoice = await storage.createInvoice(invoiceData);

                // 7️⃣ Audit log
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
                // 1️⃣ Récupérer la facture
                const invoice = await storage.getInvoice(invoiceId);
                if (!invoice) return res.status(404).json({ error: "Invoice not found" });

                // 2️⃣ Récupérer le contrat associé
                const contract = await db
                    .select()
                    .from(contracts)
                    .where(eq(contracts.id, invoice.contractId))
                    .limit(1)
                    .then((rows) => rows[0]);



                // 4️⃣ Logo (optionnel)
                let logoDataUrl: string | undefined;
                try {
                    const logoPath = path.join(process.cwd(), "server", "assets", "logo.jpeg");
                    const logoBuffer = fs.readFileSync(logoPath);
                    logoDataUrl = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
                } catch (err) {
                    console.warn("[PDF] Logo not found:", err);
                }

                const invoiceForPdf = {
                    invoiceNumber: invoice.invoiceNumber,
                    contractNumber: contract?.number ?? "—",
                    description: invoice.description ?? "",
                    dueDate: invoice.dueDate ?? new Date(),
                    generatedAt: invoice.generatedAt ?? new Date(),
                    status: invoice.status,
                    baseAmount: Number(invoice.baseAmount ?? 0),
                    vatRate: Number(invoice.vatRate ?? 0),
                    vatAmount: Number(invoice.vatAmount ?? 0),
                    redactionAmount: Number(invoice.redactionAmount ?? 0),
                    totalAmount: Number(invoice.totalAmount ?? 0),
                    createdAt: invoice.createdAt ?? new Date(),
                    updatedAt: invoice.updatedAt ?? new Date(),
                };

                const line = invoice.billingLineId
                    ? await db
                        .select()
                        .from(billingLines)
                        .where(eq(billingLines.id, invoice.billingLineId))
                        .limit(1)
                        .then((rows) => {
                            const ln = rows[0];
                            if (!ln) return undefined;
                            return {
                                ...ln,
                                amountHt: Number(ln.amountHt ?? 0),
                                dueDate: ln.dueDate ?? new Date(),
                            };
                        })
                    : undefined;





                // ensuite tu peux appeler
                const html = renderInvoiceHtml(invoiceForPdf, line, { logoDataUrl });


                // 6️⃣ Puppeteer pour générer le PDF
                const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: "domcontentloaded" });
                const pdfBuffer = await page.pdf({
                    format: "A4",
                    printBackground: true,
                    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
                });
                await browser.close();

                // 7️⃣ Envoyer le PDF
                const filename = `invoice_${invoice.invoiceNumber}.pdf`;
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
                res.end(pdfBuffer);
            } catch (err: any) {
                console.error("[PDF] Error generating invoice PDF:", err);
                res.status(500).json({ error: err.message || "PDF generation failed" });
            }
        }
    );

}


/*

=> in the front => Détails du Plan de facturation => billing lines :
 add a button of genarate invoice

 with contract Id + billing line Id + a pop that includ due date + description
 NORMAL(facturation echiance) + ADJUSTEMENT + D'AVOIRE; NORMAL as default value



 sur les route ajuter le module Facture (invoice in client/src/moduls like billing in the strecture) en bas de plans de facturation
  => KPIS
  => and the table of invoice with the action : see more and genarte pdf like billing juste changing his title and the Edite if  it's drafd (the defaut status value)

 */
// in the get all i must add the filtration and pagination
// add the kpis route