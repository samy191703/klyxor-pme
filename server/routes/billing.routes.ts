// server/routes/billing.routes.ts
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "server/auth";
import { generateBillingScheduleForContract } from "server/services/billing.service";
import { db } from "server/db";
import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { billingSchedules, billingLines, contracts, invoices, indexations } from "@shared/schema";
import { BillingLineStatus } from "@shared/enums/billing.enum";
import { validateStatusTransition } from "server/validators/billing-line-status.validator";
import { storage } from "server/storage";
import { renderBillingScheduleHtml } from "server/templates/billing-schedule.template";
import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { BillingSchedulesQueryDto, KpiFiltersDto } from "@shared/enums/billing.enum";

export function registerBillingRoutes(app: Express) {
  /**
   * @openapi
   * /api/billing-schedules/summary/_issam:
   *   get:
   *     summary: KPIs for Billing
   *     description: Aggregated KPIs for billing schedules and billing lines.
   *     tags:
   *       - Billing
   *     security:
   *       - cookieAuth: []
   *     parameters:
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
   *         name: customer
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Summary KPIs
   *       401:
   *         description: Unauthorized
   */
  app.get(
    "/api/billing-schedules/summary/_issam",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { from, to, customer } = req.query as KpiFiltersDto;

        // Déterminer la période de référence
        const periodStart = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1); // Début de l'année si non spécifié
        const periodEnd = to ? new Date(to) : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59); // Fin de l'année si non spécifié
        
        // Période précédente (N-1) pour calculer l'évolution
        const previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
        const previousPeriodEnd = new Date(periodEnd);
        previousPeriodEnd.setFullYear(previousPeriodEnd.getFullYear() - 1);

        // Fin de l'année en cours (31.12)
        const currentYearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
        
        // Date limite pour les indexations à venir (30 jours)
        const next30Days = new Date();
        next30Days.setDate(next30Days.getDate() + 30);

        const conditions: any[] = [];
        if (from) conditions.push(gte(billingSchedules.startDate, periodStart));
        if (to) conditions.push(lte(billingSchedules.endDate, periodEnd));
        if (customer) conditions.push(eq(contracts.clientName, customer));

        const whereClause = conditions.length ? and(...conditions) : undefined;

        // 1. KPI de facturation globale - Montant total facturé (période sélectionnée)
        const totalInvoicedResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${invoices.totalAmount} * 100), 0)`,
          })
          .from(invoices)
          .leftJoin(billingLines, eq(invoices.billingLineId, billingLines.id))
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              eq(invoices.status, "paid"),
              gte(invoices.generatedAt, periodStart),
              lte(invoices.generatedAt, periodEnd),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const totalInvoiced = Number(totalInvoicedResult[0]?.totalCentimes || 0) / 100;

        // 2. Évolution vs période précédente N-1
        const previousPeriodInvoicedResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${invoices.totalAmount} * 100), 0)`,
          })
          .from(invoices)
          .leftJoin(billingLines, eq(invoices.billingLineId, billingLines.id))
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              eq(invoices.status, "paid"),
              gte(invoices.generatedAt, previousPeriodStart),
              lte(invoices.generatedAt, previousPeriodEnd),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const previousPeriodInvoiced = Number(previousPeriodInvoicedResult[0]?.totalCentimes || 0) / 100;
        const evolutionPercent = previousPeriodInvoiced > 0 
          ? ((totalInvoiced - previousPeriodInvoiced) / previousPeriodInvoiced) * 100 
          : 0;

        // 3. Factures en cours de facturation (statut "inpaid")
        const invoicesInProgressResult = await db
          .select({
            count: sql<number>`COUNT(*)`,
            totalCentimes: sql<number>`COALESCE(SUM(${invoices.totalAmount} * 100), 0)`,
          })
          .from(invoices)
          .leftJoin(billingLines, eq(invoices.billingLineId, billingLines.id))
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              eq(invoices.status, "inpaid"),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const invoicesInProgressCount = Number(invoicesInProgressResult[0]?.count || 0);
        const invoicesInProgressAmount = Number(invoicesInProgressResult[0]?.totalCentimes || 0) / 100;

        // 4. Montant en attente d'émission (statut "A_FACTURER" jusqu'au 31.12 de l'année en cours)
        const pendingBillingLinesResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${billingLines.amountHt} * 100), 0)`,
          })
          .from(billingLines)
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              eq(billingLines.status, BillingLineStatus.A_FACTURER),
              lte(billingLines.dueDate, currentYearEnd),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const pendingAmount = Number(pendingBillingLinesResult[0]?.totalCentimes || 0) / 100;

        // 5. Nombre de factures rejetées (statut "cancelled")
        const rejectedInvoicesResult = await db
          .select({
            count: sql<number>`COUNT(*)`,
          })
          .from(invoices)
          .leftJoin(billingLines, eq(invoices.billingLineId, billingLines.id))
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              eq(invoices.status, "cancelled"),
              gte(invoices.generatedAt, periodStart),
              lte(invoices.generatedAt, periodEnd),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const rejectedInvoicesCount = Number(rejectedInvoicesResult[0]?.count || 0);

        // 6. Montant additionnel généré par les indexations (deltaAmount dans la période)
        const indexationAmountResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${indexations.deltaAmount} * 100), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(indexations)
          .leftJoin(contracts, eq(indexations.contractId, contracts.id))
          .where(
            and(
              gte(indexations.indexationDate, periodStart),
              lte(indexations.indexationDate, periodEnd),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const indexationAmount = Number(indexationAmountResult[0]?.totalCentimes || 0) / 100;
        const indexationCount = Number(indexationAmountResult[0]?.count || 0);

        // 7. Indexations prévues à venir dans les 30 jours
        const upcomingIndexationsResult = await db
          .select({
            count: sql<number>`COUNT(*)`,
          })
          .from(indexations)
          .leftJoin(contracts, eq(indexations.contractId, contracts.id))
          .where(
            and(
              gte(indexations.indexationDate, new Date()),
              lte(indexations.indexationDate, next30Days),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const upcomingIndexationsCount = Number(upcomingIndexationsResult[0]?.count || 0);

        // 8. Montant encaissé (factures payées)
        const collectedAmountResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${invoices.totalAmount} * 100), 0)`,
          })
          .from(invoices)
          .leftJoin(billingLines, eq(invoices.billingLineId, billingLines.id))
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              eq(invoices.status, "paid"),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const collectedAmount = Number(collectedAmountResult[0]?.totalCentimes || 0) / 100;

        // 9. Montant en retard (factures avec dueDate passée et statut "inpaid")
        const overdueAmountResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${invoices.totalAmount} * 100), 0)`,
          })
          .from(invoices)
          .leftJoin(billingLines, eq(invoices.billingLineId, billingLines.id))
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              eq(invoices.status, "inpaid"),
              lte(invoices.dueDate, new Date()),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const overdueAmount = Number(overdueAmountResult[0]?.totalCentimes || 0) / 100;

        // 10. DSO (Days Sales Outstanding) - Moyenne des jours entre génération et paiement
        const dsoResult = await db
          .select({
            avgDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${invoices.updatedAt} - ${invoices.generatedAt})) / 86400), 0)`,
          })
          .from(invoices)
          .leftJoin(billingLines, eq(invoices.billingLineId, billingLines.id))
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              eq(invoices.status, "paid"),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const dso = Number(dsoResult[0]?.avgDays || 0);

        // 11. Prévisions de facturation (3, 6, 12 mois) - basées sur les lignes de facturation à venir
        const now = new Date();
        const forecast3Months = new Date(now);
        forecast3Months.setMonth(forecast3Months.getMonth() + 3);
        const forecast6Months = new Date(now);
        forecast6Months.setMonth(forecast6Months.getMonth() + 6);
        const forecast12Months = new Date(now);
        forecast12Months.setMonth(forecast12Months.getMonth() + 12);

        const forecast3MonthsResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${billingLines.amountHt} * 100), 0)`,
          })
          .from(billingLines)
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              gte(billingLines.dueDate, now),
              lte(billingLines.dueDate, forecast3Months),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const forecast6MonthsResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${billingLines.amountHt} * 100), 0)`,
          })
          .from(billingLines)
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              gte(billingLines.dueDate, now),
              lte(billingLines.dueDate, forecast6Months),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const forecast12MonthsResult = await db
          .select({
            totalCentimes: sql<number>`COALESCE(SUM(${billingLines.amountHt} * 100), 0)`,
          })
          .from(billingLines)
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              gte(billingLines.dueDate, now),
              lte(billingLines.dueDate, forecast12Months),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          );

        const forecast3MonthsAmount = Number(forecast3MonthsResult[0]?.totalCentimes || 0) / 100;
        const forecast6MonthsAmount = Number(forecast6MonthsResult[0]?.totalCentimes || 0) / 100;
        const forecast12MonthsAmount = Number(forecast12MonthsResult[0]?.totalCentimes || 0) / 100;

        // 12. Répartition par type de contrat (pour graphique)
        const contractTypeDistribution = await db
          .select({
            contractType: contracts.type,
            totalCentimes: sql<number>`COALESCE(SUM(${invoices.totalAmount} * 100), 0)`,
          })
          .from(invoices)
          .leftJoin(billingLines, eq(invoices.billingLineId, billingLines.id))
          .leftJoin(billingSchedules, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(
            and(
              gte(invoices.generatedAt, periodStart),
              lte(invoices.generatedAt, periodEnd),
              customer ? eq(contracts.clientName, customer) : undefined
            )
          )
          .groupBy(contracts.type);

        // KPI existants (pour compatibilité)
        const statusKpis = await db
          .select({
            status: billingSchedules.status,
            count: sql`COUNT(*)`,
            totalCentimes: sql`COALESCE(SUM(${billingLines.amountHt} * 100), 0)`,
          })
          .from(billingSchedules)
          .leftJoin(billingLines, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(whereClause)
          .groupBy(billingSchedules.status);

        const typeKpis = await db
          .select({
            billingType: billingSchedules.billingType,
            count: sql`COUNT(*)`,
            totalCentimes: sql`COALESCE(SUM(${billingLines.amountHt} * 100), 0)`,
          })
          .from(billingSchedules)
          .leftJoin(billingLines, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(whereClause)
          .groupBy(billingSchedules.billingType);

        const totals = await db
          .select({
            count: sql`COUNT(*)`,
            totalCentimes: sql`COALESCE(SUM(${billingLines.amountHt} * 100), 0)`,
          })
          .from(billingSchedules)
          .leftJoin(billingLines, eq(billingLines.scheduleId, billingSchedules.id))
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(whereClause);

        return res.status(200).json({
          // Nouveaux KPI selon le ticket
          totalInvoiced,
          evolutionPercent,
          invoicesInProgressCount,
          invoicesInProgressAmount,
          pendingAmount,
          rejectedInvoicesCount,
          indexationAmount,
          indexationCount,
          upcomingIndexationsCount,
          collectedAmount,
          overdueAmount,
          dso,
          forecasts: {
            threeMonths: forecast3MonthsAmount,
            sixMonths: forecast6MonthsAmount,
            twelveMonths: forecast12MonthsAmount,
          },
          contractTypeDistribution: contractTypeDistribution.map((item) => ({
            type: item.contractType,
            amount: Number(item.totalCentimes || 0) / 100,
          })),
          // KPI existants (pour compatibilité)
          status: statusKpis,
          billingType: typeKpis,
          totals: totals[0],
        });
      } catch (e: any) {
        console.error("Error in billing KPIs endpoint:", e);
        return res.status(500).json({ error: e.message });
      }
    }
  );

  /**
   * @openapi
   * /api/billing-schedules:
   *   get:
   *     summary: Get active billing schedule by contractId or list billing schedules
   *     description: |
   *       If contractId query param is provided, returns the active billing schedule for that contract.
   *       Otherwise, returns a paginated list of billing schedules with optional filters.
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
   *         description: Contract ID to get active schedule for
   *       - in: query
   *         name: include
   *         schema:
   *           type: string
   *           enum: [lines]
   *         required: false
   *         description: Include billing lines in response (only when contractId is provided)
   *       - in: query
   *         name: contractNumber
   *     description: Returns billing schedules with pagination and optional filters.
   *     tags: [Billing, SAP Integration]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: contractNumber
   *         schema:
   *           type: string
   *         required: false
   *         description: Filter schedules by contract number
   *       - in: query
   *         name: customer
   *         schema:
   *           type: string
   *         required: false
   *         description: Filter schedules by client name
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         required: false
   *         description: Search filter
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *         required: false
   *         description: Filter schedules by status
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *         required: false
   *         description: Filter schedules by billing type
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *           format: date
   *         required: false
   *         description: Start date filter (YYYY-MM-DD)
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *           format: date
   *         required: false
   *         description: End date filter (YYYY-MM-DD)
   *       - in: query
   *         name: frequency
   *         schema:
   *           type: string
   *         required: false
   *         description: Filter schedules by frequency
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 200
   *         required: false
   *         description: Max number of items to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *         required: false
   *         description: Pagination offset
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *         required: false
   *         description: Sort by a specific field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *         required: false
   *         description: Sort order
   *     responses:
   *       200:
   *         description: List of billing schedules with pagination
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 total:
   *                   type: integer
   *                   description: Total number of schedules matching filters
   *                 rows:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       contractId:
   *                         type: string
   *                       contractNumber:
   *                         type: string
   *                       clientName:
   *                         type: string
   *                         description: Nom du client
   *                       startDate:
   *                         type: string
   *                         format: date
   *                       endDate:
   *                         type: string
   *                         format: date
   *                       frequency:
   *                         type: string
   *                       billingType:
   *                         type: string
   *                       version:
   *                         type: integer
   *                       status:
   *                         type: string
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                       updatedAt:
   *                         type: string
   *                         format: date-time
   *                       lines:
   *                         type: array
   *                         items:
   *                           type: object
   *                           description: Billing lines associated with schedule
   *       401:
   *         description: Unauthorized
   */
  app.get(
  "/api/billing-schedules",
  isAuthenticated,
  async (req: Request<{}, {}, {}, BillingSchedulesQueryDto & { contractId?: string; include?: string }>, res: Response) => {
    try {
      const { contractId, include } = req.query;

      // Handle contractId query - return active schedule for contract
      if (contractId) {
        const startTime = Date.now();
        
        // Find active schedule with highest version for this contract
        const activeSchedules = await db
          .select()
          .from(billingSchedules)
          .where(
            and(
              eq(billingSchedules.contractId, contractId as string),
              eq(billingSchedules.status, "active")
            )
          )
          .orderBy(desc(billingSchedules.version))
          .limit(1);

        if (!activeSchedules.length) {
          return res.status(404).json({ error: "No active billing schedule found for this contract" });
        }

        const schedule = activeSchedules[0];
        let lines: any[] = [];
        let invoiceRefs: Map<string, string> = new Map();

        // Include billing lines if requested
        if (include === "lines") {
          lines = await db
            .select()
            .from(billingLines)
            .where(eq(billingLines.scheduleId, schedule.id))
            .orderBy(asc(billingLines.dueDate));

          // Get invoice references for billing lines
          if (lines.length > 0) {
            const lineIds = lines.map(l => l.id);
            const invoiceRows = await db
              .select({
                billingLineId: invoices.billingLineId,
                invoiceNumber: invoices.invoiceNumber,
              })
              .from(invoices)
              .where(inArray(invoices.billingLineId, lineIds));

            invoiceRefs = new Map(
              invoiceRows.map(inv => [inv.billingLineId, inv.invoiceNumber])
            );
          }
        }

        const responseTime = `${Date.now() - startTime}ms`;

        return res.status(200).json({
          schedule: {
            id: schedule.id,
            contractId: schedule.contractId,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            frequency: schedule.frequency,
            billingType: schedule.billingType,
            version: schedule.version,
            status: schedule.status,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
            ...(include === "lines" && {
              billingLines: lines.map(line => ({
                id: line.id,
                scheduleId: line.scheduleId,
                sequenceNo: line.sequenceNo,
                dueDate: line.dueDate,
                billingStartDate: line.billingStartDate,
                billingEndDate: line.billingEndDate,
                invoiceDate: line.invoiceDate,
                amountHt: line.amountHt?.toString() || "0.00",
                status: line.status,
                invoiceReference: invoiceRefs.get(line.id) || null,
                createdAt: line.createdAt,
                updatedAt: line.updatedAt,
              })),
            }),
          },
          meta: {
            totalLines: lines.length,
            responseTime,
          },
        });
      }

      // Original list logic
      const {
        contractNumber,
        customer,
        search,
        status,
        type,
        from,
        to,
        frequency,
        limit = 25,
        offset = 0,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const parsedLimit = Math.min(Number(limit) || 25, 200);
      const parsedOffset = Number(offset) || 0;
      const parsedSortOrder = sortOrder === "asc" ? "asc" : "desc";

      const parsedFrom = from ? new Date(from) : undefined;
      const parsedTo = to ? new Date(to) : undefined;


      const whereConditions: any[] = [];

      // Contract Number
      if (contractNumber?.toString().trim()) {
        whereConditions.push(sql`${contracts.number} LIKE ${`%${contractNumber.toString().trim()}%`}`);
      }

      // Customer
      if (customer?.toString().trim()) {
        const cust = customer.toString().trim();
        whereConditions.push(ilike(contracts.clientName, `%${cust}%`));
      }

      // Status, Type, Frequency
      if (status) whereConditions.push(eq(billingSchedules.status, String(status)));
      if (type) whereConditions.push(eq(billingSchedules.billingType, String(type)));
      if (frequency) whereConditions.push(eq(billingSchedules.frequency, String(frequency)));

      // Date filters
      if (parsedFrom && parsedTo) {
        whereConditions.push(
          and(
            gte(billingSchedules.startDate, parsedFrom),
            lte(billingSchedules.endDate, parsedTo)
          )
        );
      } else if (parsedFrom) {
        whereConditions.push(gte(billingSchedules.startDate, parsedFrom));
      } else if (parsedTo) {
        whereConditions.push(lte(billingSchedules.endDate, parsedTo));
      }

      // Search filter (trim + lowercase)
      if (search?.toString().trim()) {
        const s = search.toString().trim().toLowerCase();
        whereConditions.push(
          sql`(
            LOWER(${contracts.number}) LIKE ${"%" + s + "%"} OR
            LOWER(${contracts.clientName}) LIKE ${"%" + s + "%"} OR
            LOWER(${billingSchedules.status}) LIKE ${"%" + s + "%"} OR
            LOWER(${billingSchedules.billingType}) LIKE ${"%" + s + "%"} OR
            LOWER(${billingSchedules.frequency}) LIKE ${"%" + s + "%"} OR
            CAST(${billingSchedules.version} AS TEXT) LIKE ${"%" + s + "%"} OR
            CAST(${billingSchedules.startDate} AS TEXT) LIKE ${"%" + s + "%"} OR
            CAST(${billingSchedules.endDate} AS TEXT) LIKE ${"%" + s + "%"}
          )`
        );
      }

      const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      let orderColumn: any = billingSchedules.createdAt;
      switch (String(sortBy)) {
        case "startDate": orderColumn = billingSchedules.startDate; break;
        case "endDate": orderColumn = billingSchedules.endDate; break;
        case "version": orderColumn = billingSchedules.version; break;
        case "status": orderColumn = billingSchedules.status; break;
        case "frequency": orderColumn = billingSchedules.frequency; break;
        case "billingType": orderColumn = billingSchedules.billingType; break;
        case "contractNumber": orderColumn = contracts.number; break;
      }

      const rows = await db
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
          clientName: contracts.clientName,
          tvaRate: contracts.tvaRate,
        })
        .from(billingSchedules)
        .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
        .where(where as any)
        .orderBy(parsedSortOrder === "asc" ? asc(orderColumn) : desc(orderColumn))
        .limit(parsedLimit)
        .offset(parsedOffset);

      const scheduleIds = rows.map(r => r.id);
      const allLines = scheduleIds.length
        ? await db.select().from(billingLines).where(inArray(billingLines.scheduleId, scheduleIds))
        : [];

      const rowsWithLines = rows.map(row => ({
        ...row,
        lines: allLines.filter(line => line.scheduleId === row.id),
      }));

      const [{ count: total }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(billingSchedules)
        .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
        .where(where as any);

      return res.status(200).json({
        rows: rowsWithLines,
        total: Number(total),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Server error" });
    }
  });

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
            tvaRate: contracts.tvaRate,
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

  // --- Browser global (singleton) --- //
  let browserPromise: Promise<Browser> | null = null;

  async function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
      console.log("[PDF] Launching bundled Chromium with puppeteer...");
      browserPromise = puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
        ],
      });
    }
    return browserPromise;
  }

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
      const startedAt = Date.now();
      console.log("[PDF] Request received for schedule", req.params.id);

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
            tvaRate: contracts.tvaRate,
          })
          .from(billingSchedules)
          .leftJoin(contracts, eq(billingSchedules.contractId, contracts.id))
          .where(eq(billingSchedules.id, id))
          .limit(1);

        if (!scheduleRows.length) {
          console.log("[PDF] Schedule not found", id);
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

        const linesForPdf: Array<{
          sequenceNo: number;
          dueDate: Date | string | null;
          amountHt: number | null;
          status: string | null;
        }> = lineRows.map((ln) => ({
          sequenceNo: ln.sequenceNo,
          dueDate: ln.dueDate,
          amountHt: ln.amountHt ? Number(ln.amountHt) : null,
          status: ln.status,
        }));

        console.log(
          "[PDF] Loaded schedule & lines",
          id,
          "lines:",
          linesForPdf.length
        );

        // 3) Logo
        let logoDataUrl: string | undefined;
        try {
          const logoPath = path.join(
            process.cwd(),
            "server",
            "assets",
            "logo.jpeg"
          );
          const logoBuffer = fs.readFileSync(logoPath);
          logoDataUrl = `data:image/jpeg;base64,${logoBuffer.toString(
            "base64"
          )}`;
          console.log("[PDF] Logo loaded from", logoPath);
        } catch (err) {
          console.warn("[PDF] Logo not found or failed to load:", err);
        }

        // 4) Render HTML
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
            tvaRate: schedule.tvaRate,
          },
          linesForPdf,
          { logoDataUrl }
        );
        console.log("[PDF] HTML generated, length:", html.length);

        // 5) Puppeteer (version simple, sans timeout custom)

        console.log("[PDF] Preparing Puppeteer rendering...");

        let browser: Browser | null = null;
        let page: Page | null = null;

        try {
          console.log(
            "[PDF] Resolving Chrome executablePath from puppeteer..."
          );
          const resolvedExecutablePath = await puppeteer.executablePath();
          console.log(
            "[PDF] Puppeteer resolved executablePath =",
            resolvedExecutablePath
          );

          console.log("[PDF] Launching Chrome (puppeteer.launch) with pipe...");
          console.time("[PDF] launch");
          browser = await puppeteer.launch({
            headless: true,
            dumpio: true,
            protocolTimeout: 60000,
            executablePath: resolvedExecutablePath,
            // ⬇⬇ important
            pipe: true,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--no-zygote",
              "--disable-software-rasterizer",
              "--disable-features=UseOzonePlatform",
              // NE PAS mettre --remote-debugging-port ici, puppeteer gère avec pipe
            ],
          });
          console.timeEnd("[PDF] launch");
          console.log("[PDF] Chrome launched OK");

          console.log("[PDF] Creating new page...");
          page = await browser.newPage();
          console.log("[PDF] newPage() done.");

          await page.setRequestInterception(true);
          console.log("[PDF] Request interception enabled.");
          page.on("request", (reqIntercept) => {
            const url = reqIntercept.url();

            if (
              url.startsWith("about:blank") ||
              url.startsWith("data:") ||
              url.startsWith("file:")
            ) {
              return reqIntercept.continue();
            }

            console.log("[PDF] Blocking external request:", url);
            return reqIntercept.abort();
          });

          page.setDefaultTimeout(20000);

          console.time("[PDF] setContent");
          await page.setContent(html, {
            waitUntil: "domcontentloaded",
            timeout: 20000,
          });
          console.timeEnd("[PDF] setContent");

          console.time("[PDF] page.pdf");
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
          console.timeEnd("[PDF] page.pdf");

          await page.close();
          page = null;

          console.log("PDF length:", pdfBuffer.length);
          console.log(
            "PDF first bytes:",
            Buffer.from(pdfBuffer.subarray(0, 8)).toString("ascii")
          );

          const rawContractNumber =
            schedule.contractNumber || schedule.contractId || "plan";
          const baseFilename = `echeancier_${rawContractNumber}_v${schedule.version}.pdf`;
          const filename = sanitizeFilename(baseFilename);

          console.log("PDF filename (raw):", baseFilename);
          console.log("PDF filename (sanitized):", filename);

          const pdfBuf = Buffer.isBuffer(pdfBuffer)
            ? pdfBuffer
            : Buffer.from(pdfBuffer);

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=${filename}`
          );
          res.end(pdfBuf);

          console.log(
            `[PDF] Response sent in ${
              (Date.now() - startedAt) / 1000
            }s for schedule`,
            id
          );
        } catch (e: any) {
          console.error("[PDF] Error during Puppeteer block:", e);
          if (page) {
            try {
              await page.close();
            } catch (_) {}
          }
          if (browser) {
            try {
              await browser.close();
            } catch (_) {}
          }
          if (!res.headersSent) {
            return res
              .status(500)
              .json({ error: e.message || "PDF generation error" });
          }
        }
      } catch (e: any) {
        console.error("PDF generation error:", e);
        if (!res.headersSent) {
          return res.status(500).json({ error: e.message || "Server error" });
        }
      }
    }
  );

  /**
   * @openapi
   * /api/billing-lines/{id}/status:
   *   patch:
   *     summary: Update billing line status
   *     description: |
   *       Updates the status of a billing line with validation of allowed transitions.
   *       Transitions allowed:
   *       - DRAFT → A_FACTURER | ANNULEE
   *       - A_FACTURER → FACTUREE | ANNULEE
   *       All other transitions are forbidden (returns 409).
   *     tags: [Billing]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Billing line ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [DRAFT, A_FACTURER, FACTUREE, ANNULEE]
   *     responses:
   *       200:
   *         description: Status updated successfully
   *       400:
   *         description: Invalid request
   *       404:
   *         description: Billing line not found
   *       409:
   *         description: Status transition not allowed
   *       500:
   *         description: Server error
   */
  app.patch(
    "/api/billing-lines/:id/status",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !Object.values(BillingLineStatus).includes(status)) {
          return res.status(400).json({
            error: "Status invalide. Valeurs autorisées: DRAFT, A_FACTURER, FACTUREE, ANNULEE",
          });
        }

        // Récupérer la ligne actuelle
        const [currentLine] = await db
          .select()
          .from(billingLines)
          .where(eq(billingLines.id, id))
          .limit(1);

        if (!currentLine) {
          return res.status(404).json({ error: "Ligne de facturation non trouvée" });
        }

        const oldStatus = currentLine.status as BillingLineStatus;
        const newStatus = status as BillingLineStatus;

        // Valider la transition
        try {
          validateStatusTransition(oldStatus, newStatus);
        } catch (validationError: any) {
          return res.status(409).json({
            error: validationError.message || "Transition de statut interdite",
          });
        }

        // Mettre à jour le statut
        await db
          .update(billingLines)
          .set({
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(billingLines.id, id));

        // Audit log
        await storage.createAuditLog?.({
          userId: (req as any).user?.id ?? "system",
          username: (req as any).user?.name ?? "System",
          action: "billing_line_status_updated",
          traceId: `billing-line-${id}`,
          entityType: "billing_line",
          entityId: id,
          details: JSON.stringify({
            oldStatus,
            newStatus,
            billingLineId: id,
            scheduleId: currentLine.scheduleId,
          }),
          ipAddress: req.ip || "",
          userAgent: req.get("user-agent") || "",
        });

        return res.status(200).json({
          message: "Statut mis à jour avec succès",
          billingLine: {
            id,
            status: newStatus,
          },
        });
      } catch (e: any) {
        console.error("Error updating billing line status:", e);
        return res.status(500).json({ error: e.message || "Erreur serveur" });
      }
    }
  );

  /**
   * @openapi
   * /api/billing-schedules/{id}:
   *   delete:
   *     summary: Delete a billing schedule
   *     description: |
   *       Deletes a billing schedule. 
   *       Deletion is forbidden if the schedule has at least one billing line with status FACTUREE (returns 409).
   *     tags: [Billing]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Billing schedule ID
   *     responses:
   *       200:
   *         description: Schedule deleted successfully
   *       404:
   *         description: Schedule not found
   *       409:
   *         description: Cannot delete schedule with FACTUREE lines
   *       500:
   *         description: Server error
   */
  app.delete(
    "/api/billing-schedules/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Vérifier que le schedule existe
        const [schedule] = await db
          .select()
          .from(billingSchedules)
          .where(eq(billingSchedules.id, id))
          .limit(1);

        if (!schedule) {
          return res.status(404).json({ error: "Plan de facturation non trouvé" });
        }

        // Vérifier s'il y a des lignes FACTUREE
        const factureeLines = await db
          .select()
          .from(billingLines)
          .where(
            and(
              eq(billingLines.scheduleId, id),
              eq(billingLines.status, BillingLineStatus.FACTUREE)
            )
          )
          .limit(1);

        if (factureeLines.length > 0) {
          return res.status(409).json({
            error:
              "Impossible de supprimer un plan de facturation contenant au moins une échéance facturée",
          });
        }

        // Supprimer les lignes associées (cascade devrait le faire, mais on le fait explicitement)
        await db.delete(billingLines).where(eq(billingLines.scheduleId, id));

        // Supprimer le schedule
        await db.delete(billingSchedules).where(eq(billingSchedules.id, id));

        // Audit log
        await storage.createAuditLog?.({
          userId: (req as any).user?.id ?? "system",
          username: (req as any).user?.name ?? "System",
          action: "billing_schedule_deleted",
          traceId: `billing-schedule-${id}`,
          entityType: "billing_schedule",
          entityId: id,
          details: JSON.stringify({
            scheduleId: id,
            contractId: schedule.contractId,
            version: schedule.version,
          }),
          ipAddress: req.ip || "",
          userAgent: req.get("user-agent") || "",
        });

        return res.status(200).json({
          message: "Plan de facturation supprimé avec succès",
        });
      } catch (e: any) {
        console.error("Error deleting billing schedule:", e);
        return res.status(500).json({ error: e.message || "Erreur serveur" });
      }
    }
  );
}
