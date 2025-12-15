// server/routes/auth.routes.ts

import type { Express, Request, Response, NextFunction } from "express";
import passport from "server/auth";
import bcrypt from "bcrypt";
import { db } from "server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * @typedef LoginRequestBody
 * @property {string} username Identifiant de connexion.
 * @property {string} password Mot de passe.
 */
type LoginRequestBody = {
  username: string;
  password: string;
};

/**
 * @function registerAuthRoutes
 * @description Enregistre les endpoints d'authentification (Passport local) et, si activé, la délégation Keycloak.
 * @param {Express} app Instance Express.
 * @param {boolean} keycloakEnabled Indicateur d'activation Keycloak.
 * @returns {Promise<void>} Promesse de fin d’enregistrement des routes.
 */
export async function registerAuthRoutes(
  app: Express,
  keycloakEnabled: boolean
): Promise<void> {
  // ---------------------------------------------------------------------------
  // BRANCHE KEYCLOAK
  // ---------------------------------------------------------------------------
  if (keycloakEnabled) {
    /**
     * @openapi
     * /api/auth/keycloak/login:
     *   get:
     *     tags: [Auth]
     *     summary: Démarrage du flux OAuth2/OIDC (Keycloak)
     *     responses:
     *       302: { description: Redirection vers le fournisseur d'identité }
     */
    const keycloakRoutes = await import("./authKeycloak");
    app.use("/api/auth/keycloak", keycloakRoutes.default);

    /**
     * @openapi
     * /api/auth/login:
     *   get:
     *     tags: [Auth]
     *     summary: Redirection vers Keycloak (mode fédéré)
     *     responses:
     *       302: { description: Redirection vers /api/auth/keycloak/login }
     */
    app.get("/api/auth/login", (_req: Request, res: Response) => {
      res.redirect("/api/auth/keycloak/login");
    });

    /**
     * @openapi
     * /api/auth/logout:
     *   post:
     *     tags: [Auth]
     *     summary: Déconnexion (Keycloak)
     *     responses:
     *       307: { description: Redirection vers /api/auth/keycloak/logout }
     */
    app.post("/api/auth/logout", (_req: Request, res: Response) => {
      res.redirect(307, "/api/auth/keycloak/logout");
    });

    /**
     * @openapi
     * /api/auth/check:
     *   get:
     *     tags: [Auth]
     *     summary: Vérification de session (Keycloak)
     *     responses:
     *       302: { description: Redirection vers /api/auth/keycloak/check }
     */
    app.get("/api/auth/check", (_req: Request, res: Response) => {
      res.redirect("/api/auth/keycloak/check");
    });

    return;
  }

  // ---------------------------------------------------------------------------
  // BRANCHE AUTH LOCALE (Passport local)
  // ---------------------------------------------------------------------------

  /**
   * @openapi
   * /api/auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Connexion locale (Passport.js)
   *     description: Authentifie via la stratégie locale et crée une session. Le cookie de session est défini côté serveur.
   *     security: []   # pas de cookie requis pour se connecter
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username: { type: string, example: "admin.test" }
   *               password: { type: string, format: password, example: "Admin@123" }
   *     responses:
   *       200:
   *         description: Connexion réussie
   *       401:
   *         description: Identifiants invalides
   *       500:
   *         description: Erreur serveur
   */
  app.post(
    "/api/auth/login",
    (
      req: Request<unknown, unknown, LoginRequestBody>,
      res: Response,
      next: NextFunction
    ) => {
      passport.authenticate("local", (err: unknown, user: any, info: any) => {
        if (err) return res.status(500).json({ error: "Erreur serveur" });
        if (!user) {
          return res
            .status(401)
            .json({ error: info?.message || "Authentification échouée" });
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ error: "Erreur de connexion" });
          }

          const { password: _omit, ...safeUser } = user || {};
          return res
            .status(200)
            .json({ message: "Connexion réussie", user: safeUser });
        });
      })(req, res, next);
    }
  );

  /**
   * @openapi
   * /api/auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Déconnexion (destruction de session)
   *     description: Invalide la session courante et supprime le cookie côté serveur.
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Déconnexion réussie
   *       500:
   *         description: Erreur serveur
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: "Erreur de déconnexion" });
      res.json({ message: "Déconnexion réussie" });
    });
  });

  /**
   * @openapi
   * /api/auth/check:
   *   get:
   *     tags: [Auth]
   *     summary: Statut d'authentification
   *     description: Retourne l'état de connexion et, si connecté, un profil utilisateur sans données sensibles.
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Statut de session
   */
  app.get("/api/auth/check", (req: Request, res: Response) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      const { password: _omit, ...safeUser } = user || {};
      res.json({ authenticated: true, user: safeUser });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  /**
   * @openapi
   * /api/me:
   *   get:
   *     tags: [Auth]
   *     summary: Profil utilisateur courant
   *     description: Retourne l'utilisateur connecté (sans données sensibles) et son rôle.
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Utilisateur authentifié
   *       401:
   *         description: Non authentifié
   */
  app.get("/api/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ authenticated: false, user: null });
    }

    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ authenticated: false, user: null });
    }

    const { password: _omit, ...safeUser } = user || {};

    // Structure compatible avec usePermissions (data.role ou data.user.role)
    return res.json({
      authenticated: true,
      user: safeUser,
    });
  });

  /**
   * Endpoint DEV : création des 3 utilisateurs de test
   * - admin.test / Admin@123      (role: admin)
   * - manager.test / Manager@123  (role: manager)
   * - validator.test / Validator@123 (role: validator)
   */
  app.post(
    "/api/auth/seed-test-users",
    async (_req: Request, res: Response) => {
      try {
        if (process.env.NODE_ENV === "production") {
          return res
            .status(403)
            .json({ error: "Endpoint de seed désactivé en production" });
        }

        const findByUsername = async (username: string) => {
          return db.query.users.findFirst({
            where: eq(users.username, username),
          });
        };

        // ADMIN
        const adminExisting = await findByUsername("admin.test");
        if (!adminExisting) {
          await db.insert(users).values({
            username: "admin.test",
            name: "Admin Test",
            password: await bcrypt.hash("Admin@123", 10),
            role: "admin",
            email: "admin.test@klyxor.dev",
          });
        }

        // MANAGER
        const managerExisting = await findByUsername("manager.test");
        if (!managerExisting) {
          await db.insert(users).values({
            username: "manager.test",
            name: "Manager Test",
            password: await bcrypt.hash("Manager@123", 10),
            role: "manager",
            email: "manager.test@klyxor.dev",
          });
        }

        // VALIDATOR
        const validatorExisting = await findByUsername("validator.test");
        if (!validatorExisting) {
          await db.insert(users).values({
            username: "validator.test",
            name: "Validator Test",
            password: await bcrypt.hash("Validator@123", 10),
            role: "validator",
            email: "validator.test@klyxor.dev",
          });
        }

        return res.json({
          ok: true,
          message:
            "Utilisateurs de test créés (admin.test, manager.test, validator.test).",
        });
      } catch (error: any) {
        console.error("Erreur seed-test-users:", error);
        return res.status(500).json({
          error: "Erreur lors de la création des utilisateurs de test",
          detail: String(error?.message ?? error),
        });
      }
    }
  );
}
