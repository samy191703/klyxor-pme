// server/routes/contracts-routes.ts

import type { Express, Request, Response } from "express";
import { storage } from "server/storage";
import { requirePermission } from "server/middlewares/authMiddleware";
import { isAuthenticated } from "server/auth";
import { InsertContract } from "@shared/schema";

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
   *     summary: Create a new contract
   *     tags: [Contracts]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/InsertContract'
   *     responses:
   *       200:
   *         description: Contract created
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
          "../services/contractNumberGenerator"
        );
        const { validateContract } = await import(
          "../validators/contractValidator"
        );

        const validation: any = validateContract(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: "Données invalides",
            message: validation.message,
            errors: validation.errors,
          });
        }

        const resolvedNumber =
          validation.data.number ||
          (await ContractNumberGenerator.generateContractNumber(
            validation.data.type || "electricity",
            validation.data.businessUnit || "ENGIE Solutions France"
          )) ||
          `CT-${Date.now()}`;

        const insertContract: InsertContract = {
          number: String(resolvedNumber),
          title: String(validation.data.title),
          type: String(validation.data.type),
          businessUnit: String(validation.data.businessUnit),
          amount: validation.data.amount ?? 0,
          currency: String(validation.data.currency ?? "EUR"),
          startDate: validation.data.startDate
            ? new Date(validation.data.startDate)
            : new Date(),
          endDate: validation.data.endDate
            ? new Date(validation.data.endDate)
            : null,
          status: "draft",
          createdBy: (req as any).user?.id
            ? String((req as any).user.id)
            : "system",
          indexationFrequency: validation.data.indexationFrequency ?? null,
          nextIndexationDate: req.body.nextIndexationDate
            ? new Date(req.body.nextIndexationDate)
            : null,
          indexationFormula: validation.data.indexationFormula ?? null,
          indexationFormulaId: validation.data.indexationFormulaId ?? null,
          indexationBaseAmount:
            validation.data.indexationBaseAmount != null
              ? validation.data.indexationBaseAmount
              : null,
          indexationCurrentAmount:
            validation.data.indexationCurrentAmount != null
              ? validation.data.indexationCurrentAmount
              : null,
          indexationIndices: validation.data.indexationIndices ?? null,
          indexationCap:
            validation.data.indexationCap != null
              ? validation.data.indexationCap
              : null,
          indexationThreshold:
            validation.data.indexationThreshold != null
              ? validation.data.indexationThreshold
              : null,
          lastIndexationDate: validation.data.lastIndexationDate
            ? new Date(validation.data.lastIndexationDate)
            : null,
          indexTakingDate: validation.data.indexTakingDate
            ? new Date(validation.data.indexTakingDate)
            : null,
          indexTakingDateRule: validation.data.indexTakingDateRule ?? null,
          calculationMode: validation.data.calculationMode ?? null,
          parkCode: validation.data.parkCode ?? null,
          tariffTiers: validation.data.tariffTiers ?? null,
          lastTierChangeDate: validation.data.lastTierChangeDate
            ? new Date(validation.data.lastTierChangeDate)
            : null,
          lastTierChangeYear:
            validation.data.lastTierChangeYear != null
              ? Number(validation.data.lastTierChangeYear)
              : null,
          hasRequiredDocuments:
            validation.data.hasRequiredDocuments != null
              ? Boolean(validation.data.hasRequiredDocuments)
              : false,
          validatedBy: null,
        };

        const contract = await storage.createContract(insertContract);
        res.json(contract);
      } catch (error) {
        res.status(500).json({ error: "Failed to create contract" });
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
          user: (req as any).user?.id || "system",
          action: "manual_amount_modification",
          entityType: "contract",
          entityId: contractId,
          details,
          traceId: "manual-modification",
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });

        const updatedContract = await storage.updateContract(contractId, {
          amount: newAmount.toString(),
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
}
