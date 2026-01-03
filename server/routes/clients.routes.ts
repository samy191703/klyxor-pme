// server/routes/clients-routes.ts

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { sql, eq, desc, and } from "drizzle-orm";

import { db } from "server/db";
import { storage } from "server/storage";
import { isAuthenticated } from "server/auth";
import { requirePermission } from "server/middlewares/authMiddleware";

import { clients, contracts } from "@shared/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const safeUserId = (req: Request) => (req as any)?.user?.id || "system";

const capitalizeFirst = (s: string) =>
  s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const trim = (s: string) => s.trim();

// Treat "", null, undefined as undefined; otherwise keep string
const optionalTrimmedString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) =>
    typeof v === "string" ? v.trim() || undefined : undefined
  );

const ClientTypeEnum = z.enum(["professionnel", "particulier"]);
const ClientStatusEnum = z.enum(["active", "inactive"]);

/**
 * Phone: "+33xxxxxxxxx" or digits only
 */
const phoneSchema = optionalTrimmedString.refine(
  (v) => {
    if (!v) return true;
    return /^(\+33\d{9}|\d+)$/.test(v);
  },
  {
    message:
      "Format de téléphone invalide (attendu: +33XXXXXXXXX ou chiffres).",
  }
);

/**
 * Common base payload — raw, then refined by type.
 */
const clientUpsertBase = z.object({
  typeClient: ClientTypeEnum,
  email: z
    .string()
    .email("Email invalide.")
    .transform((s) => trim(s)),
  phone: phoneSchema,

  address: z
    .string()
    .min(2, "Adresse trop courte.")
    .max(255, "Adresse trop longue.")
    .transform((s) => trim(s)),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, "Code postal français invalide (5 chiffres).")
    .transform((s) => trim(s)),
  city: z
    .string()
    .min(2, "Ville trop courte.")
    .transform((s) => trim(s)),
  countryCode: z
    .string()
    .length(2, "Code pays ISO (2 lettres).")
    .transform((s) => trim(s.toUpperCase()))
    .default("FR"),

  // Pro
  companyName: optionalTrimmedString,
  siret: optionalTrimmedString,
  paymentTerms: optionalTrimmedString,

  // Particulier
  lastName: optionalTrimmedString,
  firstName: optionalTrimmedString,

  status: ClientStatusEnum.optional().default("active"),
});

// CREATE schema (POST) — enforce type-specific requirements
const clientCreateSchema = clientUpsertBase.superRefine((d, ctx) => {
  if (d.typeClient === "professionnel") {
    if (!d.companyName || d.companyName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyName"],
        message: "La raison sociale est requise (min. 2 caractères).",
      });
    }
    if (!d.siret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["siret"],
        message: "Le SIRET est requis.",
      });
    } else if (!/^\d{14}$/.test(d.siret)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["siret"],
        message: "Le SIRET doit contenir exactement 14 chiffres.",
      });
    }

    if (!d.paymentTerms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentTerms"],
        message: "La condition de paiement est requise.",
      });
    }
  }

  if (d.typeClient === "particulier") {
    if (!d.lastName || d.lastName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastName"],
        message: "Le nom est requis (min. 2 caractères).",
      });
    }
    if (!d.firstName || d.firstName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["firstName"],
        message: "Le prénom est requis (min. 2 caractères).",
      });
    }
  }
});

// UPDATE schema (PUT/PATCH) — partial, with type-specific checks only if fields are present
const clientUpdateSchema = clientUpsertBase.partial().superRefine((d, ctx) => {
  const type = d.typeClient;

  if (!type) return; // if type not changed, skip type-specific rules

  if (type === "professionnel") {
    if ("companyName" in d && (!d.companyName || d.companyName.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyName"],
        message: "La raison sociale ne peut pas être vide.",
      });
    }
    if ("siret" in d) {
      if (!d.siret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["siret"],
          message: "Le SIRET ne peut pas être vide.",
        });
      } else if (!/^\d{14}$/.test(d.siret)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["siret"],
          message: "Le SIRET doit contenir exactement 14 chiffres.",
        });
      }
    }
  }

  if (type === "particulier") {
    if ("lastName" in d && (!d.lastName || d.lastName.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastName"],
        message: "Le nom ne peut pas être vide.",
      });
    }
    if ("firstName" in d && (!d.firstName || d.firstName.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["firstName"],
        message: "Le prénom ne peut pas être vide.",
      });
    }
  }
});

/**
 * RG6 / RG8 helper:
 * - returns { total, active } for contracts linked to this client
 */
async function getClientContractStats(clientId: string) {
  const all = await db
    .select({
      id: contracts.id,
      status: contracts.status,
    })
    .from(contracts)
    .where(eq(contracts.clientId as any, clientId)); // assuming clientId exists

  const active = all.filter((c) => c.status === "active").length;
  return { total: all.length, active };
}

// ---------------------------------------------------------------------------
// Route Registrar
// ---------------------------------------------------------------------------

export function registerClientRoutes(app: Express): void {
  /**
   * @openapi
   * /api/clients:
   *   get:
   *     summary: List clients
   *     tags: [Clients]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200: { description: List of clients }
   *       500: { description: Server error }
   */
  app.get(
    "/api/clients",
    isAuthenticated,
    async (_req: Request, res: Response) => {
      try {
        const rows = await db
          .select({
            id: clients.id,
            typeClient: clients.typeClient,
            email: clients.email,
            phone: clients.phone,
            address: clients.address,
            postalCode: clients.postalCode,
            city: clients.city,
            countryCode: clients.countryCode,
            companyName: clients.companyName,
            siret: clients.siret,
            paymentTerms: clients.paymentTerms,
            lastName: clients.lastName,
            firstName: clients.firstName,
            status: clients.status,
            createdAt: clients.createdAt,
            updatedAt: clients.updatedAt,
          })
          .from(clients)
          .orderBy(desc(clients.createdAt));

        res.json(rows);
      } catch (error) {
        console.error("Failed to fetch clients", error);
        res.status(500).json({ error: "Failed to fetch clients" });
      }
    }
  );

  /**
   * @openapi
   * /api/clients/{id}:
   *   get:
   *     summary: Get a client by ID (with linked contracts)
   *     tags: [Clients]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Client found }
   *       404: { description: Client not found }
   *       500: { description: Server error }
   */
  app.get(
    "/api/clients/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const id = req.params.id;

        const [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, id))
          .limit(1);

        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }

        // Linked contracts (simplified list)
        const linkedContracts = await db
          .select({
            id: contracts.id,
            number: contracts.number,
            title: contracts.title,
            status: contracts.status,
            amount: contracts.amount,
            startDate: contracts.startDate,
            endDate: contracts.endDate,
            businessUnit: contracts.businessUnit,
          })
          .from(contracts)
          .where(eq(contracts.clientId as any, id))
          .orderBy(desc(contracts.startDate));

        res.json({
          client,
          contracts: linkedContracts,
        });
      } catch (error) {
        console.error("Failed to fetch client", error);
        res.status(500).json({ error: "Failed to fetch client" });
      }
    }
  );

  /**
   * @openapi
   * /api/clients:
   *   post:
   *     summary: Create a client (professional or individual)
   *     tags: [Clients]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       201: { description: Client created }
   *       400: { description: Validation error }
   *       409: { description: Duplicate SIRET/Email }
   *       500: { description: Server error }
   */
  app.post(
    "/api/clients",
    requirePermission("clients", "create"),
    async (req: Request, res: Response) => {
      try {
        const parsed = clientCreateSchema.safeParse(req.body);
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

        // RG5: extra trimming/capitalisation business rules
        const insertData = {
          typeClient: d.typeClient,
          email: d.email.trim(),
          phone: d.phone ?? null,
          address: d.address.trim(),
          postalCode: d.postalCode.trim(),
          city: d.city.trim(),
          countryCode: d.countryCode.toUpperCase(),

          companyName:
            d.typeClient === "professionnel"
              ? d.companyName?.trim() || null
              : null,
          siret:
            d.typeClient === "professionnel" ? d.siret?.trim() || null : null,
          paymentTerms:
            d.typeClient === "professionnel"
              ? d.paymentTerms?.trim() || "30j_date_facture"
              : null,

          lastName:
            d.typeClient === "particulier"
              ? d.lastName?.trim().toUpperCase() || null
              : null,
          firstName:
            d.typeClient === "particulier"
              ? d.firstName
                ? capitalizeFirst(d.firstName.trim())
                : null
              : null,

          status: d.status ?? "active",
        };

        const [client] = await db
          .insert(clients)
          .values(insertData as any)
          .returning();

        // Audit log (best-effort)
        try {
          await storage.createAuditLog?.({
            userId: safeUserId(req),
            username: (req as any)?.user?.name || "system",
            role: (req as any)?.user?.role,
            entityType: "client",
            entityId: client.id,
            entityNumber: client.email,
            action: "created",
            details: JSON.stringify({
              typeClient: client.typeClient,
              email: client.email,
            }),
            ipAddress: req.ip || "",
            userAgent: req.headers["user-agent"] || "",
            traceId: `client-${client.id}`,
          });
        } catch (_) {
          // ignore audit failure
        }

        return res.status(201).json(client);
      } catch (error: any) {
        const detail = String(error?.detail || "");

        // RG2/RG3: handle unique constraint violations on email / siret
        if (error?.code === "23505") {
          if (detail.includes("(email)")) {
            return res.status(409).json({
              error: "Duplicate",
              field: "email",
              message: "Cette adresse email est déjà utilisée.",
              detail,
            });
          }
          if (detail.includes("(siret)")) {
            return res.status(409).json({
              error: "Duplicate",
              field: "siret",
              message: "Ce SIRET est déjà utilisé.",
              detail,
            });
          }
        }

        console.error("Failed to create client", error);
        return res.status(500).json({ error: "Failed to create client" });
      }
    }
  );

  /**
   * @openapi
   * /api/clients/{id}:
   *   put:
   *     summary: Replace a client
   *     tags: [Clients]
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
   *       200: { description: Client updated }
   *       400: { description: Validation error }
   *       404: { description: Client not found }
   *       500: { description: Server error }
   */
  app.put(
    "/api/clients/:id",
    requirePermission("clients", "update"),
    async (req: Request, res: Response) => {
      try {
        const parsed = clientCreateSchema.safeParse(req.body); // PUT = full payload
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

        const updateData = {
          typeClient: d.typeClient,
          email: d.email.trim(),
          phone: d.phone ?? null,
          address: d.address.trim(),
          postalCode: d.postalCode.trim(),
          city: d.city.trim(),
          countryCode: d.countryCode.toUpperCase(),
          companyName:
            d.typeClient === "professionnel"
              ? d.companyName?.trim() || null
              : null,
          siret:
            d.typeClient === "professionnel" ? d.siret?.trim() || null : null,
          paymentTerms:
            d.typeClient === "professionnel"
              ? d.paymentTerms?.trim() || "30j_date_facture"
              : null,
          lastName:
            d.typeClient === "particulier"
              ? d.lastName?.trim().toUpperCase() || null
              : null,
          firstName:
            d.typeClient === "particulier"
              ? d.firstName
                ? capitalizeFirst(d.firstName.trim())
                : null
              : null,

          status: d.status ?? "active",
          updatedAt: sql`now()`,
        };

        const [client] = await db
          .update(clients)
          .set(updateData as any)
          .where(eq(clients.id, req.params.id))
          .returning();

        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }

        await storage.createActivityLog?.({
          userId: safeUserId(req),
          userName: (req as any)?.user?.name || "system",
          action: "updated",
          entityType: "client",
          entityId: client.id,
          entityReference: client.email,
          details: `Mise à jour du client: ${client.email}`,
        });

        res.json(client);
      } catch (error: any) {
        const detail = String(error?.detail || "");
        if (error?.code === "23505") {
          if (detail.includes("(email)")) {
            return res.status(409).json({
              error: "Duplicate",
              field: "email",
              message: "Cette adresse email est déjà utilisée.",
              detail,
            });
          }
          if (detail.includes("(siret)")) {
            return res.status(409).json({
              error: "Duplicate",
              field: "siret",
              message: "Ce SIRET est déjà utilisé.",
              detail,
            });
          }
        }

        console.error("Failed to update client", error);
        res.status(500).json({ error: "Failed to update client" });
      }
    }
  );

  /**
   * @openapi
   * /api/clients/{id}:
   *   patch:
   *     summary: Partially update a client
   *     tags: [Clients]
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
   *       200: { description: Client updated }
   *       400: { description: Validation error }
   *       404: { description: Client not found }
   *       500: { description: Server error }
   */
  app.patch(
    "/api/clients/:id",
    requirePermission("clients", "update"),
    async (req: Request, res: Response) => {
      try {
        const parsed = clientUpdateSchema.safeParse(req.body);
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
        const patch: Record<string, unknown> = {};

        if ("typeClient" in d && d.typeClient) patch.typeClient = d.typeClient;
        if ("email" in d && d.email) patch.email = d.email.trim();
        if ("phone" in d) patch.phone = d.phone ?? null;
        if ("address" in d && d.address) patch.address = d.address.trim();
        if ("postalCode" in d && d.postalCode)
          patch.postalCode = d.postalCode.trim();
        if ("city" in d && d.city) patch.city = d.city.trim();
        if ("countryCode" in d && d.countryCode)
          patch.countryCode = d.countryCode.toUpperCase();

        if ("companyName" in d)
          patch.companyName = d.companyName?.trim() || null;
        if ("siret" in d) patch.siret = d.siret?.trim() || null;
        if ("paymentTerms" in d)
          patch.paymentTerms = d.paymentTerms?.trim() || null;

        if ("lastName" in d)
          patch.lastName = d.lastName ? d.lastName.trim().toUpperCase() : null;
        if ("firstName" in d)
          patch.firstName = d.firstName
            ? capitalizeFirst(d.firstName.trim())
            : null;

        if ("status" in d && d.status) patch.status = d.status;

        patch.updatedAt = sql`now()`;

        const [client] = await db
          .update(clients)
          .set(patch)
          .where(eq(clients.id, req.params.id))
          .returning();

        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }

        res.json(client);
      } catch (error: any) {
        const detail = String(error?.detail || "");
        if (error?.code === "23505") {
          if (detail.includes("(email)")) {
            return res.status(409).json({
              error: "Duplicate",
              field: "email",
              message: "Cette adresse email est déjà utilisée.",
              detail,
            });
          }
          if (detail.includes("(siret)")) {
            return res.status(409).json({
              error: "Duplicate",
              field: "siret",
              message: "Ce SIRET est déjà utilisé.",
              detail,
            });
          }
        }

        console.error("Failed to patch client", error);
        res.status(500).json({ error: "Failed to update client" });
      }
    }
  );

  /**
   * @openapi
   * /api/clients/{id}:
   *   delete:
   *     summary: Delete a client
   *     description:
   *       RG6: impossible si au moins un contrat actif est lié.
   *       RG8: si uniquement des contrats clos, suppression possible uniquement avec confirmation (?force=true).
   *     tags: [Clients]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: force
   *         schema: { type: boolean }
   *     responses:
   *       200: { description: Client deleted }
   *       400: { description: Business rule violation }
   *       404: { description: Client not found }
   *       500: { description: Server error }
   */
  app.delete(
    "/api/clients/:id",
    requirePermission("clients", "delete"),
    async (req: Request, res: Response) => {
      try {
        const id = req.params.id;
        const [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, id))
          .limit(1);

        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }

        const { total, active } = await getClientContractStats(id);
        const force = String(req.query.force || "").toLowerCase() === "true";

        // RG6: block if any active contract
        if (active > 0) {
          return res.status(400).json({
            error:
              "Ce client ne peut pas être supprimé car au moins un contrat actif y est rattaché.",
          });
        }

        // RG8: only closed contracts -> require confirmation
        if (total > 0 && active === 0 && !force) {
          return res.status(400).json({
            error:
              "Ce client est lié uniquement à des contrats clos. Confirmez la suppression avec le paramètre ?force=true.",
          });
        }

        await db.delete(clients).where(eq(clients.id, id));

        res.json({ success: true });
      } catch (error) {
        console.error("Failed to delete client", error);
        res.status(500).json({ error: "Failed to delete client" });
      }
    }
  );
}
