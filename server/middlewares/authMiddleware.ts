/**
 * Middleware d'authentification et d'autorisation pour KLYXOR
 * 
 * Fournit des middlewares Express pour :
 * - Vérifier l'authentification des utilisateurs
 * - Contrôler les permissions par rôle (RBAC)
 * - Protéger les endpoints sensibles
 * 
 * @module authMiddleware
 * @since 2025-01-02
 */

import { Request, Response, NextFunction } from "express";
import { hasPermission } from "../permissions";

/**
 * Vérifie que l'utilisateur est authentifié
 * @returns 401 si non authentifié
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  next();
}

/**
 * Crée un middleware qui vérifie une permission spécifique
 * @param resource - Ressource à protéger (contracts, users, etc.)
 * @param action - Action requise (create, read, update, delete, etc.)
 * @returns Middleware Express qui vérifie la permission
 */
export function requirePermission(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const user = req.user as any;
    const userRole = user?.role || 'user';

    if (!hasPermission(userRole, resource, action)) {
      return res.status(403).json({ 
        error: "Accès refusé",
        message: `Vous n'avez pas la permission '${action}' sur '${resource}'`,
        role: userRole
      });
    }

    next();
  };
}

// Middleware pour vérifier si l'utilisateur est admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const user = req.user as any;
  if (user?.role !== 'admin') {
    return res.status(403).json({ 
      error: "Accès refusé",
      message: "Cette fonctionnalité nécessite les droits administrateur"
    });
  }

  next();
}

// Middleware pour vérifier si l'utilisateur peut valider
export function requireValidator(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const user = req.user as any;
  const userRole = user?.role || 'user';

  if (!hasPermission(userRole, 'contracts', 'validate')) {
    return res.status(403).json({ 
      error: "Accès refusé",
      message: "Vous n'avez pas les droits de validation"
    });
  }

  next();
}

// Middleware pour vérifier si l'utilisateur peut gérer les contrats
export function requireContractManager(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const user = req.user as any;
  const userRole = user?.role || 'user';

  if (!hasPermission(userRole, 'contracts', 'create')) {
    return res.status(403).json({ 
      error: "Accès refusé",
      message: "Vous n'avez pas les droits de gestion des contrats"
    });
  }

  next();
}

// Middleware pour vérifier si l'utilisateur peut gérer la facturation
export function requireFinanceManager(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const user = req.user as any;
  const userRole = user?.role || 'user';

  if (!hasPermission(userRole, 'billing', 'approve')) {
    return res.status(403).json({ 
      error: "Accès refusé",
      message: "Vous n'avez pas les droits de gestion financière"
    });
  }

  next();
}