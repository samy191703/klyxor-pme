/**
 * @module usePermissions
 * @description Hook React pour la gestion des permissions RBAC (Role-Based Access Control)
 * 
 * @overview
 * Ce hook centralise toute la logique de permissions de l'application KLYXOR.
 * Il implémente un système RBAC complet avec contrôle granulaire par rôle.
 * 
 * @roles
 * - **admin**: Accès total, gestion système et sécurité
 * - **manager**: Gestion des contrats, validation, export
 * - **validator**: Validation des demandes uniquement
 * - **business_unit_manager**: Gestion des contrats de sa BU
 * - **contract_manager**: Gestion complète des contrats
 * - **finance_manager**: Gestion financière et indexation
 * 
 * @usage
 * ```tsx
 * const { canValidate, canCreateContract, userRole } = usePermissions();
 * 
 * if (canValidate()) {
 *   // Afficher le bouton de validation
 * }
 * ```
 */

import { useAuth } from "./useAuth";

/**
 * Type définissant tous les rôles possibles dans le système
 */
export type UserRole = 'admin' | 'manager' | 'validator' | 'business_unit_manager' | 'contract_manager' | 'finance_manager';

/**
 * Structure définissant les permissions d'une route
 */
interface RoutePermission {
  /** Rôles autorisés à accéder à cette route */
  allowedRoles: UserRole[];
}

/**
 * Matrice des permissions par route
 * Définit quel rôle peut accéder à quelle page de l'application
 */
const routePermissions: Record<string, RoutePermission> = {
  // Admin routes - only accessible by admin
  '/admin': { allowedRoles: ['admin'] },
  '/admin/contracts': { allowedRoles: ['admin'] },
  '/admin/billing': { allowedRoles: ['admin'] },
  '/admin/indexations': { allowedRoles: ['admin'] },
  '/admin/amendments': { allowedRoles: ['admin'] },
  '/admin/deadlines': { allowedRoles: ['admin'] },
  '/admin/documents': { allowedRoles: ['admin'] },
  '/admin/alerts': { allowedRoles: ['admin'] },
  '/admin/extraction': { allowedRoles: ['admin'] },
  '/admin/imports': { allowedRoles: ['admin'] },
  '/admin/security': { allowedRoles: ['admin'] },
  '/admin/audit': { allowedRoles: ['admin'] },
  
  // Security & Compliance - admin only
  '/security': { allowedRoles: ['admin'] },
  '/permissions-test': { allowedRoles: ['admin'] },
  '/permissions-demo': { allowedRoles: ['admin'] },
  
  // Contract management - managers and admin
  '/contracts': { allowedRoles: ['admin', 'manager', 'contract_manager', 'business_unit_manager'] },
  '/amendments': { allowedRoles: ['admin', 'manager', 'contract_manager'] },
  '/terminations': { allowedRoles: ['admin', 'manager', 'contract_manager'] },
  
  // Validation - validators and above
  '/validation': { allowedRoles: ['admin', 'manager', 'validator'] },
  '/workflows': { allowedRoles: ['admin', 'manager'] },
  
  // Billing - finance and admin
  '/billing-plans': { allowedRoles: ['admin', 'finance_manager', 'manager'] },
  '/payment-flows': { allowedRoles: ['admin', 'finance_manager'] },
  '/payment-blocks': { allowedRoles: ['admin', 'finance_manager'] },
  '/payment-proofs': { allowedRoles: ['admin', 'finance_manager'] },
  
  // Indexation - managers and admin
  '/indexations': { allowedRoles: ['admin', 'manager', 'finance_manager'] },
  '/indexation-dashboard': { allowedRoles: ['admin', 'manager', 'finance_manager'] },
  '/indexation-config': { allowedRoles: ['admin', 'manager'] },
  
  // Documents & Data - managers and admin
  '/documents': { allowedRoles: ['admin', 'manager', 'contract_manager'] },
  '/imports': { allowedRoles: ['admin', 'manager'] },
  '/data-export': { allowedRoles: ['admin', 'manager'] },
  '/import-export': { allowedRoles: ['admin', 'manager'] },
  
  // Deadlines - all authenticated users
  '/deadlines': { allowedRoles: ['admin', 'manager', 'validator', 'business_unit_manager', 'contract_manager', 'finance_manager'] },
  
  // Dashboard - all authenticated users
  '/': { allowedRoles: ['admin', 'manager', 'validator', 'business_unit_manager', 'contract_manager', 'finance_manager'] },
};

/**
 * Hook principal pour la gestion des permissions
 * 
 * @returns {Object} Objet contenant:
 *   - hasPermission: Vérifie l'accès à une route
 *   - canCreateContract: Droit de créer des contrats
 *   - canValidate: Droit de valider des demandes
 *   - canManageUsers: Droit de gérer les utilisateurs
 *   - canExportData: Droit d'exporter les données
 *   - canManageBilling: Droit de gérer la facturation
 *   - canDeleteContract: Droit de supprimer des contrats
 *   - canModifyContract: Droit de modifier des contrats
 *   - canViewSecurity: Droit d'accéder à la sécurité
 *   - canManageIndexation: Droit de gérer l'indexation
 *   - canViewIndexation: Droit de voir l'indexation
 *   - canValidateIndexation: Droit de valider l'indexation
 *   - canConfigureIndexation: Droit de configurer l'indexation
 *   - userRole: Rôle de l'utilisateur connecté
 */
export function usePermissions() {
  const { user } = useAuth();
  
  /**
   * Vérifie si l'utilisateur a accès à une route spécifique
   * @param {string} route - Chemin de la route à vérifier
   * @returns {boolean} True si l'utilisateur a accès
   */
  const hasPermission = (route: string): boolean => {
    if (!user) return false;
    
    const permission = routePermissions[route];
    if (!permission) return true; // No specific permission required
    
    return permission.allowedRoles.includes(user.role as UserRole);
  };
  
  /**
   * Vérifie si l'utilisateur peut créer des contrats
   * @note Réservé aux managers et contract_managers
   */
  const canCreateContract = (): boolean => {
    if (!user) return false;
    return ['manager', 'contract_manager'].includes(user.role);
  };
  
  /**
   * Vérifie si l'utilisateur peut valider des demandes
   * @important Les admins ne valident PAS - rôle de supervision uniquement
   * @note Réservé aux managers et validators
   */
  const canValidate = (): boolean => {
    if (!user) return false;
    // Admins ne valident PAS - seuls les validators et managers peuvent valider
    return ['manager', 'validator'].includes(user.role);
  };
  
  /**
   * Vérifie si l'utilisateur peut gérer les comptes utilisateurs
   * @note Réservé exclusivement aux administrateurs
   */
  const canManageUsers = (): boolean => {
    if (!user) return false;
    return user.role === 'admin';
  };
  
  /**
   * Vérifie si l'utilisateur peut exporter des données
   * @note Réservé aux admins et managers
   */
  const canExportData = (): boolean => {
    if (!user) return false;
    return ['admin', 'manager'].includes(user.role);
  };
  
  const canManageBilling = (): boolean => {
    if (!user) return false;
    return ['admin', 'finance_manager', 'manager'].includes(user.role);
  };
  
  const canDeleteContract = (): boolean => {
    if (!user) return false;
    return user.role === 'admin';
  };
  
  const canModifyContract = (): boolean => {
    if (!user) return false;
    return ['manager', 'contract_manager'].includes(user.role);
  };
  
  const canViewSecurity = (): boolean => {
    if (!user) return false;
    return user.role === 'admin';
  };
  
  /**
   * Vérifie si l'utilisateur peut gérer les indexations
   * @note Création et configuration réservées aux admins et managers
   */
  const canManageIndexation = (): boolean => {
    if (!user) return false;
    return ['admin', 'manager'].includes(user.role);
  };
  
  const canViewIndexation = (): boolean => {
    if (!user) return false;
    return ['admin', 'manager', 'finance_manager'].includes(user.role);
  };
  
  const canValidateIndexation = (): boolean => {
    if (!user) return false;
    return ['admin', 'manager', 'finance_manager'].includes(user.role);
  };
  
  const canConfigureIndexation = (): boolean => {
    if (!user) return false;
    return ['admin', 'manager'].includes(user.role);
  };
  
  return {
    hasPermission,
    canCreateContract,
    canValidate,
    canManageUsers,
    canExportData,
    canManageBilling,
    canViewSecurity,
    canDeleteContract,
    canModifyContract,
    canManageIndexation,
    canViewIndexation,
    canValidateIndexation,
    canConfigureIndexation,
    userRole: user?.role as UserRole | undefined,
  };
}