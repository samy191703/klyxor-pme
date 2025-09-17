// server/routes/auth.routes.ts

import type { Express, Request, Response, NextFunction } from "express";
import passport from "server/auth";

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
   *               username: { type: string, example: "admin@example.com" }
   *               password: { type: string, format: password, example: "••••••••" }
   *     responses:
   *       200:
   *         description: Connexion réussie
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string, example: "Connexion réussie" }
   *                 user:
   *                   type: object
   *                   description: Profil utilisateur sans données sensibles
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
        if (!user)
          return res
            .status(401)
            .json({ error: info?.message || "Authentification échouée" });

        req.logIn(user, (loginErr) => {
          if (loginErr)
            return res.status(500).json({ error: "Erreur de connexion" });

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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string, example: "Déconnexion réussie" }
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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 authenticated: { type: boolean, example: true }
   *                 user:
   *                   type: object
   *                   nullable: true
   *       200_alt:
   *         description: Non authentifié
   */
  app.get("/api/auth/check", (req: Request, res: Response) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      const { password: _omit, ...safeUser } = user || {};
      res.json({ authenticated: true, user: safeUser });
    } else {
      res.json({ authenticated: false });
    }
  });
}
