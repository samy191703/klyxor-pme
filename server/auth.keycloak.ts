/**
 * @module PassportKeycloakConfig
 * @description Configuration de Passport.js avec stratégie Keycloak
 * 
 * Remplace l'authentification locale par OAuth2/OIDC Keycloak
 * 
 * @author KLYXOR Team
 * @version 2.0.0
 */

import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { RequestHandler } from 'express';
import { keycloakAuth } from './services/keycloakAuth';
import { storage } from './storage';
import { hasPermission } from './permissions';

// Configuration de la stratégie JWT pour Keycloak
const configureKeycloakStrategy = () => {
  const opts = {
    jwtFromRequest: ExtractJwt.fromExtractors([
      // Extraire le token depuis le header Authorization
      ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Ou depuis la session
      (req: any) => req.session?.accessToken || null
    ]),
    secretOrKeyProvider: async (request: any, rawJwtToken: string, done: any) => {
      try {
        // Utiliser Keycloak pour valider le token
        await keycloakAuth.validateToken(rawJwtToken);
        // Le token est valide, on peut continuer
        done(null, 'validated');
      } catch (error) {
        done(error, null);
      }
    },
    passReqToCallback: true
  };
  
  passport.use('keycloak-jwt', new JwtStrategy(opts as any, async (req, jwtPayload, done) => {
    try {
      // Récupérer ou créer l'utilisateur depuis le payload JWT
      const user = await keycloakAuth.createOrUpdateUser(jwtPayload);
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
};

// Middleware d'authentification Keycloak
export const isAuthenticatedKeycloak: RequestHandler = async (req, res, next) => {
  try {
    // Vérifier d'abord la session
    if (req.session?.accessToken) {
      const token = await keycloakAuth.validateToken(req.session.accessToken);
      
      // Vérifier l'expiration
      if (token.exp < Date.now() / 1000) {
        // Tenter de rafraîchir
        if (req.session.refreshToken) {
          try {
            const newTokens = await keycloakAuth.refreshToken(req.session.refreshToken);
            req.session.accessToken = newTokens.access_token;
            req.session.refreshToken = newTokens.refresh_token;
            req.session.idToken = newTokens.id_token;
            
            // Récupérer l'utilisateur
            const newToken = await keycloakAuth.validateToken(newTokens.access_token!);
            const user = await keycloakAuth.createOrUpdateUser(newToken);
            req.user = user;
            return next();
          } catch (refreshError) {
            return res.status(401).json({ error: 'Session expirée' });
          }
        } else {
          return res.status(401).json({ error: 'Token expiré' });
        }
      } else {
        // Token valide, récupérer l'utilisateur
        const user = await keycloakAuth.createOrUpdateUser(token);
        req.user = user;
        return next();
      }
    }
    
    // Sinon vérifier le header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await keycloakAuth.validateToken(token);
      const user = await keycloakAuth.createOrUpdateUser(decodedToken);
      req.user = user;
      return next();
    }
    
    res.status(401).json({ error: 'Non authentifié' });
  } catch (error) {
    console.error('Erreur authentification Keycloak:', error);
    res.status(401).json({ error: 'Authentification invalide' });
  }
};

// Middleware pour vérifier si l'utilisateur est admin
export const isAdminKeycloak: RequestHandler = async (req, res, next) => {
  await isAuthenticatedKeycloak(req, res, () => {
    if ((req.user as any)?.role === 'admin') {
      return next();
    }
    res.status(403).json({ error: 'Accès refusé - Droits administrateur requis' });
  });
};

// Middleware pour vérifier si l'utilisateur peut valider
export const isValidatorKeycloak: RequestHandler = async (req, res, next) => {
  await isAuthenticatedKeycloak(req, res, () => {
    const userRole = (req.user as any)?.role;
    if (hasPermission(userRole, 'contracts', 'validate')) {
      return next();
    }
    res.status(403).json({ error: 'Accès refusé - Droits de validation requis' });
  });
};

// Middleware pour vérifier plusieurs rôles
export const hasRoleKeycloak = (...roles: string[]): RequestHandler => {
  return async (req, res, next) => {
    await isAuthenticatedKeycloak(req, res, () => {
      const userRole = (req.user as any)?.role;
      if (roles.includes(userRole)) {
        return next();
      }
      res.status(403).json({ error: `Accès refusé - Rôles requis: ${roles.join(', ')}` });
    });
  };
};

// Initialiser la stratégie si Keycloak est activé
export const initializeKeycloakAuth = async () => {
  if (process.env.KEYCLOAK_ENABLED === 'true') {
    console.log('🔐 Initialisation de l\'authentification Keycloak...');
    
    // Configurer la stratégie JWT
    configureKeycloakStrategy();
    
    // Initialiser le service Keycloak
    await keycloakAuth.initialize();
    
    // Remplacer les middlewares d'authentification globaux
    const originalAuth = require('./auth');
    originalAuth.isAuthenticated = isAuthenticatedKeycloak;
    originalAuth.isAdmin = isAdminKeycloak;
    originalAuth.isValidator = isValidatorKeycloak;
    originalAuth.hasRole = hasRoleKeycloak;
    
    console.log('✅ Authentification Keycloak activée');
    return true;
  }
  
  console.log('ℹ️ Authentification locale activée (Keycloak désactivé)');
  return false;
};

export default passport;