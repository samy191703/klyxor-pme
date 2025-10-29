// server/routes/contracts-routes.ts

import type { Express, Request, Response } from "express";
import { storage } from "server/storage";
import { requirePermission } from "server/middlewares/authMiddleware";
import { isAuthenticated } from "server/auth";
import { InsertContract } from "@shared/schema";
import { makeSetStatusSchema } from "server/validators/contract-status.validator";
import { ContractStatus } from "@shared/enums/contracts-status.enum";
import {
  ValidationRequestStatus,
  ValidationRequestTypes,
} from "@shared/enums/validation-requests.enum";

/**
 * @function registerContractRoutes
 * @description Registers contract-related HTTP endpoints.
 * @param app Express application instance.
 */
export function registerContractRoutes(app: Express): void {
  /**
   * @openapi
   * /api/contracts:
   *   get:
   *     summary: List contracts
   *     description: Returns every stored contract with basic fields.
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of contracts
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/contracts",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const contracts = await storage.getContracts();
        res.json(contracts);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch contracts" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}:
   *   get:
   *     summary: Get a contract by ID
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Contract found
   *       404:
   *         description: Contract not found
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/contracts/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const contract = await storage.getContract(req.params.id);
        if (!contract) {
          return res.status(404).json({ error: "Contract not found" });
        }
        res.json(contract);
      } catch {
        res.status(500).json({ error: "Failed to fetch contract" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts:
   *   post:
   *     summary: Create a new contract (Step 1 – general info, saved as draft)
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             # Only Step 1 fields are required here
   *             type: object
   *             required: [number, title, clientName, type, businessUnit]
   *             properties:
   *               number: { type: string }
   *               title: { type: string }
   *               clientName: { type: string }
   *               type: { type: string, enum: ["electricity","gas","renewable_ppa","maintenance","OMSA","LTSA","OMGC"] }
   *               businessUnit:
   *                 type: string
   *                 enum: ["ENGIE Solutions France","ENGIE Green","ENGIE Flex","ENGIE Global Energy Management"]
   *               currency: { type: string, enum: ["EUR","USD"], default: "EUR" }
   *               language: { type: string, enum: ["FR","EN"], default: "FR" }
   *               technology: { type: string }
   *               maintainer: { type: string }
   *     responses:
   *       200:
   *         description: Contract draft created (Step 1)
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/contracts",
    requirePermission("contracts", "create"),
    async (req: Request, res: Response) => {
      try {
        const { ContractNumberGenerator } = await import(
          "../services/references-generator/contractNumberGenerator"
        );
        const { validateContract } = await import(
          "../validators/contractStepperValidator"
        ); // <-- uses step-aware validator
        // import { contractStep1Schema } not needed directly; validateContract picks schema by step

        // ✅ Validate only Step 1 fields
        const validation: any = validateContract(req.body, "step1");
        if (!validation.success) {
          return res.status(400).json({
            error: "Données invalides",
            message: validation.message,
            errors: validation.errors,
          });
        }

        // Generate number if missing
        const resolvedNumber =
          /* validation.data.number || */
          (await ContractNumberGenerator.generateContractNumber(
            validation.data.type || "electricity",
            validation.data.businessUnit || "ENGIE Solutions France"
          )) || `CT-${Date.now()}`;

        // ⚠️ DB has NOT NULL on amount & start_date.
        // Provide safe placeholders; they’ll be updated at Step 2.
        const safeAmount = 0;
        const safeStartDate = new Date();

        const insertContract: InsertContract = {
          number: String(resolvedNumber),
          title: String(validation.data.title),
          type: String(validation.data.type),
          businessUnit: String(validation.data.businessUnit),

          // Step 2 placeholders
          amount: safeAmount,
          currency: String(validation.data.currency ?? "EUR"),
          startDate: safeStartDate,
          endDate: null,

          // Core status/meta
          status: "draft",
          createdBy: (req as any).user?.id
            ? String((req as any).user.id)
            : "system",

          // Step 1 extras
          language: validation.data.language ?? "FR",
          clientName: validation.data.clientName,
          technology: validation.data.technology ?? null,

          // Step 3 (all null by default; will be set in step3)
          indexationFrequency: null,
          indexationDate: null,
          nextIndexationDate: null,
          indexationFormula: null,
          indexationFormulaId: null,
          indexationBaseAmount: null,
          indexationCurrentAmount: null, // keep if you use it later
          indexationCap: null,
          indexationThreshold: null,
          //lastIndexationDate: null,
          indexTakingDate: null,
          indexTakingDateRule: null,
          calculationMode: null,
          requireRevised: null,

          // New JSON columns for step3
          indexationBaseAmountSeries: null,
          indexationBaseIndicesSeries: null,
          indexationBaseIndicesValues: null,
          lastIndexationPreview: null,

          // Others
          parkCode: null,
          tariffTiers: null,
          lastTierChangeDate: null,
          lastTierChangeYear: null,
          hasRequiredDocuments: false,
          validatedBy: null,
        };

        const contract = await storage.createContract(insertContract);
        return res.json(contract);
      } catch (error: any) {
        // Duplicate number (unique index)
        const isDup =
          error?.code === "23505" &&
          String(error?.detail || "").includes("(number)");
        if (isDup) {
          return res.status(409).json({
            error: "Duplicate",
            field: "number",
            message: `Ce numéro de contrat est déjà utilisé.`,
            detail: error?.detail,
          });
        }
        console.error(error);
        return res.status(500).json({ error: "Failed to create contract" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}/step1:
   *   patch:
   *     summary: Update contract (Step 1 – general info)
   *     tags: [Contracts]
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
   *             required: [number, title, clientName, type, businessUnit]
   *             properties:
   *               number: { type: string }
   *               title: { type: string }
   *               clientName: { type: string }
   *               type: { type: string, enum: ["electricity","gas","renewable_ppa","maintenance","OMSA","LTSA","OMGC"] }
   *               businessUnit:
   *                 type: string
   *                 enum: ["ENGIE Solutions France","ENGIE Green","ENGIE Flex","ENGIE Global Energy Management"]
   *               currency: { type: string, enum: ["EUR","USD"], default: "EUR" }
   *               language: { type: string, enum: ["FR","EN"], default: "FR" }
   *               technology: { type: string, nullable: true }
   *               maintainer: { type: string, nullable: true }
   *     responses:
   *       200: { description: Contract updated (Step 1) }
   *       400: { description: Validation error }
   *       404: { description: Contract not found }
   *       409: { description: Duplicate contract number }
   *       500: { description: Server error }
   */
  app.patch(
    "/api/contracts/:id/step1",
    requirePermission("contracts", "update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const existing = await storage.getContract(id);
        if (!existing) {
          return res.status(404).json({ error: "Contrat introuvable" });
        }

        const { validateContract } = await import(
          "../validators/contractStepperValidator"
        );
        // Validate exactly Step 1 shape
        const validation: any = validateContract(req.body, "step1");
        if (!validation.success) {
          return res.status(400).json({
            error: "Données invalides",
            message: validation.message,
            errors: validation.errors,
          });
        }
        const d = validation.data;

        // Build patch for Step 1 fields only
        const patch = {
          // number: String(d.number),
          title: String(d.title),
          clientName: String(d.clientName),
          type: String(d.type),
          businessUnit: String(d.businessUnit),
          currency: (d.currency ?? existing.currency ?? "EUR") as "EUR" | "USD",
          language: (d.language ?? existing.language ?? "FR") as "FR" | "EN",
          technology: d.technology ?? null,
          maintainer: d.maintainer ?? null,
          updatedAt: new Date(),
          status: existing.status ?? "draft",
        };

        try {
          const updated = await storage.updateContract(id, patch);
          return res.status(200).json(updated);
        } catch (error: any) {
          // Handle unique index on number
          const isDup =
            error?.code === "23505" &&
            String(error?.detail || "").includes("(number)");
          if (isDup) {
            return res.status(409).json({
              error: "Duplicate",
              field: "number",
              message: `Ce numéro de contrat est déjà utilisé.`,
              detail: error?.detail,
            });
          }
          throw error;
        }
      } catch (error) {
        console.error("PATCH /api/contracts/:id/step1 error:", error);
        return res
          .status(500)
          .json({ error: "Failed to update contract (step 1)" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}/step2:
   *   patch:
   *     summary: Update contract (Step 2 – period & amounts)
   *     tags: [Contracts]
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
   *             required: [startDate, endDate, fixedAmount, billingPeriod, paymentType]
   *             properties:
   *               startDate: { type: string, example: "2025-01-01" }
   *               endDate: { type: string, example: "2027-12-31" }
   *               fixedAmount: { type: number, example: 1000.0 }
   *               variableAmount: { type: number, example: 250.0 }
   *               billingPeriod:
   *                 type: string
   *                 enum: ["monthly","quarterly","semi-annual","annual"]
   *               billingFrequency:
   *                 type: string
   *                 enum: ["monthly","quarterly","semi-annual","annual"]
   *               paymentType:
   *                 type: string
   *                 enum: ["virement","prelevement","cheque"]
   *               currency: { type: string, enum: ["EUR","USD"] }
   *               maxAnnualProduction: { type: number, example: 120000 }
   *               numberOfTurbines: { type: number, example: 10 }
   *               pricePerMWh: { type: number, example: 52.9 }
   *     responses:
   *       200: { description: Contract updated (Step 2) }
   *       400: { description: Validation error }
   *       404: { description: Contract not found }
   *       500: { description: Server error }
   */
  app.patch(
    "/api/contracts/:id/step2",
    requirePermission("contracts", "update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const { validateContract } = await import(
          "../validators/contractStepperValidator"
        );

        const existing = await storage.getContract(id);
        if (!existing) {
          return res.status(404).json({ error: "Contrat introuvable" });
        }

        // 1) Validation pure Step 2 (sans 'type' dans le DTO)
        const validation: any = validateContract(req.body, "step2");
        if (!validation.success) {
          return res.status(400).json({
            error: "Données invalides",
            message: validation.message,
            errors: validation.errors,
          });
        }
        const d = validation.data;

        // 2) Règles ÉNERGIE en fonction du type réel du contrat (DB)
        const isEnergy =
          existing.type === "electricity" || existing.type === "renewable_ppa";

        const energyErrors: Array<{ field: string; message: string }> = [];
        if (isEnergy) {
          if (d.maxAnnualProduction == null) {
            energyErrors.push({
              field: "maxAnnualProduction",
              message:
                "La production annuelle max est requise pour les contrats Énergie",
            });
          }
          if (d.pricePerMWh == null) {
            energyErrors.push({
              field: "pricePerMWh",
              message: "Le prix par MWh est requis pour les contrats Énergie",
            });
          }
        }
        if (energyErrors.length) {
          return res.status(400).json({
            error: "Données invalides",
            message: energyErrors.map((e) => e.message).join(", "),
            errors: energyErrors,
          });
        }

        // 3) Coercitions (support "12,34")
        const toNum = (v: any) =>
          Number.isFinite(v)
            ? Number(v)
            : parseFloat(String(v ?? "").replace(",", "."));

        const fixedAmount = Math.max(0, toNum(d.fixedAmount) || 0);
        const variableAmount = Math.max(0, toNum(d.variableAmount) || 0);
        const amount = fixedAmount + variableAmount;

        // 4) Dates (stockage Date si ton ORM/DB le demande)
        const startDate = new Date(d.startDate);
        const endDate = d.endDate ? new Date(d.endDate) : null;

        // 5) Patch final (aucune normalisation de périodicité — on reçoit déjà le canonique)
        const patch: any = {
          startDate,
          endDate,
          fixedAmount,
          variableAmount,
          amount,
          billingPeriod: d.billingPeriod, // "monthly" | "quarterly" | "semi-annual" | "annual"
          billingType: d.billingType,
          //billingFrequency: d.billingFrequency ?? d.billingPeriod,
          paymentType: d.paymentType,
          currency: d.currency ?? existing.currency ?? "EUR",
          status: existing.status ?? "draft",
        };

        if (isEnergy) {
          patch.maxAnnualProduction =
            d.maxAnnualProduction != null ? toNum(d.maxAnnualProduction) : null;
          patch.numberOfTurbines =
            d.numberOfTurbines != null ? toNum(d.numberOfTurbines) : null;
          patch.pricePerMWh =
            d.pricePerMWh != null ? toNum(d.pricePerMWh) : null;
        }

        const updated = await storage.updateContract(id, patch);
        return res.status(200).json(updated);
      } catch (error: any) {
        console.error("PATCH /api/contracts/:id/step2 error:", error);
        return res
          .status(500)
          .json({ error: "Failed to update contract (step 2)" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}/step3:
   *   patch:
   *     summary: Update contract (Step 3 – indexation settings)
   *     tags: [Contracts]
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
   *             $ref: '#/components/schemas/ContractStep3'  # your zod schema mirror (contractStep3Schema)
   *     responses:
   *       200: { description: Contract updated (Step 3) }
   *       400: { description: Validation error }
   *       404: { description: Contract not found }
   *       500: { description: Server error }
   */
  app.patch(
    "/api/contracts/:id/step3",
    requirePermission("contracts", "update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { validateContract } = await import(
          "../validators/contractStepperValidator"
        );

        const existing = await storage.getContract(id);
        if (!existing)
          return res.status(404).json({ error: "Contrat introuvable" });

        const validation: any = validateContract(req.body, "step3");
        if (!validation.success) {
          return res.status(400).json({
            error: "Données invalides",
            message: validation.message,
            errors: validation.errors,
          });
        }
        const d = validation.data as any;

        const toNum = (v: any) =>
          Number.isFinite(v)
            ? Number(v)
            : parseFloat(String(v ?? "").replace(",", "."));
        const toISO = (s?: string | null) => {
          if (!s) return null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          const date = new Date(s);
          if (isNaN(date.getTime())) return null;
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const dd = String(date.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        };

        const resolveVariableAtDate = (
          input:
            | { mode: "FIXED"; fixed?: number | null }
            | {
                mode: "VARIABLE";
                items?: Array<{ startingFrom: string; value: number }>;
              }
            | undefined,
          effectiveISO: string | null
        ): number | null => {
          if (!input) return null;
          if (input.mode === "FIXED")
            return input.fixed == null ? null : toNum(input.fixed);
          if (
            !effectiveISO ||
            !Array.isArray(input.items) ||
            !input.items.length
          )
            return null;
          const items = [...input.items]
            .map((it) => ({ ...it, startingFrom: toISO(it.startingFrom) }))
            .filter((it) => !!it.startingFrom)
            .sort((a, b) =>
              String(a.startingFrom).localeCompare(String(b.startingFrom))
            );
          let eff: number | null = null;
          for (const it of items) {
            if (String(it.startingFrom) <= effectiveISO) eff = toNum(it.value);
            else break;
          }
          return eff;
        };

        const computedEnabled =
          d.indexationEnabled ??
          (d.indexationFormulaId != null
            ? d.indexationFormulaId !== "none"
            : d.indexationFormula && d.indexationFormula !== "none");

        const indexationISO = toISO(d.indexationDate);
        const lastIndiceISO = toISO(d.lastIndiceDate);
        const effectiveISO =
          d.indexationPolicy === "LAST_INDICE_VALUE"
            ? lastIndiceISO || indexationISO
            : indexationISO;

        const effectiveP0 = resolveVariableAtDate(
          d.baseAmountInput,
          effectiveISO
        );

        const series: Record<string, any> = d.baseIndices || {};
        const effectiveIndices: Record<string, number> = {};
        for (const key of Object.keys(series)) {
          const v = resolveVariableAtDate(series[key], effectiveISO);
          if (v != null) effectiveIndices[key] = v;
        }
        if (d.PN1 != null) effectiveIndices.PN1 = toNum(d.PN1);

        const patch: any = {
          indexationEnabled: !!computedEnabled,
          indexationFormulaId: d.indexationFormulaId,
          indexationFormula: d.indexationFormula,
          indexationFrequency: d.indexationFrequency,
          calculationMode: d.indexationMode === "PN1" ? "Pn-1" : "P0",
          indexTakingDateRule: d.indexationPolicy,
          indexationDate: indexationISO ? new Date(indexationISO) : null,
          nextIndexationDate: indexationISO ? new Date(indexationISO) : null, // keep for dashboards
          indexTakingDate:
            d.indexationPolicy === "LAST_INDICE_VALUE" && lastIndiceISO
              ? new Date(lastIndiceISO)
              : null,
          currency: d.currency ?? existing.currency ?? "EUR",

          requireRevised: d.requireRevised ?? "R",

          indexationCap: d.capPercent == null ? null : toNum(d.capPercent),
          indexationThreshold:
            d.floorPercent == null ? null : toNum(d.floorPercent),

          indexationBaseAmount: effectiveP0 ?? null,
          indexationBaseAmountSeries: d.baseAmountInput ?? null,

          indexationBaseIndicesSeries: Object.keys(series).length
            ? series
            : null,
          indexationBaseIndicesValues: Object.keys(effectiveIndices).length
            ? effectiveIndices
            : null,

          lastIndexationPreview: d.lastIndexationPreview ?? null,

          updatedAt: new Date(),
          status: existing.status ?? "draft",
        };

        // If preview is FINAL & has price, set current amount now
        const preview = d.lastIndexationPreview;
        if (
          preview &&
          typeof preview.status === "string" &&
          preview.status.toUpperCase() === "FINAL"
        ) {
          if (preview.price != null) {
            patch.indexationCurrentAmount = toNum(preview.price);
          }
        }

        const updated = await storage.updateContract(id, patch);
        return res.status(200).json(updated);
      } catch (error) {
        console.error("PATCH /api/contracts/:id/step3 error:", error);
        return res
          .status(500)
          .json({ error: "Failed to update contract (step 3)" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}:
   *   put:
   *     summary: Replace a contract
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/InsertContract'
   *     responses:
   *       200:
   *         description: Contract updated
   *       404:
   *         description: Contract not found
   *       500:
   *         description: Server error
   */
  app.put(
    "/api/contracts/:id",
    isAuthenticated,
    requirePermission("contracts", "update"),
    async (req: Request, res: Response) => {
      try {
        const contractData = {
          ...req.body,
          startDate: req.body.startDate
            ? new Date(req.body.startDate)
            : undefined,
          endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
          nextIndexationDate: req.body.nextIndexationDate
            ? new Date(req.body.nextIndexationDate)
            : undefined,
        };
        const contract = await storage.updateContract(
          req.params.id,
          contractData
        );
        if (!contract) {
          return res.status(404).json({ error: "Contract not found" });
        }
        res.json(contract);
      } catch {
        res.status(500).json({ error: "Failed to update contract" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}:
   *   patch:
   *     summary: Partially update a contract
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Contract updated
   *       404:
   *         description: Contract not found
   *       500:
   *         description: Server error
   */
  app.patch(
    "/api/contracts/:id",
    isAuthenticated,
    requirePermission("contracts", "update"),
    async (req: Request, res: Response) => {
      try {
        const updateData: Record<string, unknown> = {};

        const nonDateFields = [
          "indexationFrequency",
          "indexationFormula",
          "indexationCap",
          "indexationThreshold",
          "calculationMode",
          "indexationFormulaId",
        ] as const;

        for (const field of nonDateFields) {
          if (req.body[field] !== undefined) {
            updateData[field] = req.body[field];
          }
        }

        if (req.body.nextIndexationDate !== undefined) {
          updateData.nextIndexationDate = req.body.nextIndexationDate
            ? new Date(req.body.nextIndexationDate)
            : null;
        }
        if (req.body.indexTakingDate !== undefined) {
          updateData.indexTakingDate = req.body.indexTakingDate
            ? new Date(req.body.indexTakingDate)
            : null;
        }
        if (req.body.lastIndexationDate !== undefined) {
          updateData.lastIndexationDate = req.body.lastIndexationDate
            ? new Date(req.body.lastIndexationDate)
            : null;
        }
        if (req.body.startDate !== undefined) {
          updateData.startDate = req.body.startDate
            ? new Date(req.body.startDate)
            : null;
        }
        if (req.body.endDate !== undefined) {
          updateData.endDate = req.body.endDate
            ? new Date(req.body.endDate)
            : null;
        }

        const contract = await storage.updateContract(
          req.params.id,
          updateData
        );
        if (!contract) {
          return res.status(404).json({ error: "Contract not found" });
        }
        res.json(contract);
      } catch {
        res.status(500).json({ error: "Failed to update contract" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}:
   *   delete:
   *     summary: Delete a contract
   *     description: Only contracts with status `draft` or `terminated` are deletable.
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Contract deleted
   *       400:
   *         description: Business rule violation
   *       404:
   *         description: Contract not found
   *       500:
   *         description: Server error
   */
  app.delete(
    "/api/contracts/:id",
    requirePermission("contracts", "delete"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const contract = await storage.getContract(id);

        if (!contract) {
          return res.status(404).json({ error: "Contract not found" });
        }

        if (!["draft", "terminated"].includes(contract.status)) {
          return res.status(400).json({
            error:
              "Seuls les contrats en brouillon ou résiliés peuvent être supprimés",
          });
        }

        await storage.deleteContract(id);
        res.json({ message: "Contrat supprimé avec succès" });
      } catch {
        res.status(500).json({ error: "Failed to delete contract" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{contractId}/amendments:
   *   get:
   *     summary: List amendments for a contract
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: contractId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Amendments list
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/contracts/:contractId/amendments",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const amendmentsList = await storage.getAmendmentsByContractId(
          req.params.contractId
        );
        res.json(amendmentsList);
      } catch {
        res.status(500).json({ error: "Failed to fetch contract amendments" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}/indexation-config:
   *   put:
   *     summary: Update indexation configuration for a contract
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               indexationDate: { type: string, format: date-time }
   *               indexTakingDate: { type: string, format: date-time }
   *               calculationMode: { type: string }
   *               formula: { type: string }
   *               cap: { type: number }
   *               threshold: { type: number }
   *     responses:
   *       200:
   *         description: Indexation config updated
   *       500:
   *         description: Server error
   */
  app.put(
    "/api/contracts/:id/indexation-config",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const config = req.body;

        const updatedContract = await storage.updateContract(id, {
          nextIndexationDate: config.indexationDate,
          indexTakingDate: config.indexTakingDate,
          calculationMode: config.calculationMode,
          indexationFormulaId: config.formula,
          indexationCap: config.cap,
          indexationThreshold: config.threshold,
        });

        res.json(updatedContract);
      } catch {
        res
          .status(500)
          .json({ error: "Failed to update indexation configuration" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{id}/missing-indices:
   *   get:
   *     summary: Get missing indices for a contract
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Missing indices information
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/contracts/:id/missing-indices",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { indexationEngine } = await import(
          "../services/indexationCalculationEngine"
        );
        const { id } = req.params;

        const missingIndices = await indexationEngine.getMissingIndices(id);
        res.json({ missingIndices });
      } catch {
        res.status(500).json({ error: "Failed to check missing indices" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/upcoming-indexations:
   *   get:
   *     summary: List contracts with indexations occurring within the next 30 days
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Contracts with upcoming indexation
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/contracts/upcoming-indexations",
    isAuthenticated,
    async (_req: Request, res: Response) => {
      try {
        const contracts = await storage.getContracts();
        const now = new Date();
        const thirtyDaysFromNow = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000
        );

        const upcomingContracts = contracts.filter(
          (c) =>
            c.indexationFormulaId &&
            c.nextIndexationDate &&
            new Date(c.nextIndexationDate) > now &&
            new Date(c.nextIndexationDate) <= thirtyDaysFromNow
        );

        res.json(upcomingContracts);
      } catch {
        res.status(500).json({ error: "Failed to fetch upcoming indexations" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/manual-modification:
   *   post:
   *     summary: Apply a manual amount modification with justification
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [contractId, justification, currentAmount, newAmount]
   *             properties:
   *               contractId: { type: string }
   *               modificationType: { type: string }
   *               currentAmount: { type: number }
   *               newAmount: { type: number }
   *               justification: { type: string, minLength: 20 }
   *               effectiveDate: { type: string, format: date-time }
   *               documentReference: { type: string }
   *               approverEmail: { type: string, format: email }
   *     responses:
   *       200:
   *         description: Modification applied
   *       400:
   *         description: Validation error
   *       500:
   *         description: Server error
   */
  app.post(
    "/api/contracts/manual-modification",
    async (req: Request, res: Response) => {
      try {
        const {
          contractId,
          modificationType,
          currentAmount,
          newAmount,
          justification,
          effectiveDate,
          documentReference,
          approverEmail,
        } = req.body as {
          contractId: string;
          modificationType?: string;
          currentAmount: number;
          newAmount: number;
          justification: string;
          effectiveDate?: string;
          documentReference?: string;
          approverEmail?: string;
        };

        if (!contractId || !justification || justification.length < 20) {
          return res.status(400).json({
            error:
              "Contract ID et justification détaillée (min 20 caractères) requis",
          });
        }

        const details = JSON.stringify({
          modificationType,
          previousAmount: currentAmount,
          newAmount,
          justification,
          effectiveDate,
          documentReference,
          approverEmail,
          percentageChange: (
            ((newAmount - currentAmount) / currentAmount) *
            100
          ).toFixed(2),
        });

        await storage.createAuditLog({
          userId: (req as any).user?.id || "system",
          action: "manual_amount_modification",
          entityType: "contract",
          entityId: contractId,
          details,
          traceId: "manual-modification",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });

        const updatedContract = await storage.updateContract(contractId, {
          amount: newAmount,
          updatedAt: new Date(),
        });

        res.json({
          success: true,
          contract: updatedContract,
          message: "Modification manuelle enregistrée avec succès",
        });
      } catch {
        res
          .status(500)
          .json({ error: "Failed to process manual modification" });
      }
    }
  );

  /**
   * @openapi
   * /api/contracts/{contractId}/uploads:
   *   get:
   *     summary: List uploads (documents) for a contract
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: contractId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of documents attached to the contract
   *       404:
   *         description: Contract not found
   *       500:
   *         description: Server error
   */
  app.get(
    "/api/contracts/:contractId/uploads",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { contractId } = req.params;

        // Optional: ensure contract exists
        const contract = await storage.getContract(contractId);
        if (!contract) {
          return res.status(404).json({ error: "Contract not found" });
        }

        const docs = await storage.getDocumentsByContractId(contractId);
        // If you want to hide soft-deleted docs, filter here:
        // const docs = (await storage.getDocumentsByContractId(contractId)).filter(d => d.status !== "deleted");

        res.json(docs);
      } catch (err) {
        console.error("GET /api/contracts/:contractId/uploads error:", err);
        res.status(500).json({ error: "Failed to fetch contract uploads" });
      }
    }
  );

  // --- Contract status update with rules ---

  /**
   * @openapi
   * /api/contracts/{id}/status:
   *   patch:
   *     summary: Mettre à jour le statut d’un contrat
   *     description: >
   *       Met à jour le statut d’un contrat en respectant les transitions autorisées :
   *
   *       - draft → pending_validation
   *       - pending_validation → active | draft
   *       - active → terminated | closed
   *       - terminated → archived
   *       - closed → archived
   *       - archived → (aucune transition)
   *
   *       ⚠️ Préconditions : pour passer à `pending_validation`, le contrat doit avoir
   *       une date de début, une date de fin, et un montant total > 0.
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Identifiant du contrat
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
   *                 enum: [draft, pending_validation, active, terminated, closed, archived]
   *                 description: Nouveau statut du contrat
   *               reason:
   *                 type: string
   *                 maxLength: 500
   *                 description: Raison facultative, enregistrée dans le journal d’activité
   *     responses:
   *       200:
   *         description: Statut mis à jour avec succès
   *       400:
   *         description: Transition invalide ou préconditions non respectées
   *       404:
   *         description: Contrat introuvable
   *       500:
   *         description: Erreur serveur
   */
  app.patch(
    "/api/contracts/:id/status",
    isAuthenticated,
    requirePermission("contracts", "update"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const existing = await storage.getContract(id);
        if (!existing) {
          return res.status(404).json({ error: "Contrat introuvable" });
        }

        // Validate payload + transition
        const schema = makeSetStatusSchema(
          (existing.status as ContractStatus) ?? ContractStatus.DRAFT
        );
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Données invalides",
            errors: parsed.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          });
        }

        const { status, reason } = parsed.data;

        // Pre-checks for submission
        if (status === ContractStatus.PENDING_VALIDATION) {
          const ctx = {
            type: ValidationRequestTypes.CONTRACT, // "contract"
            businessUnit: existing.businessUnit, // e.g. ENGIE Green
            contractType: existing.type, // your contract.type
            parkCode: existing.parkCode ?? undefined, // optional
            amount:
              existing.amount != null ? Number(existing.amount) : undefined, // optional
          };

          // Use enum if you have it; otherwise fall back to the string literal
          const PENDING_STATUS =
            (ValidationRequestStatus?.PENDING as any) ?? "pending";
          // 1️⃣ Resolve via rules
          const { selectedUserId } = await storage.resolveValidationAssignee(
            ctx
          );

          // 2️⃣ If no matching rule, fallback to first available validator user
          let finalAssignee = selectedUserId;
          if (!finalAssignee) {
            const allUsers = await storage.getUsers();
            const fallbackValidator = allUsers.find(
              (u) => u.role === "validator"
            );
            finalAssignee = fallbackValidator?.id || null;
          }

          // 3️⃣ If still no validator in system, fail explicitly (should never happen)
          if (!finalAssignee) {
            throw new Error("No validator found for contract approval.");
          }

          // 4️⃣ Create validation request
          await storage.createValidationRequest({
            type: "contract",
            referenceId: existing.id,
            reference: existing.number,
            subject: `Contract validation — ${existing.number}`,
            requestedBy: (req as any).user?.id || "system",
            assignedTo: finalAssignee,
            status: ValidationRequestStatus.PENDING,
          });

          const basicErrors: string[] = [];
          if (!existing.startDate) basicErrors.push("Date de début manquante");
          if (!existing.endDate) basicErrors.push("Date de fin manquante");
          const total = Number(existing.amount ?? 0);

          if (!total || total <= 0)
            basicErrors.push("Montant total nul ou invalide");
          if (basicErrors.length) {
            return res.status(400).json({
              error: "Préconditions non respectées",
              message: basicErrors.join("; "),
            });
          }
        }

        const updated = await storage.updateContract(id, {
          status,
          updatedAt: new Date(),
        });

        // Audit log (non bloquant)
        try {
          await storage.createAuditLog?.({
            userId: (req as any).user?.id || "system",
            username: (req as any).user?.name || "system",
            action: "status_change",
            traceId: `contract-${id}`,
            entityType: "contract",
            entityId: id,
            details: JSON.stringify({
              from: existing.status,
              to: status,
              reason: reason || null,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
          });
        } catch (e) {
          console.warn("Failed to write audit log", e);
        }

        return res.json(updated);
      } catch (err) {
        console.error("PATCH /api/contracts/:id/status error:", err);
        return res
          .status(500)
          .json({ error: "Échec de la mise à jour du statut du contrat" });
      }
    }
  );
}
