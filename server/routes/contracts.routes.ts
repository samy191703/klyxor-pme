// server/routes/contracts.routes.ts

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "server/storage";
import { requirePermission } from "server/middlewares/authMiddleware";
import { isAuthenticated } from "server/auth";
import { InsertContract } from "@shared/schema";
import { ContractStatus } from "@shared/enums/contracts-status.enum";

/* ---------------------------------------------------------
 * SCHEMA STEP 1
 * --------------------------------------------------------- */
const contractStep1Schema = z.object({
  number: z.string().trim().optional().nullable(),
  title: z.string().trim().min(1, "Le titre du contrat est obligatoire"),
  clientName: z.string().trim().min(1, "Le nom client est obligatoire"),
  type: z.string().trim().optional().nullable(),
  businessUnit: z.string().trim().optional().nullable(),
  currency: z.string().trim().optional(),
  language: z.string().trim().optional(),
  technology: z.string().trim().optional().nullable(),
  maintainer: z.string().trim().optional().nullable(),
});

/* ---------------------------------------------------------
 * REGISTER CONTRACT ROUTES
 * --------------------------------------------------------- */
export function registerContractRoutes(app: Express): void {
  /* ---------------------------------------------------------
   * GET /api/contracts : liste
   * --------------------------------------------------------- */
  app.get("/api/contracts", isAuthenticated, async (_req, res) => {
    try {
      const contracts = await storage.getContracts();
      res.json(contracts);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch contracts" });
    }
  });

  /* ---------------------------------------------------------
   * GET /api/contracts/:id
   * --------------------------------------------------------- */
  app.get("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const c = await storage.getContract(req.params.id);
      if (!c) return res.status(404).json({ error: "Contract not found" });
      res.json(c);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch contract" });
    }
  });

  /* ---------------------------------------------------------
   * POST /api/contracts (STEP 1 - création)
   * --------------------------------------------------------- */
  app.post(
    "/api/contracts",
    requirePermission("contracts", "create"),
    async (req, res) => {
      try {
        const { ContractNumberGenerator } = await import(
          "../services/references-generator/contractNumberGenerator"
        );

        const parsed = contractStep1Schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Données invalides",
            errors: parsed.error.format(),
          });
        }

        const data = parsed.data;

        const resolvedType = data.type ?? "other";
        const resolvedBU =
          data.businessUnit?.trim() || "ENGIE Solutions France";

        const resolvedNumber =
          data.number?.trim() ||
          (await ContractNumberGenerator.generateContractNumber(
            resolvedType,
            resolvedBU
          )) ||
          `CT-${Date.now()}`;

        const newContract: InsertContract = {
          number: resolvedNumber,
          title: data.title,
          type: resolvedType,
          businessUnit: resolvedBU,
          clientName: data.clientName,
          currency: data.currency ?? "EUR",
          language: data.language ?? "FR",
          technology: data.technology ?? null,
          maintainer: data.maintainer ?? null,

          // placeholders (step2)
          amount: 0,
          tvaRate: 0.07,
          startDate: new Date(),
          endDate: null,

          status: "draft",
          createdBy: (req as any).user?.id || "system",

          // step 3 / indexation placeholders
          indexationFrequency: null,
          indexationDate: null,
          nextIndexationDate: null,
          indexationFormula: null,
          indexationFormulaId: null,
          indexationBaseAmount: null,
          indexationCurrentAmount: null,
          indexationCap: null,
          indexationThreshold: null,
          indexTakingDate: null,
          indexTakingDateRule: null,
          calculationMode: null,
          requireRevised: null,
          indexationBaseAmountSeries: null,
          indexationBaseIndicesSeries: null,
          indexationBaseIndicesValues: null,
          lastIndexationPreview: null,

          parkCode: null,
          tariffTiers: null,
          lastTierChangeDate: null,
          lastTierChangeYear: null,

          hasRequiredDocuments: false,
          validatedBy: null,
        };

        const saved = await storage.createContract(newContract);
        res.json(saved);
      } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Failed to create contract" });
      }
    }
  );

  /* ---------------------------------------------------------
   * PATCH /api/contracts/:id/step1 (édition)
   * --------------------------------------------------------- */
  app.patch(
    "/api/contracts/:id/step1",
    requirePermission("contracts", "update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getContract(id);
        if (!existing) return res.status(404).json({ error: "Not found" });

        const parsed = contractStep1Schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Données invalides",
            errors: parsed.error.format(),
          });
        }

        const d = parsed.data;

        const patch = {
          title: d.title,
          clientName: d.clientName,
          type: d.type ?? existing.type,
          businessUnit: d.businessUnit ?? existing.businessUnit,
          currency: d.currency ?? existing.currency,
          language: d.language ?? existing.language,
          technology: d.technology ?? null,
          maintainer: d.maintainer ?? null,
          updatedAt: new Date(),
        };

        const updated = await storage.updateContract(id, patch);
        res.json(updated);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to update step1" });
      }
    }
  );

  /* ---------------------------------------------------------
   * PATCH /api/contracts/:id/step2
   * --------------------------------------------------------- */
  app.patch(
    "/api/contracts/:id/step2",
    requirePermission("contracts", "update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getContract(id);
        if (!existing) return res.status(404).json({ error: "Not found" });

        const { validateContract } = await import(
          "../validators/contractStepperValidator"
        );

        const validation = validateContract(req.body, "step2");
        if (!validation.success) {
          return res.status(400).json(validation);
        }

        const d = validation.data;

        const toNum = (v: any) =>
          Number.isFinite(v) ? Number(v) : parseFloat(String(v));

        const fixedAmount = toNum(d.fixedAmount) || 0;
        const variableAmount = toNum(d.variableAmount) || 0;

        const patch = {
          startDate: new Date(d.startDate),
          endDate: d.endDate ? new Date(d.endDate) : null,
          fixedAmount,
          variableAmount,
          amount: fixedAmount + variableAmount,
          billingPeriod: d.billingPeriod,
          billingType: d.billingType,
          paymentType: d.paymentType,
          currency: d.currency ?? existing.currency,
          updatedAt: new Date(),
        };

        const updated = await storage.updateContract(id, patch);
        res.json(updated);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to update step2" });
      }
    }
  );

  /* ---------------------------------------------------------
   * PATCH /api/contracts/:id/step3
   * --------------------------------------------------------- */
  app.patch(
    "/api/contracts/:id/step3",
    requirePermission("contracts", "update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getContract(id);
        if (!existing) return res.status(404).json({ error: "Not found" });

        const { validateContract } = await import(
          "../validators/contractStepperValidator"
        );

        const validation = validateContract(req.body, "step3");
        if (!validation.success) {
          return res.status(400).json(validation);
        }

        const d = validation.data;

        const patch = {
          indexationFormula: d.indexationFormula,
          indexationFormulaId: d.indexationFormulaId,
          indexationFrequency: d.indexationFrequency,
          indexationDate: d.indexationDate ? new Date(d.indexationDate) : null,
          nextIndexationDate: d.indexationDate
            ? new Date(d.indexationDate)
            : null,
          updatedAt: new Date(),
        };

        const updated = await storage.updateContract(id, patch);
        res.json(updated);
      } catch (e) {
        console.error(e);
        res
          .status(500)
          .json({ error: "Failed to update contract (step 3)" });
      }
    }
  );

  /* ---------------------------------------------------------
   * PATCH /api/contracts/:id/status — WORKFLOW PAR ACTIONS
   * --------------------------------------------------------- */

  const actionSchema = z.object({
    action: z.enum(["submit", "approve", "reject", "terminate", "close"]),
  });

  app.patch(
    "/api/contracts/:id/status",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const parsed = actionSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Données invalides",
            errors: parsed.error.format(),
          });
        }

        const { action } = parsed.data;

        const user = (req as any).user;
        const role = user?.role ?? "guest";

        const c = await storage.getContract(id);
        if (!c) return res.status(404).json({ error: "Not found" });

        const current = c.status as ContractStatus | string;

        type Transition = {
          from: ContractStatus | string;
          to: ContractStatus | string;
          roles: string[];
        };

        const transitions: Record<string, Transition> = {
          submit: {
            from: "draft",
            to: "pending_validation",
            roles: ["admin", "manager"],
          },
          approve: {
            from: "pending_validation",
            to: "active",
            roles: ["admin", "validator"],
          },
          reject: {
            from: "pending_validation",
            to: "draft",
            roles: ["admin", "validator"],
          },
          terminate: {
            from: "active",
            to: "terminated",
            roles: ["admin"],
          },
          close: {
            from: "terminated",
            to: "closed",
            roles: ["admin"],
          },
        };

        const t = transitions[action];

        if (!t) {
          return res.status(400).json({
            error: "Invalid action",
            message: `Action inconnue : ${action}`,
          });
        }

        if (!t.roles.includes(role)) {
          return res.status(403).json({
            error: "Not allowed",
            message: `Rôle '${role}' interdit pour l'action '${action}'.`,
          });
        }

        if (current !== t.from) {
          return res.status(400).json({
            error: "Invalid transition",
            message: `Transition impossible : statut actuel = '${current}', requis = '${t.from}'.`,
          });
        }

        const updated = await storage.updateContract(id, {
          status: t.to,
          updatedAt: new Date(),
          validatedBy:
            (action === "approve" || action === "reject") &&
            (role === "validator" || role === "admin")
              ? user.id
              : c.validatedBy,
        });

        res.json({
          ok: true,
          action,
          from: current,
          to: t.to,
          updated,
        });
      } catch (e) {
        console.error("STATUS ERROR", e);
        res
          .status(500)
          .json({ error: "Failed to update contract status" });
      }
    }
  );

  /* ---------------------------------------------------------
   * TODO : réintégrer ici tes autres routes (PUT, DELETE, uploads…)
   * --------------------------------------------------------- */
}
