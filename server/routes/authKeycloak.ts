/**
 * @module AuthKeycloakRoutes
 * @description Routes d'authentification OAuth2/OIDC pour Keycloak
 * 
 * Endpoints :
 * - GET /api/auth/keycloak/login - Initie le flow OAuth2
 * - GET /api/auth/keycloak/callback - Callback OAuth2
 * - POST /api/auth/keycloak/logout - Déconnexion
 * - GET /api/auth/keycloak/refresh - Rafraîchissement du token
 * - GET /api/auth/keycloak/userinfo - Informations utilisateur
 * 
 * @author KLYXOR Team
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { keycloakAuth } from '../services/keycloakAuth';
import { securityMonitor } from '../services/securityMonitor';
import { storage } from '../storage';
import crypto from 'crypto';

const router = Router();

/**
 * @route GET /api/auth/keycloak/login
 * @description Initie le processus de connexion OAuth2 avec Keycloak
 * 
 * @returns Redirection vers Keycloak pour authentification
 */
router.get('/login', async (req: Request, res: Response) => {
  try {
    // Générer state et nonce pour sécurité
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Sauvegarder dans la session
    req.session.oauth2State = state;
    req.session.oauth2Nonce = nonce;
    
    // Récupérer l'URL de redirection depuis le query param
    const returnTo = req.query.returnTo as string || '/';
    req.session.returnTo = returnTo;
    
    // Obtenir l'URL d'autorisation Keycloak
    await keycloakAuth.getClient(); // S'assurer que le client est initialisé
    const authUrl = keycloakAuth.getAuthorizationUrl(state, nonce);
    
    console.log('🔐 Redirection vers Keycloak pour authentification');
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initiation de la connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

/**
 * @route GET /api/auth/keycloak/callback
 * @description Callback OAuth2 après authentification Keycloak
 * 
 * @param {string} code - Code d'autorisation OAuth2
 * @param {string} state - State pour validation CSRF
 * @returns {Object} Utilisateur authentifié ou erreur
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Vérifier le state pour protection CSRF
    if (req.query.state !== req.session.oauth2State) {
      console.error('⚠️ State invalide - possible attaque CSRF');
      await securityMonitor.recordLoginAttempt('unknown', ip, false);
      return res.status(400).json({ error: 'State invalide' });
    }
    
    // Gérer le callback et récupérer les tokens
    const tokenSet = await keycloakAuth.handleCallback(req);
    
    if (!tokenSet.access_token) {
      throw new Error('Pas d\'access token reçu');
    }
    
    // Valider et décoder le token
    const decodedToken = await keycloakAuth.validateToken(tokenSet.access_token);
    
    // Créer ou mettre à jour l'utilisateur
    const user = await keycloakAuth.createOrUpdateUser(decodedToken);
    
    // Sauvegarder les tokens dans la session
    req.session.accessToken = tokenSet.access_token;
    req.session.refreshToken = tokenSet.refresh_token;
    req.session.idToken = tokenSet.id_token;
    req.session.tokenExpiry = new Date(decodedToken.exp * 1000);
    
    // Sauvegarder l'utilisateur dans la session
    req.user = user;
    req.session.userId = user.id;
    
    // Enregistrer la connexion réussie
    await securityMonitor.recordLoginAttempt(user.username, ip, true);
    
    // Nettoyer les données OAuth2 temporaires
    delete req.session.oauth2State;
    delete req.session.oauth2Nonce;
    
    // Rediriger vers la page demandée ou accueil
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    
    console.log(`✅ Authentification réussie pour ${user.username} (${user.role})`);
    res.redirect(returnTo);
    
  } catch (error) {
    console.error('❌ Erreur lors du callback OAuth2:', error);
    const ip = req.ip || 'unknown';
    await securityMonitor.recordLoginAttempt('unknown', ip, false);
    res.status(401).redirect('/?error=authentication_failed');
  }
});

/**
 * @route POST /api/auth/keycloak/logout
 * @description Déconnexion avec Single Logout Keycloak
 * 
 * @returns Redirection vers Keycloak pour déconnexion complète
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const idToken = req.session.idToken;
    
    // Détruire la session locale
    req.session.destroy((err) => {
      if (err) {
        console.error('Erreur lors de la destruction de session:', err);
      }
    });
    
    // Obtenir l'URL de déconnexion Keycloak
    const logoutUrl = keycloakAuth.getLogoutUrl(idToken);
    
    console.log('👋 Déconnexion et redirection vers Keycloak');
    res.json({ 
      success: true, 
      logoutUrl // Le client frontend devra faire la redirection
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
});

/**
 * @route GET /api/auth/keycloak/refresh
 * @description Rafraîchit le token d'accès
 * 
 * @returns {Object} Nouveaux tokens ou erreur
 */
router.get('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.session.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Pas de refresh token' });
    }
    
    // Rafraîchir les tokens
    const newTokenSet = await keycloakAuth.refreshToken(refreshToken);
    
    // Mettre à jour la session
    req.session.accessToken = newTokenSet.access_token;
    req.session.refreshToken = newTokenSet.refresh_token;
    req.session.idToken = newTokenSet.id_token;
    
    if (newTokenSet.access_token) {
      const decodedToken = await keycloakAuth.validateToken(newTokenSet.access_token);
      req.session.tokenExpiry = new Date(decodedToken.exp * 1000);
    }
    
    res.json({ 
      success: true,
      expiresAt: req.session.tokenExpiry
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du refresh token:', error);
    res.status(401).json({ error: 'Impossible de rafraîchir le token' });
  }
});

/**
 * @route GET /api/auth/keycloak/userinfo
 * @description Récupère les informations de l'utilisateur connecté
 * 
 * @returns {Object} Informations utilisateur ou erreur
 */
router.get('/userinfo', keycloakAuth.verifyTokenMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const token = req.keycloakToken;
    
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        keycloakId: user.keycloakId
      },
      keycloak: {
        realm: token?.realm_access?.roles || [],
        clientRoles: token?.resource_access || {},
        tokenExpiry: req.session.tokenExpiry
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des infos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/auth/keycloak/check
 * @description Vérifie l'état de l'authentification
 * 
 * @returns {Object} État de l'authentification
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    const accessToken = req.session.accessToken;
    
    if (!accessToken) {
      return res.json({ authenticated: false });
    }
    
    // Vérifier si le token est encore valide
    try {
      const decodedToken = await keycloakAuth.validateToken(accessToken);
      
      // Vérifier l'expiration
      if (decodedToken.exp < Date.now() / 1000) {
        // Token expiré, tenter un refresh
        if (req.session.refreshToken) {
          const newTokenSet = await keycloakAuth.refreshToken(req.session.refreshToken);
          req.session.accessToken = newTokenSet.access_token;
          req.session.refreshToken = newTokenSet.refresh_token;
          req.session.idToken = newTokenSet.id_token;
          
          // Récupérer l'utilisateur
          const userId = req.session.userId;
          if (userId) {
            const user = await storage.getUser(userId);
            return res.json({ 
              authenticated: true, 
              user,
              tokenRefreshed: true 
            });
          }
        }
        return res.json({ authenticated: false, reason: 'Token expiré' });
      }
      
      // Token valide, récupérer l'utilisateur
      const userId = req.session.userId;
      if (userId) {
        const user = await storage.getUser(userId);
        return res.json({ authenticated: true, user });
      }
      
      return res.json({ authenticated: false });
      
    } catch (error) {
      console.error('Token invalide:', error);
      return res.json({ authenticated: false, reason: 'Token invalide' });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route POST /api/auth/keycloak/introspect
 * @description Introspecte un token pour vérifier sa validité (admin only)
 * 
 * @param {string} token - Token à introspecter
 * @returns {Object} Informations sur le token
 */
router.post('/introspect', keycloakAuth.requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token requis' });
    }
    
    const decodedToken = await keycloakAuth.validateToken(token);
    
    res.json({
      active: decodedToken.exp > Date.now() / 1000,
      exp: new Date(decodedToken.exp * 1000),
      iat: new Date(decodedToken.iat * 1000),
      sub: decodedToken.sub,
      username: decodedToken.preferred_username,
      email: decodedToken.email,
      roles: decodedToken.realm_access?.roles || [],
      client: decodedToken.azp
    });
    
  } catch (error) {
    res.json({ 
      active: false,
      error: 'Token invalide ou expiré' 
    });
  }
});

export default router;