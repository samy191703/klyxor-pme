/**
 * Système de permissions RBAC (Role-Based Access Control) pour KLYXOR
 *
 * Ce module définit la matrice complète des permissions pour chaque rôle.
 * Utilisé à la fois côté serveur (protection API) et côté client (UI).
 *
 * @module permissions
 * @since 2025-01-02
 */

import { clients } from "@shared/schema";

export interface Permission {
  action: string;
  resource: string;
}

// Définition des permissions par rôle
export const rolePermissions = {
  admin: {
    // Admin gère le système mais ne valide pas les contrats
    contracts: ["create", "read", "update", "delete", "export"], // PAS de validate
    clients: ["create", "read", "update", "delete", "export"], // PAS de validate
    indexations: ["create", "read", "update", "delete", "export", "execute"], // PAS de validate
    amendments: ["create", "read", "update", "delete"], // PAS de validate
    invoices: ["create", "read", "update", "delete"],
    billing: ["create", "read", "update", "delete", "approve"],
    users: ["create", "read", "update", "delete", "manage_roles"],
    security: ["read", "manage", "audit"],
    documents: ["create", "read", "update", "delete"],
    deadlines: ["create", "read", "update", "delete", "manage_alerts"],
    imports: ["execute", "read", "manage"],
    exports: ["execute", "read", "manage"],
    system: ["configure", "backup", "restore"],
    admin_panel: ["access", "manage"],
    validations: ["read", "manage"],
    audit_logs: ["read", "manage", "export"],
    reports: ["create", "read", "update", "delete", "export"],
  },
  contract_manager: {
    // Gestionnaire de contrat a des droits limités
    contracts: ["create", "read", "update", "export"], // Pas de delete ou validate
    terminations: ["create", "read", "update", "export"], // Pas de delete ou validate
    indexations: ["create", "read", "update"], // Pas de validation finale
    amendments: ["create", "read", "update"], // Pas de validation finale
    billing: ["read"], // Lecture seule pour la facturation
    users: [], // Pas d'accès à la gestion des utilisateurs
    security: [], // Pas d'accès aux fonctions de sécurité
    documents: ["create", "read", "update"], // Peut gérer les documents
    deadlines: ["read", "update"], // Peut voir et mettre à jour les échéances
    imports: ["execute", "read"], // Peut importer des données
    exports: ["execute", "read"], // Peut exporter des données
    system: [], // Pas d'accès aux paramètres système
    admin_panel: [], // Pas d'accès au panneau admin
    validations: ["read"],
    audit_logs: [],
    reports: ["read"],
  },
  manager: {
    // Manager peut créer/modifier ET valider
    contracts: ["create", "read", "update", "validate", "export"], // Avec validation
    indexations: ["create", "read", "update", "validate", "export"], // Avec validation
    amendments: ["create", "read", "update", "validate"], // Avec validation
    billing: ["create", "read", "update"],
    users: ["read"], // Lecture seule des utilisateurs
    security: [],
    documents: ["create", "read", "update", "delete"],
    deadlines: ["create", "read", "update"],
    imports: ["execute", "read"],
    exports: ["execute", "read"],
    system: [],
    admin_panel: [],
    validations: ["read", "create", "manage"],
    audit_logs: ["read"],
    reports: ["create", "read", "export"],
  },
  validator: {
    // Valideur peut valider mais pas créer/modifier
    contracts: ["read", "validate"], // PAS de 'create'
    indexations: ["read", "validate"],
    amendments: ["read", "validate"],
    billing: ["read", "approve"],
    users: [],
    security: [],
    documents: ["read"],
    deadlines: ["read"],
    imports: [],
    exports: ["read"], // Limité à la lecture
    system: [],
    admin_panel: [],
    validations: ["read", "create", "manage"],
    audit_logs: ["read"],
    reports: ["read"],
  },
  finance_manager: {
    // Gestionnaire financier se concentre sur la facturation
    contracts: ["read"],
    indexations: ["read", "update", "execute"],
    amendments: ["read"],
    billing: ["create", "read", "update", "approve"],
    users: [],
    security: [],
    documents: ["read", "update"],
    deadlines: ["read"],
    imports: ["execute", "read"],
    exports: ["execute", "read"],
    system: [],
    admin_panel: [],
    validations: ["read"],
    audit_logs: ["read"],
    reports: ["read", "create"],
  },
  business_unit_manager: {
    // Responsable BU peut voir son périmètre
    contracts: ["read", "create", "update"], // Peut gérer les contrats de sa BU
    indexations: ["read"],
    amendments: ["read", "create"],
    billing: ["read"],
    users: [],
    security: [],
    documents: ["read"],
    deadlines: ["read"],
    imports: [],
    exports: ["execute", "read"],
    system: [],
    admin_panel: [],
    validations: ["read"],
    audit_logs: ["read"],
    reports: ["read"],
  },
  user: {
    // Utilisateur de base - lecture seule
    contracts: ["read"],
    indexations: ["read"],
    amendments: ["read"],
    billing: [],
    users: [],
    security: [],
    documents: ["read"],
    deadlines: ["read"],
    imports: [],
    exports: [],
    system: [],
    admin_panel: [],
    validations: [],
    audit_logs: [],
    reports: [],
  },
};

// Fonction pour vérifier si un rôle a une permission
export function hasPermission(
  role: string,
  resource: string,
  action: string
): boolean {
  const permissions = rolePermissions[role as keyof typeof rolePermissions];
  if (!permissions) return false;

  const resourcePermissions = permissions[resource as keyof typeof permissions];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action as never);
}

// Fonction pour obtenir toutes les permissions d'un rôle
export function getRolePermissions(role: string) {
  return rolePermissions[role as keyof typeof rolePermissions] || {};
}

// Fonction pour vérifier si un utilisateur peut accéder à une ressource
export function canAccess(userRole: string, resource: string): boolean {
  const permissions = rolePermissions[userRole as keyof typeof rolePermissions];
  if (!permissions) return false;

  const resourcePermissions = permissions[resource as keyof typeof permissions];
  return resourcePermissions && resourcePermissions.length > 0;
}

// Messages d'erreur personnalisés par permission
export const permissionErrors = {
  contracts: {
    create: "Vous n'avez pas le droit de créer des contrats",
    update: "Vous n'avez pas le droit de modifier des contrats",
    delete: "Vous n'avez pas le droit de supprimer des contrats",
    validate: "Vous n'avez pas le droit de valider des contrats",
  },
  terminations: {
    create: "Vous n'avez pas le droit de créer des résiliations",
    update: "Vous n'avez pas le droit de modifier des résiliations",
    delete: "Vous n'avez pas le droit de supprimer des résiliations",
    validate: "Vous n'avez pas le droit de valider des résiliations",
  },
  indexations: {
    create: "Vous n'avez pas le droit de créer des indexations",
    update: "Vous n'avez pas le droit de modifier des indexations",
    validate: "Vous n'avez pas le droit de valider des indexations",
  },
  users: {
    manage_roles:
      "Vous n'avez pas le droit de gérer les rôles des utilisateurs",
    create: "Vous n'avez pas le droit de créer des utilisateurs",
    delete: "Vous n'avez pas le droit de supprimer des utilisateurs",
  },
  admin_panel: {
    access: "Accès refusé au panneau d'administration",
  },
};
