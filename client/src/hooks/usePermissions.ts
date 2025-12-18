// client/src/hooks/usePermissions.ts

/**
 * RBAC (Role-Based Access Control) – Klyxor V1
 *
 * Rôles V1 :
 *  - admin
 *  - manager  (Gestionnaire)
 *  - validator (Valideur)
 *  - guest
 *
 * Source du rôle :
 *  - PROD : /api/me
 *  - DEV  : override via localStorage("klyxorDevRoleOverride")
 *
 * IMPORTANT (stabilité):
 * - Le hook retourne des BOOLÉENS (pas de fonctions) pour éviter les incohérences
 *   canXxx vs canXxx().
 * - hasPermission supporte 2 formats :
 *    1) PermissionKey (ex: "canViewClients")
 *    2) Route (ex: "/billing-plans") => via ROUTE_RULES
 */

import { useEffect, useMemo, useState } from "react";

export type UserRole = "admin" | "manager" | "validator" | "guest";

/** -----------------------------
 * Permission flags
 * ----------------------------- */

type PermissionFlags = {
  // Dashboard
  canViewDashboard: boolean;

  // Base clients
  canViewClients: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;

  // Contrats
  canViewContracts: boolean;
  canCreateContract: boolean;
  canEditContract: boolean;
  canRequestTerminateContract: boolean;
  canValidateTerminateContract: boolean;
  canDeleteContract: boolean;

  // Avenants
  canViewAmendments: boolean;
  canCreateAmendment: boolean;
  canEditAmendment: boolean;
  canSubmitAmendment: boolean;
  canValidateAmendment: boolean;
  canDeleteAmendment: boolean;

  // Indexation
  canViewIndexes: boolean;
  canSimulateIndexation: boolean;
  canProposeIndexation: boolean;
  canValidateIndexation: boolean;
  canForceIndexation: boolean;

  // Facturation
  canViewBilling: boolean;
  canGenerateInvoices: boolean;
  canRequestCancelInvoice: boolean;
  canValidateCancelInvoice: boolean;
  canExportInvoices: boolean;

  // Échéances
  canViewDeadlines: boolean;
  canMarkDeadline: boolean;

  // Documents / GED
  canViewDocuments: boolean;
  canAddDocuments: boolean;
  canDeleteDocuments: boolean;

  // Administration
  canManageUsers: boolean;
  canManageSettings: boolean;
};

export type PermissionKey = keyof PermissionFlags;

const EMPTY_FLAGS: PermissionFlags = {
  canViewDashboard: false,

  canViewClients: false,
  canEditClients: false,
  canDeleteClients: false,

  canViewContracts: false,
  canCreateContract: false,
  canEditContract: false,
  canRequestTerminateContract: false,
  canValidateTerminateContract: false,
  canDeleteContract: false,

  canViewAmendments: false,
  canCreateAmendment: false,
  canEditAmendment: false,
  canSubmitAmendment: false,
  canValidateAmendment: false,
  canDeleteAmendment: false,

  canViewIndexes: false,
  canSimulateIndexation: false,
  canProposeIndexation: false,
  canValidateIndexation: false,
  canForceIndexation: false,

  canViewBilling: false,
  canGenerateInvoices: false,
  canRequestCancelInvoice: false,
  canValidateCancelInvoice: false,
  canExportInvoices: false,

  canViewDeadlines: false,
  canMarkDeadline: false,

  canViewDocuments: false,
  canAddDocuments: false,
  canDeleteDocuments: false,

  canManageUsers: false,
  canManageSettings: false,
};

const PERMISSIONS_BY_ROLE: Record<UserRole, PermissionFlags> = {
  admin: {
    canViewDashboard: true,

    canViewClients: true,
    canEditClients: true,
    canDeleteClients: true,

    canViewContracts: true,
    canCreateContract: true,
    canEditContract: true,
    canRequestTerminateContract: true,
    canValidateTerminateContract: true,
    canDeleteContract: true,

    canViewAmendments: true,
    canCreateAmendment: true,
    canEditAmendment: true,
    canSubmitAmendment: true,
    canValidateAmendment: true,
    canDeleteAmendment: true,

    canViewIndexes: true,
    canSimulateIndexation: true,
    canProposeIndexation: true,
    canValidateIndexation: true,
    canForceIndexation: true,

    canViewBilling: true,
    canGenerateInvoices: true,
    canRequestCancelInvoice: true,
    canValidateCancelInvoice: true,
    canExportInvoices: true,

    canViewDeadlines: true,
    canMarkDeadline: true,

    canViewDocuments: true,
    canAddDocuments: true,
    canDeleteDocuments: true,

    canManageUsers: true,
    canManageSettings: true,
  },

  manager: {
    canViewDashboard: true,

    canViewClients: true,
    canEditClients: true,
    canDeleteClients: false,

    canViewContracts: true,
    canCreateContract: true,
    canEditContract: true,
    canRequestTerminateContract: true,
    canValidateTerminateContract: false,
    canDeleteContract: false,

    canViewAmendments: true,
    canCreateAmendment: true,
    canEditAmendment: true,
    canSubmitAmendment: true,
    canValidateAmendment: false,
    canDeleteAmendment: false,

    canViewIndexes: true,
    canSimulateIndexation: true,
    canProposeIndexation: true,
    canValidateIndexation: false,
    canForceIndexation: false,

    canViewBilling: true,
    canGenerateInvoices: true,
    canRequestCancelInvoice: true,
    canValidateCancelInvoice: false,
    canExportInvoices: true,

    canViewDeadlines: true,
    canMarkDeadline: true,

    canViewDocuments: true,
    canAddDocuments: true,
    canDeleteDocuments: true,

    canManageUsers: false,
    canManageSettings: false,
  },

  validator: {
    canViewDashboard: true,

    canViewClients: true,
    canEditClients: false,
    canDeleteClients: false,

    canViewContracts: true,
    canCreateContract: false,
    canEditContract: false,
    canRequestTerminateContract: false,
    canValidateTerminateContract: true,
    canDeleteContract: false,

    canViewAmendments: true,
    canCreateAmendment: false,
    canEditAmendment: false,
    canSubmitAmendment: false,
    canValidateAmendment: true,
    canDeleteAmendment: false,

    canViewIndexes: true,
    canSimulateIndexation: true,
    canProposeIndexation: false,
    canValidateIndexation: true,
    canForceIndexation: false,

    canViewBilling: true,
    canGenerateInvoices: true,
    canRequestCancelInvoice: false,
    canValidateCancelInvoice: true,
    canExportInvoices: true,

    canViewDeadlines: true,
    canMarkDeadline: true,

    canViewDocuments: true,
    canAddDocuments: false,
    canDeleteDocuments: false,

    canManageUsers: false,
    canManageSettings: false,
  },

  guest: {
    ...EMPTY_FLAGS,
  },
};

/** -----------------------------
 * Routes → permission keys (V1)
 * ----------------------------- */

type RouteRule = { match: RegExp; require: PermissionKey };

/**
 * IMPORTANT :
 * - Toujours inclure "/dashboard" ET "/" si tu fais des redirects.
 * - Toute route non mappée => refus (comportement sécurisé).
 */
const ROUTE_RULES: RouteRule[] = [
  // Dashboard
  { match: /^\/$/, require: "canViewDashboard" },
  { match: /^\/dashboard$/, require: "canViewDashboard" },

  // Clients
  { match: /^\/clients(\/.*)?$/, require: "canViewClients" },

  // Contrats
  { match: /^\/contracts$/, require: "canViewContracts" },
  { match: /^\/contracts\/new$/, require: "canCreateContract" },
  { match: /^\/contracts\/[^/]+$/, require: "canViewContracts" },

  // Avenants
  { match: /^\/amendments(\/.*)?$/, require: "canViewAmendments" },

  // Résiliations
  { match: /^\/terminations(\/.*)?$/, require: "canViewContracts" },

  // Indexation
  { match: /^\/indexations(\/.*)?$/, require: "canViewIndexes" },
  { match: /^\/indexation-config$/, require: "canViewIndexes" },
  { match: /^\/indexation-dashboard$/, require: "canViewIndexes" },

  // Facturation
  { match: /^\/billing-plans$/, require: "canViewBilling" },
  { match: /^\/billing-schedules$/, require: "canViewBilling" },
  { match: /^\/invoices$/, require: "canViewBilling" },

  // Échéances
  { match: /^\/deadlines$/, require: "canViewDeadlines" },

  // Documents / GED
  { match: /^\/documents(\/.*)?$/, require: "canViewDocuments" },
  { match: /^\/imports$/, require: "canViewDocuments" },
  { match: /^\/import-export$/, require: "canViewDocuments" },
  { match: /^\/data-export$/, require: "canViewDocuments" },

  // Validation / Workflows / Sécurité (à adapter)
  { match: /^\/validation$/, require: "canViewBilling" },
  { match: /^\/workflows$/, require: "canManageSettings" },
  { match: /^\/security$/, require: "canManageSettings" },

  // Admin
  { match: /^\/admin(\/.*)?$/, require: "canManageUsers" },
];

function normalizePath(input: string): string {
  return (input || "").split("?")[0].split("#")[0] || "/";
}

function resolveRequiredPermission(path: string): PermissionKey | null {
  const p = normalizePath(path);
  for (const rule of ROUTE_RULES) {
    if (rule.match.test(p)) return rule.require;
  }
  return null;
}

/** -----------------------------
 * Role resolution (/api/me + override DEV)
 * ----------------------------- */

function coerceRole(raw: unknown): UserRole {
  const v = typeof raw === "string" ? raw : "";
  if (v === "admin") return "admin";
  if (v === "validator") return "validator";
  if (v === "manager" || v === "contract_manager") return "manager";
  return "guest";
}

function getDevOverrideRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  try {
    const override = window.localStorage.getItem("klyxorDevRoleOverride");
    if (override === "admin" || override === "manager" || override === "validator") return override;
    return null;
  } catch {
    return null;
  }
}

/** ---------------------------------------------------------------------------
 * Hook principal
 * --------------------------------------------------------------------------- */

export function usePermissions() {
  const [userRole, setUserRole] = useState<UserRole>("guest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/me", { credentials: "include" });

        if (!res.ok) {
          if (!cancelled) setUserRole("guest");
          return;
        }

        const data = await res.json();

        const backendRole =
          data?.role ?? data?.userRole ?? data?.user?.role ?? data?.user?.userRole;

        let role = coerceRole(backendRole);

        const override = getDevOverrideRole();
        if (override) role = override;

        if (!cancelled) setUserRole(role);
      } catch (err) {
        console.error("usePermissions /api/me error:", err);
        if (!cancelled) {
          setError(err);
          setUserRole("guest");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRole();
    return () => {
      cancelled = true;
    };
  }, []);

  const flags = useMemo<PermissionFlags>(() => {
    return PERMISSIONS_BY_ROLE[userRole] ?? EMPTY_FLAGS;
  }, [userRole]);

  /**
   * hasPermission accepte :
   * - PermissionKey directe (ex: "canViewClients")
   * - Route (ex: "/billing-plans") : mappée vers une PermissionKey
   */
  const hasPermission = (key?: PermissionKey | string | null): boolean => {
    if (!key) return true;

    // Route -> PermissionKey
    if (typeof key === "string" && key.startsWith("/")) {
      const required = resolveRequiredPermission(key);
      if (!required) return false; // sécurité : route inconnue => refus
      return Boolean(flags[required]);
    }

    // PermissionKey directe
    const k = key as PermissionKey;
    if (k in flags) return Boolean(flags[k]);
    return false;
  };

  // Alias pratiques (compat)
  const canModifyContract = flags.canEditContract;
  const canModifyAmendment = flags.canEditAmendment;

  // Agrégat “peut valider quelque chose”
  const canValidate =
    flags.canValidateTerminateContract ||
    flags.canValidateAmendment ||
    flags.canValidateIndexation ||
    flags.canValidateCancelInvoice;

  /**
   * Compatibilité pages existantes :
   * Certaines pages attendent des permissions de style "canViewIndexationDashboard".
   * On expose des alias booléens explicites pour éviter canXxx() vs canXxx.
   */
  const canViewIndexation = flags.canViewIndexes;
  const canManageIndexation = flags.canProposeIndexation || flags.canForceIndexation;
  const canConfigureIndexation = flags.canForceIndexation || flags.canManageSettings;

  return {
    // state
    loading,
    error,
    userRole,

    // role helpers
    isAdmin: userRole === "admin",
    isManager: userRole === "manager",
    isValidator: userRole === "validator",

    // permission flags (booléens)
    ...flags,

    // aggregated/aliases (booléens)
    canValidate,
    canModifyContract,
    canModifyAmendment,

    // indexation aliases (booléens)
    canViewIndexation,
    canManageIndexation,
    canConfigureIndexation,

    // resolver
    hasPermission,
  };
}
