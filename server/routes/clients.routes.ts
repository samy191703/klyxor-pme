// server/routes/clients.routes.ts
import { Router, Request, Response } from "express";
import {
  anyClientSchema,
  buildNomAffichage,
  Client,
} from "../client.model";
import { z } from "zod";
// À adapter à ton projet :
import { db } from "../db";               // TODO: remplace par ton helper réel
import { contractsRepo } from "../repos/contractsRepo"; // pour RG6/RG8

export const clientsRouter = Router();

/**
 * Helper : trim de tous les champs texte (RG5)
 */
function trimPayload<T extends Record<string, any>>(payload: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      result[key] = value.trim();
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * GET /api/clients
 * Liste paginée + recherche + tri (RG9–RG15)
 */
clientsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const pageSize = 20; // RG9
    const offset = (page - 1) * pageSize;

    const search = (req.query.search as string | undefined)?.trim();
    const typeClient = req.query.type_client as "PRO" | "PARTICULIER" | undefined;
    const sort = (req.query.sort as string) || "nom"; // "nom" | "type"

    // Exemple SQL générique, à adapter (Drizzle, storage, etc.)
    const params: any[] = [];
    let whereClauses: string[] = [];

    if (typeClient) {
      params.push(typeClient);
      whereClauses.push(`type_client = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const idx = params.length;
      whereClauses.push(
        `(LOWER(raison_sociale) LIKE $${idx} OR LOWER(prenom) LIKE $${idx} OR LOWER(nom) LIKE $${idx} OR LOWER(email) LIKE $${idx} OR siret LIKE $${idx})`
      );
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const orderBy =
      sort === "type"
        ? "ORDER BY type_client, raison_sociale NULLS LAST, nom NULLS LAST, prenom NULLS LAST"
        : "ORDER BY raison_sociale NULLS LAST, nom NULLS LAST, prenom NULLS LAST"; // RG10, RG20

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM clients ${whereSql}`,
      params
    );
    const total = parseInt(countResult.count, 10);

    const rows: Client[] = await db.query<Client>(
      `
      SELECT *
      FROM clients
      ${whereSql}
      ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `,
      params
    );

    res.json({
      page,
      pageSize,
      total,
      data: rows,
    });
  } catch (err) {
    console.error("GET /api/clients error", err);
    res.status(500).json({ message: "Erreur lors de la récupération des clients" });
  }
});

/**
 * GET /api/clients/:id
 * Fiche détaillée (RG15)
 */
clientsRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const client = await db.queryOne<Client>(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );

    if (!client) {
      return res.status(404).json({ message: "Client introuvable" });
    }
    res.json(client);
  } catch (err) {
    console.error("GET /api/clients/:id error", err);
    res.status(500).json({ message: "Erreur lors de la récupération du client" });
  }
});

/**
 * POST /api/clients
 * Création (RG1–RG5, RG2, RG3, RG7)
 */
clientsRouter.post("/", async (req, res) => {
  try {
    const trimmed = trimPayload(req.body);
    const parsed = anyClientSchema.parse(trimmed); // validation selon type_client

    // RG2 : SIRET unique pour PRO
    if (parsed.type_client === "PRO" && parsed.siret) {
      const existing = await db.queryOne<{ id: string }>(
        "SELECT id FROM clients WHERE siret = $1",
        [parsed.siret]
      );
      if (existing) {
        return res.status(400).json({ message: "Un client avec ce SIRET existe déjà" });
      }
    }

    // RG3 : email unique (idéalement pour tous)
    const existingEmail = await db.queryOne<{ id: string }>(
      "SELECT id FROM clients WHERE LOWER(email) = LOWER($1)",
      [parsed.email]
    );
    if (existingEmail) {
      return res.status(400).json({ message: "Un client avec cet email existe déjà" });
    }

    const now = new Date();
    const nomAffichage = buildNomAffichage(parsed);

    const created: Client = await db.queryOne<Client>(
      `
      INSERT INTO clients (
        type_client, raison_sociale, siret,
        prenom, nom,
        email, telephone,
        adresse_ligne1, adresse_ligne2,
        code_postal, ville, pays,
        actif, date_creation, date_modification
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        TRUE,$13,$13
      )
      RETURNING *
    `,
      [
        parsed.type_client,
        (parsed as any).raison_sociale ?? null,
        (parsed as any).siret ?? null,
        (parsed as any).prenom ?? null,
        (parsed as any).nom ?? null,
        parsed.email,
        parsed.telephone ?? null,
        parsed.adresse_ligne1 ?? null,
        parsed.adresse_ligne2 ?? null,
        parsed.code_postal ?? null,
        parsed.ville ?? null,
        parsed.pays ?? null,
        now.toISOString(),
      ]
    );

    res.status(201).json(created);
  } catch (err: any) {
    console.error("POST /api/clients error", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Données invalides", details: err.errors });
    }
    res.status(500).json({ message: "Erreur lors de la création du client" });
  }
});

/**
 * PUT /api/clients/:id
 * Mise à jour (RG1–RG5, RG7)
 */
clientsRouter.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const trimmed = trimPayload(req.body);
    const parsed = anyClientSchema.parse(trimmed);

    // on récupère l'existant
    const current = await db.queryOne<Client>(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );
    if (!current) {
      return res.status(404).json({ message: "Client introuvable" });
    }

    // RG2 : SIRET unique
    if (parsed.type_client === "PRO" && parsed.siret) {
      const existing = await db.queryOne<{ id: string }>(
        "SELECT id FROM clients WHERE siret = $1 AND id <> $2",
        [parsed.siret, id]
      );
      if (existing) {
        return res.status(400).json({ message: "Un autre client utilise déjà ce SIRET" });
      }
    }

    // RG3 : email unique
    const existingEmail = await db.queryOne<{ id: string }>(
      "SELECT id FROM clients WHERE LOWER(email) = LOWER($1) AND id <> $2",
      [parsed.email, id]
    );
    if (existingEmail) {
      return res.status(400).json({ message: "Un autre client utilise déjà cet email" });
    }

    const now = new Date();

    const updated = await db.queryOne<Client>(
      `
      UPDATE clients SET
        type_client = $1,
        raison_sociale = $2,
        siret = $3,
        prenom = $4,
        nom = $5,
        email = $6,
        telephone = $7,
        adresse_ligne1 = $8,
        adresse_ligne2 = $9,
        code_postal = $10,
        ville = $11,
        pays = $12,
        date_modification = $13
      WHERE id = $14
      RETURNING *
    `,
      [
        parsed.type_client,
        (parsed as any).raison_sociale ?? null,
        (parsed as any).siret ?? null,
        (parsed as any).prenom ?? null,
        (parsed as any).nom ?? null,
        parsed.email,
        parsed.telephone ?? null,
        parsed.adresse_ligne1 ?? null,
        parsed.adresse_ligne2 ?? null,
        parsed.code_postal ?? null,
        parsed.ville ?? null,
        parsed.pays ?? null,
        now.toISOString(),
        id,
      ]
    );

    res.json(updated);
  } catch (err: any) {
    console.error("PUT /api/clients/:id error", err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Données invalides", details: err.errors });
    }
    res.status(500).json({ message: "Erreur lors de la mise à jour du client" });
  }
});

/**
 * DELETE /api/clients/:id
 * Suppression avec règles RG6 / RG8
 */
clientsRouter.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const client = await db.queryOne<Client>(
      "SELECT * FROM clients WHERE id = $1",
      [id]
    );
    if (!client) {
      return res.status(404).json({ message: "Client introuvable" });
    }

    // RG6 : client lié à au moins un contrat actif → suppression interdite
    const activeContractsCount = await contractsRepo.countActiveByClientId(id);
    if (activeContractsCount > 0) {
      return res.status(400).json({
        message:
          "Ce client est lié à des contrats actifs. Vous ne pouvez pas le supprimer.",
      });
    }

    // RG8 : lié uniquement à des contrats clos → suppression autorisée (ici on supprime vraiment)
    await db.execute("DELETE FROM clients WHERE id = $1", [id]);

    res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/clients/:id error", err);
    res.status(500).json({ message: "Erreur lors de la suppression du client" });
  }
});

/**
 * GET /api/clients/select
 * Endpoint simplifié pour Contrats, Indexation, etc. (RG16–RG21)
 */
clientsRouter.get("/select/all", async (req, res) => {
  try {
    const rows = await db.query<
      { id: string; type_client: Client["type_client"]; raison_sociale: string | null; prenom: string | null; nom: string | null }
    >(
      `
      SELECT id, type_client, raison_sociale, prenom, nom
      FROM clients
      WHERE actif = TRUE
      ORDER BY
        CASE WHEN type_client = 'PRO' THEN raison_sociale
             ELSE CONCAT(prenom, ' ', nom)
        END
    `
    );

    const data = rows.map((c) => ({
      id: c.id,
      type_client: c.type_client,
      nom_affichage:
        c.type_client === "PRO"
          ? c.raison_sociale
          : `${c.prenom ?? ""} ${c.nom ?? ""}`.trim(),
    }));

    res.json(data);
  } catch (err) {
    console.error("GET /api/clients/select error", err);
    res.status(500).json({ message: "Erreur lors de la récupération de la liste des clients" });
  }
});
