/**
 * @module KeycloakAuthService
 * @description Service d'authentification OAuth2/OpenID Connect avec Keycloak
 * 
 * Gère l'intégration complète avec Keycloak IAM :
 * - Authentification OAuth2/OIDC
 * - Gestion des tokens JWT
 * - Refresh token automatique
 * - Mapping des rôles Keycloak vers KLYXOR
 * - Single Sign-On (SSO)
 * - Single Logout (SLO)
 * 
 * @author KLYXOR Team
 * @version 2.0.0
 * @since 2025-09-03
 */

import * as openidClient from 'openid-client';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { securityMonitor } from './securityMonitor';

/**
 * Configuration Keycloak
 */
interface KeycloakConfig {
  realm: string;
  authServerUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scope: string;
  rolesClaim?: string;
  adminRole?: string;
}

/**
 * Token décodé Keycloak
 */
interface KeycloakToken {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [client: string]: {
      roles: string[];
    };
  };
  exp: number;
  iat: number;
  azp: string;
}

/**
 * @class KeycloakAuthService
 * @description Service principal pour l'authentification Keycloak
 */
export class KeycloakAuthService {
  private static instance: KeycloakAuthService;
  private client: Client | null = null;
  private issuer: Issuer | null = null;
  private config: KeycloakConfig;
  private jwksClient: any;
  
  private constructor() {
    // Configuration depuis variables d'environnement
    this.config = {
      realm: process.env.KEYCLOAK_REALM || 'ENGIE',
      authServerUrl: process.env.KEYCLOAK_AUTH_URL || 'https://keycloak.engie.com/auth',
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'klyxor-client',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      redirectUri: process.env.KEYCLOAK_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
      postLogoutRedirectUri: process.env.KEYCLOAK_POST_LOGOUT_URI || 'http://localhost:5000',
      scope: 'openid profile email roles',
      rolesClaim: 'realm_access.roles',
      adminRole: 'klyxor-admin'
    };
    
    // Configuration du client JWKS pour validation des tokens
    this.jwksClient = jwksRsa({
      jwksUri: `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000 // 10 minutes
    });
  }
  
  /**
   * @method getInstance
   * @description Récupère l'instance singleton du service
   */
  public static getInstance(): KeycloakAuthService {
    if (!KeycloakAuthService.instance) {
      KeycloakAuthService.instance = new KeycloakAuthService();
    }
    return KeycloakAuthService.instance;
  }
  
  /**
   * @method initialize
   * @description Initialise la connexion avec Keycloak
   * 
   * @returns {Promise<Client>} Client OpenID Connect configuré
   */
  async initialize(): Promise<Client> {
    try {
      console.log('🔐 Initialisation de Keycloak...');
      
      // Découverte de la configuration OpenID Connect
      const keycloakIssuer = await Issuer.discover(
        `${this.config.authServerUrl}/realms/${this.config.realm}`
      );
      
      this.issuer = keycloakIssuer;
      
      // Création du client OpenID Connect
      this.client = new keycloakIssuer.Client({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uris: [this.config.redirectUri],
        post_logout_redirect_uris: [this.config.postLogoutRedirectUri],
        response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: this.config.clientSecret ? 'client_secret_basic' : 'none'
      });
      
      console.log('✅ Keycloak initialisé avec succès');
      console.log(`   Realm: ${this.config.realm}`);
      console.log(`   Client ID: ${this.config.clientId}`);
      
      return this.client;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de Keycloak:', error);
      throw error;
    }
  }
  
  /**
   * @method getClient
   * @description Récupère le client OpenID Connect
   */
  async getClient(): Promise<Client> {
    if (!this.client) {
      await this.initialize();
    }
    return this.client!;
  }
  
  /**
   * @method getAuthorizationUrl
   * @description Génère l'URL d'autorisation Keycloak
   * 
   * @param {string} state - State pour protection CSRF
   * @param {string} nonce - Nonce pour protection replay
   * @returns {string} URL de redirection vers Keycloak
   */
  getAuthorizationUrl(state: string, nonce: string): string {
    if (!this.client) {
      throw new Error('Client Keycloak non initialisé');
    }
    
    return this.client.authorizationUrl({
      scope: this.config.scope,
      state,
      nonce,
      prompt: 'login' // Force l'affichage de la page de connexion
    });
  }
  
  /**
   * @method handleCallback
   * @description Gère le callback OAuth2 de Keycloak
   * 
   * @param {Request} req - Requête Express
   * @returns {Promise<TokenSet>} Tokens récupérés
   */
  async handleCallback(req: Request): Promise<TokenSet> {
    if (!this.client) {
      throw new Error('Client Keycloak non initialisé');
    }
    
    const params = this.client.callbackParams(req);
    const tokenSet = await this.client.callback(
      this.config.redirectUri,
      params,
      {
        state: req.session?.oauth2State,
        nonce: req.session?.oauth2Nonce
      }
    );
    
    return tokenSet;
  }
  
  /**
   * @method validateToken
   * @description Valide un token JWT Keycloak
   * 
   * @param {string} token - Token JWT à valider
   * @returns {Promise<KeycloakToken>} Token décodé et validé
   */
  async validateToken(token: string): Promise<KeycloakToken> {
    return new Promise((resolve, reject) => {
      const getKey = (header: any, callback: any) => {
        this.jwksClient.getSigningKey(header.kid, (err: any, key: any) => {
          if (err) {
            return callback(err);
          }
          const signingKey = key.getPublicKey();
          callback(null, signingKey);
        });
      };
      
      jwt.verify(
        token,
        getKey,
        {
          audience: this.config.clientId,
          issuer: `${this.config.authServerUrl}/realms/${this.config.realm}`,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded as KeycloakToken);
          }
        }
      );
    });
  }
  
  /**
   * @method refreshToken
   * @description Rafraîchit un token expiré
   * 
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<TokenSet>} Nouveaux tokens
   */
  async refreshToken(refreshToken: string): Promise<TokenSet> {
    if (!this.client) {
      throw new Error('Client Keycloak non initialisé');
    }
    
    return await this.client.refresh(refreshToken);
  }
  
  /**
   * @method mapKeycloakRoles
   * @description Mappe les rôles Keycloak vers les rôles KLYXOR
   * 
   * @param {KeycloakToken} token - Token Keycloak décodé
   * @returns {string} Rôle KLYXOR correspondant
   */
  mapKeycloakRoles(token: KeycloakToken): string {
    const keycloakRoles = token.realm_access?.roles || [];
    const clientRoles = token.resource_access?.[this.config.clientId]?.roles || [];
    const allRoles = [...keycloakRoles, ...clientRoles];
    
    // Mapping des rôles Keycloak vers KLYXOR
    if (allRoles.includes('klyxor-admin') || allRoles.includes('realm-admin')) {
      return 'admin';
    } else if (allRoles.includes('klyxor-manager') || allRoles.includes('contract-manager')) {
      return 'manager';
    } else if (allRoles.includes('klyxor-validator') || allRoles.includes('validator')) {
      return 'validator';
    } else if (allRoles.includes('klyxor-finance') || allRoles.includes('finance-manager')) {
      return 'finance_manager';
    } else if (allRoles.includes('klyxor-business-unit') || allRoles.includes('bu-manager')) {
      return 'business_unit_manager';
    } else if (allRoles.includes('klyxor-contract')) {
      return 'contract_manager';
    }
    
    // Rôle par défaut pour les utilisateurs authentifiés
    return 'validator';
  }
  
  /**
   * @method createOrUpdateUser
   * @description Crée ou met à jour un utilisateur depuis Keycloak
   * 
   * @param {KeycloakToken} token - Token Keycloak
   * @returns {Promise<any>} Utilisateur créé/mis à jour
   */
  async createOrUpdateUser(token: KeycloakToken): Promise<any> {
    const keycloakId = token.sub;
    const email = token.email || `${token.preferred_username}@engie.com`;
    const username = token.preferred_username || email.split('@')[0];
    const name = token.name || `${token.given_name || ''} ${token.family_name || ''}`.trim() || username;
    const role = this.mapKeycloakRoles(token);
    
    // Vérifier si l'utilisateur existe
    let user = await storage.getUserByUsername(username);
    
    if (user) {
      // Mettre à jour l'utilisateur existant
      user = await storage.updateUser(user.id, {
        email,
        name,
        role,
        keycloakId
      });
      console.log(`✅ Utilisateur mis à jour: ${username} (${role})`);
    } else {
      // Créer un nouvel utilisateur
      user = await storage.createUser({
        username,
        email,
        name,
        role,
        keycloakId,
        // Pas de mot de passe car authentification via Keycloak
        password: 'KEYCLOAK_AUTH'
      });
      console.log(`✅ Nouvel utilisateur créé: ${username} (${role})`);
    }
    
    return user;
  }
  
  /**
   * @method getLogoutUrl
   * @description Génère l'URL de déconnexion Keycloak
   * 
   * @param {string} idToken - ID Token pour le logout
   * @returns {string} URL de déconnexion
   */
  getLogoutUrl(idToken?: string): string {
    const params = new URLSearchParams({
      post_logout_redirect_uri: this.config.postLogoutRedirectUri,
      client_id: this.config.clientId
    });
    
    if (idToken) {
      params.append('id_token_hint', idToken);
    }
    
    return `${this.config.authServerUrl}/realms/${this.config.realm}/protocol/openid-connect/logout?${params}`;
  }
  
  /**
   * @method verifyTokenMiddleware
   * @description Middleware Express pour vérifier les tokens
   */
  verifyTokenMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Récupérer le token depuis l'header Authorization ou la session
      const authHeader = req.headers.authorization;
      const sessionToken = (req.session as any)?.accessToken;
      
      let token = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (sessionToken) {
        token = sessionToken;
      }
      
      if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
      }
      
      // Valider le token
      const decodedToken = await this.validateToken(token);
      
      // Vérifier l'expiration
      if (decodedToken.exp < Date.now() / 1000) {
        // Tenter de rafraîchir le token
        const refreshToken = (req.session as any)?.refreshToken;
        if (refreshToken) {
          try {
            const newTokens = await this.refreshToken(refreshToken);
            (req.session as any).accessToken = newTokens.access_token;
            (req.session as any).refreshToken = newTokens.refresh_token;
            (req.session as any).idToken = newTokens.id_token;
            
            // Revalider avec le nouveau token
            const newDecodedToken = await this.validateToken(newTokens.access_token!);
            req.keycloakToken = newDecodedToken;
          } catch (refreshError) {
            console.error('Échec du refresh token:', refreshError);
            return res.status(401).json({ error: 'Session expirée' });
          }
        } else {
          return res.status(401).json({ error: 'Token expiré' });
        }
      } else {
        req.keycloakToken = decodedToken;
      }
      
      // Récupérer/créer l'utilisateur
      const user = await this.createOrUpdateUser(req.keycloakToken);
      req.user = user;
      
      next();
    } catch (error) {
      console.error('Erreur validation token:', error);
      res.status(401).json({ error: 'Token invalide' });
    }
  };
  
  /**
   * @method requireRole
   * @description Middleware pour vérifier les rôles
   * 
   * @param {string[]} roles - Rôles autorisés
   */
  requireRole = (...roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Vérifier d'abord le token
      await this.verifyTokenMiddleware(req, res, () => {
        const userRole = (req.user as any)?.role;
        
        if (!roles.includes(userRole)) {
          return res.status(403).json({ 
            error: 'Accès refusé',
            message: `Rôle requis: ${roles.join(' ou ')}`,
            userRole
          });
        }
        
        next();
      });
    };
  };
}

// Étendre les types Express
declare global {
  namespace Express {
    interface Request {
      keycloakToken?: KeycloakToken;
    }
    
    interface SessionData {
      oauth2State?: string;
      oauth2Nonce?: string;
      accessToken?: string;
      refreshToken?: string;
      idToken?: string;
    }
  }
}

export const keycloakAuth = KeycloakAuthService.getInstance();