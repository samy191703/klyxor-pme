// server/routes/billing.routes.ts
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "server/auth";
import { generateBillingScheduleForContract } from "server/services/billing.service";
import { db } from "server/db";
import { and, desc, eq } from "drizzle-orm";
import { billingSchedules, billingLines, contracts } from "@shared/schema";
import { renderBillingScheduleHtml } from "server/templates/billing-schedule.template";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

export function registerBillingRoutes(app: Express) {
  /**
   * @openapi
   * /api/billing-schedules:
   *   get:
   *     summary: List billing schedules
   *     description: Returns all billing schedules. Optionally filter by contractId.
   *     tags: [Billing, SAP Integration]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: contractId
   *         schema:
   *           type: string
   *           format: uuid
   *         required: false
   *         description: Filter schedules by contract ID
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 200
   *         required: false
   *         description: Max number of items to return (default 50)
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *         required: false
   *         description: Pagination offset (default 0)
   *     responses:
   *       200:
   *         description: List of billing schedules
   *       401:
   *         description: Unauthorized
   */
  app.get(
    "/api/billing-schedules",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { contractId } = req.query as { contractId?: string };
        const limit = Math.min(
          parseInt(String(req.query.limit ?? "50"), 10) || 50,
          200
        );
        const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0;

        const where = contractId
          ? and(eq(billingSchedules.contractId, contractId))
          : undefined;

        const rows = await db
          .select({
            // billingSchedules fields
            id: billingSchedules.id,
            contractId: billingSchedules.contractId,
            startDate: billingSchedules.startDate,
            endDate: billingSchedules.endDate,
            frequency: billingSchedules.frequency,
            billingType: billingSchedules.billingType,
            version: billingSchedules.version,
            status: billingSchedules.status,
            createdAt: billingSchedules.createdAt,
            updatedAt: billingSchedules.updatedAt,

            // ⬅️ joined contract number for display
            contractNumber: contracts.number,
          })
          .from(billingSchedules)
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(where as any) // drizzle ignores undefined
          .orderBy(desc(billingSchedules.createdAt))
          .limit(limit)
          .offset(offset);

        return res.status(200).json(rows);
      } catch (e: any) {
        return res.status(500).json({ error: e.message || "Server error" });
      }
    }
  );

  /**
   * @openapi
   * /api/billing-schedules/{id}:
   *   get:
   *     summary: Get billing schedule by ID
   *     description: Returns a single billing schedule and its lines.
   *     tags: [Billing, SAP Integration]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Billing schedule ID
   *     responses:
   *       200:
   *         description: Billing schedule with lines
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Not found
   */
  app.get(
    "/api/billing-schedules/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const id = req.params.id;

        // ⬇️ Join contracts to expose contractNumber too
        const scheduleRows = await db
          .select({
            id: billingSchedules.id,
            contractId: billingSchedules.contractId,
            startDate: billingSchedules.startDate,
            endDate: billingSchedules.endDate,
            frequency: billingSchedules.frequency,
            billingType: billingSchedules.billingType,
            version: billingSchedules.version,
            status: billingSchedules.status,
            createdAt: billingSchedules.createdAt,
            updatedAt: billingSchedules.updatedAt,
            contractNumber: contracts.number,
          })
          .from(billingSchedules)
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(eq(billingSchedules.id, id))
          .limit(1);

        if (!scheduleRows.length) {
          return res.status(404).json({ error: "Billing schedule not found" });
        }
        const schedule = scheduleRows[0];

        const lines = await db
          .select()
          .from(billingLines)
          .where(eq(billingLines.scheduleId, id))
          .orderBy(billingLines.dueDate);

        return res.status(200).json({ ...schedule, lines });
      } catch (e: any) {
        return res.status(500).json({ error: e.message || "Server error" });
      }
    }
  );

  function sanitizeFilename(value: string): string {
    return (
      value
        // Normalize to remove accents (é → e, etc.)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        // Replace ANY char not in this safe set with "_"
        // This will remove the EN DASH "–", slashes, parentheses, etc.
        .replace(/[^A-Za-z0-9_.-]/g, "_")
        // Avoid crazy-long filenames
        .slice(0, 100) || "echeancier.pdf"
    );
  }

  /**
   * @openapi
   * /api/billing-schedules/{id}:
   *   post:
   *     summary: Generate a billing schedule for a contract
   *     description: Generates a billing schedule and its lines based on the contract dates, frequency, billing type, and total amount. Usually triggered when a contract moves to VALIDATED.
   *     tags: [Billing, SAP Integration]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Contract ID
   *     responses:
   *       201:
   *         description: Billing schedule created successfully
   *       400:
   *         description: Invalid data or sum mismatch > 0.01
   *       401:
   *         description: Unauthorized
   *       409:
   *         description: Conflict or schedule cannot be generated
   */
  app.post(
    "/api/billing-schedules/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const contractId = req.params.id;
      if (!contractId) {
        return res.status(400).json({ error: "Missing contractId in path" });
      }
      console.log(" Generating billing schedule for contract:", contractId);
      try {
        const out = await generateBillingScheduleForContract({
          contractId,
          userId: (req as any).user?.id ?? "system",
        });
        return res.status(201).json(out);
      } catch (e: any) {
        if (String(e.message || "").includes("Mismatch > 0.01")) {
          return res.status(400).json({ error: e.message });
        }
        return res.status(409).json({ error: e.message || "Conflict" });
      }
    }
  );

  /**
   * @openapi
   * /api/billing-schedules/{id}/pdf:
   *   get:
   *     summary: Export billing schedule as PDF
   *     description: >
   *       Exports a billing schedule and its associated billing lines (échéances) as a formatted PDF document.
   *       The PDF includes:
   *       - Header section with contract number, period, frequency, type, version, status, creation and update dates.
   *       - Table listing all billing lines with sequence number, due date, amount HT, and status.
   *
   *       This endpoint uses Puppeteer to render a styled HTML template into a PDF file for download.
   *     tags:
   *       - Billing
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The UUID of the billing schedule to export.
   *     responses:
   *       200:
   *         description: >
   *           Successfully generated the PDF document of the billing schedule.
   *         content:
   *           application/pdf:
   *             schema:
   *               type: string
   *               format: binary
   *             example: "%PDF-1.7..."
   *       400:
   *         description: Invalid ID format or malformed request.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Invalid ID"
   *       401:
   *         description: Unauthorized – authentication required.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Unauthorized"
   *       404:
   *         description: Billing schedule not found for the provided ID.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Billing schedule not found"
   *       500:
   *         description: Internal server or PDF rendering error.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "PDF generation failed"
   */
  app.get(
    "/api/billing-schedules/:id/pdf",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const id = req.params.id;

        // 1) Fetch schedule
        const scheduleRows = await db
          .select({
            id: billingSchedules.id,
            contractId: billingSchedules.contractId,
            startDate: billingSchedules.startDate,
            endDate: billingSchedules.endDate,
            frequency: billingSchedules.frequency,
            billingType: billingSchedules.billingType,
            version: billingSchedules.version,
            status: billingSchedules.status,
            createdAt: billingSchedules.createdAt,
            updatedAt: billingSchedules.updatedAt,
            contractNumber: contracts.number,
          })
          .from(billingSchedules)
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(eq(billingSchedules.id, id))
          .limit(1);

        if (!scheduleRows.length) {
          return res.status(404).json({ error: "Billing schedule not found" });
        }

        const schedule = scheduleRows[0];

        // 2) Fetch lines
        const lineRows = await db
          .select({
            id: billingLines.id,
            sequenceNo: billingLines.sequenceNo,
            dueDate: billingLines.dueDate,
            amountHt: billingLines.amountHt,
            status: billingLines.status,
          })
          .from(billingLines)
          .where(eq(billingLines.scheduleId, id))
          .orderBy(billingLines.sequenceNo);

        const linesForPdf = lineRows.map((ln) => ({
          sequenceNo: ln.sequenceNo,
          dueDate: ln.dueDate,
          amountHt: ln.amountHt,
          status: ln.status,
        }));

        // 3) Build HTML with your template + logo
        let logoDataUrl: string | undefined;

        try {
          const logoPath = path.join(
            process.cwd(),
            "server",
            "assets",
            "logo.jpeg" // adapt to your actual file name
          );
          const logoBuffer = fs.readFileSync(logoPath);
          logoDataUrl = `data:image/jpeg;base64,${logoBuffer.toString(
            "base64"
          )}`;
        } catch (err) {
          console.warn("Logo not found or failed to load:", err);
          // logoDataUrl stays undefined → no <img> rendered
        }

        // 3) Build HTML with your simplified template
        const html = renderBillingScheduleHtml(
          {
            contractNumber: schedule.contractNumber ?? null,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            frequency: schedule.frequency,
            billingType: schedule.billingType,
            version: schedule.version,
            status: schedule.status,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
          },
          linesForPdf,
          { logoDataUrl }
        );

        // 4) Generate PDF with Puppeteer
        const browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--single-process",
            "--no-zygote",
          ],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load", timeout: 60000 });

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

        console.log("PDF length:", pdfBuffer.length);
        console.log(
          "PDF first bytes:",
          Buffer.from(pdfBuffer.subarray(0, 8)).toString("ascii")
        ); // %PDF-1.4

        const rawContractNumber =
          schedule.contractNumber || schedule.contractId || "plan";
        const baseFilename = `echeancier_${rawContractNumber}_v${schedule.version}.pdf`;
        const filename = sanitizeFilename(baseFilename);

        console.log("PDF filename (raw):", baseFilename);
        console.log("PDF filename (sanitized):", filename);

        // 🔐 Make sure pdfBuffer is a real Buffer and send raw bytes
        const pdfBuf = Buffer.isBuffer(pdfBuffer)
          ? pdfBuffer
          : Buffer.from(pdfBuffer);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${filename}`
        );
        res.end(pdfBuf);
      } catch (e: any) {
        console.error("PDF generation error:", e);
        if (!res.headersSent) {
          return res.status(500).json({ error: e.message || "Server error" });
        }
      }
    }
  );
}
