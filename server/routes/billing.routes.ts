// server/routes/billing.routes.ts
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "server/auth";
import { generateBillingScheduleForContract } from "server/services/billing.service";
import { db } from "server/db";
import { and, desc, eq } from "drizzle-orm";
import { billingSchedules, billingLines, contracts } from "@shared/schema";

export function registerBillingRoutes(app: Express) {
  /**
   * @openapi
   * /api/billing-schedules:
   *   get:
   *     summary: List billing schedules
   *     description: Returns all billing schedules. Optionally filter by contractId.
   *     tags: [Billing]
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
   *     tags: [Billing]
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

  /**
   * @openapi
   * /api/billing-schedules/{id}:
   *   post:
   *     summary: Generate a billing schedule for a contract
   *     description: Generates a billing schedule and its lines based on the contract dates, frequency, billing type, and total amount. Usually triggered when a contract moves to VALIDATED.
   *     tags: [Billing]
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
}
