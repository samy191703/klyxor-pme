// client/src/hooks/usePermissions.ts

/**
 * @module usePermissions
 * @description Hook React pour la gestion des permissions RBAC (Role-Based Access Control)
 *
 * Rôles V1 :
 *  - admin
 *  - manager  (≙ Gestionnaire)
 *  - validator (≙ Valideur)
 *
 * En prod, le rôle est récupéré via /api/me.
 * En DEV, on peut surcharger avec localStorage("klyxorDevRoleOverride").
 */

import { useEffect, useState } from "react";

export type UserRole = "admin" | "manager" | "validator" | "guest";

type PermissionFlags = {
  // --- Base clients ---
  canViewClients: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;

  // --- Contrats ---
  canViewContracts: boolean;
  canCreateContract: boolean;
  canEditContract: boolean;
  canRequestTerminateContract: boolean;
  canValidateTerminateContract: boolean;
  canDeleteContract: boolean;

  // --- Avenants ---
  canViewAmendments: boolean;
  canCreateAmendment: boolean;
  canEditAmendment: boolean;
  canSubmitAmendment: boolean;
  canValidateAmendment: boolean;
  canDeleteAmendment: boolean;

  // --- Indexation ---
  canViewIndexes: boolean;
  canSimulateIndexation: boolean;
  canProposeIndexation: boolean;
  canValidateIndexation: boolean;
  canForceIndexation: boolean;

  // --- Facturation ---
  canViewBilling: boolean;
  canGenerateInvoices: boolean;
  canRequestCancelInvoice: boolean;
  canValidateCancelInvoice: boolean;
  canExportInvoices: boolean;

  // --- Échéances ---
  canViewDeadlines: boolean;
  canMarkDeadline: boolean;

  // --- Documents / GED ---
  canViewDocuments: boolean;
  canAddDocuments: boolean;
  canDeleteDocuments: boolean;

  // --- Administration ---
  canManageUsers: boolean;
  canManageSettings: boolean;
};

export type PermissionKey = keyof PermissionFlags;

const EMPTY_FLAGS: PermissionFlags = {
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
    // Base clients
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: true,

    // Contrats
    canViewContracts: true,
    canCreateContract: true,
    canEditContract: true,
    canRequestTerminateContract: true,
    canValidateTerminateContract: true,
    canDeleteContract: true,

    // Avenants
    canViewAmendments: true,
    canCreateAmendment: true,
    canEditAmendment: true,
    canSubmitAmendment: true,
    canValidateAmendment: true,
    canDeleteAmendment: true,

    // Indexation
    canViewIndexes: true,
    canSimulateIndexation: true,
    canProposeIndexation: true,
    canValidateIndexation: true,
    canForceIndexation: true,

    // Facturation
    canViewBilling: true,
    canGenerateInvoices: true,
    canRequestCancelInvoice: true,
    canValidateCancelInvoice: true,
    canExportInvoices: true,

    // Échéances
    canViewDeadlines: true,
    canMarkDeadline: true,

    // Documents & GED
    canViewDocuments: true,
    canAddDocuments: true,
    canDeleteDocuments: true,

    // Administration
    canManageUsers: true,
    canManageSettings: true,
  },

  manager: {
    // Base clients
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: false,

    // Contrats
    canViewContracts: true,
    canCreateContract: true,
    canEditContract: true,
    canRequestTerminateContract: true,
    canValidateTerminateContract: false,
    canDeleteContract: false,

    // Avenants
    canViewAmendments: true,
    canCreateAmendment: true,
    canEditAmendment: true,
    canSubmitAmendment: true,
    canValidateAmendment: false,
    canDeleteAmendment: false,

    // Indexation
    canViewIndexes: true,
    canSimulateIndexation: true,
    canProposeIndexation: true,
    canValidateIndexation: false,
    canForceIndexation: false,

    // Facturation
    canViewBilling: true,
    canGenerateInvoices: true,
    canRequestCancelInvoice: true,
    canValidateCancelInvoice: false,
    canExportInvoices: true,

    // Échéances
    canViewDeadlines: true,
    canMarkDeadline: true,

    // Documents & GED
    canViewDocuments: true,
    canAddDocuments: true,
    canDeleteDocuments: true, // à restreindre côté API si besoin

    // Administration
    canManageUsers: false,
    canManageSettings: false,
  },

  validator: {
    // Base clients
    canViewClients: true,
    canEditClients: false,
    canDeleteClients: false,

    // Contrats
    canViewContracts: true,
    canCreateContract: false,
    canEditContract: false,
    canRequestTerminateContract: false,
    canValidateTerminateContract: true,
    canDeleteContract: false,

    // Avenants
    canViewAmendments: true,
    canCreateAmendment: false,
    canEditAmendment: false,
    canSubmitAmendment: false,
    canValidateAmendment: true,
    canDeleteAmendment: false,

    // Indexation
    canViewIndexes: true,
    canSimulateIndexation: true,
    canProposeIndexation: false,
    canValidateIndexation: true,
    canForceIndexation: false,

    // Facturation
    canViewBilling: true,
    canGenerateInvoices: true,
    canRequestCancelInvoice: false,
    canValidateCancelInvoice: true,
    canExportInvoices: true,

    // Échéances
    canViewDeadlines: true,
    canMarkDeadline: true,

    // Documents & GED
    canViewDocuments: true,
    canAddDocuments: false,
    canDeleteDocuments: false,

    // Administration
    canManageUsers: false,
    canManageSettings: false,
  },

  guest: {
    ...EMPTY_FLAGS,
  },
};

// -----------------------------------------------------------------------------
// Hook principal : lit le rôle réel via /api/me + override éventuel
// -----------------------------------------------------------------------------

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

        const res = await fetch("/api/me", {
          credentials: "include",
        });

        if (!res.ok) {
          if (!cancelled) {
            setUserRole("guest");
          }
          return;
        }

        const data = await res.json();

        let role: UserRole = "guest";

        const backendRole: string | undefined =
          data?.role ??
          data?.userRole ??
          data?.user?.role ??
          data?.user?.userRole;

        if (backendRole === "admin") role = "admin";
        else if (
          backendRole === "manager" ||
          backendRole === "contract_manager"
        )
          role = "manager";
        else if (backendRole === "validator") role = "validator";
        else role = "guest";

        // Override DEV via localStorage
        if (typeof window !== "undefined") {
          try {
            const override = window.localStorage.getItem(
              "klyxorDevRoleOverride"
            );
            if (
              override === "admin" ||
              override === "manager" ||
              override === "validator"
            ) {
              role = override;
            }
          } catch {
            // ignore
          }
        }

        if (!cancelled) {
          setUserRole(role);
        }
      } catch (err) {
        console.error("usePermissions /api/me error:", err);
        if (!cancelled) {
          setError(err);
          setUserRole("guest");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  const baseFlags = PERMISSIONS_BY_ROLE[userRole] ?? EMPTY_FLAGS;

  const canModifyContract = baseFlags.canEditContract;
  const canDeleteContract = baseFlags.canDeleteContract;
  const canModifyAmendment = baseFlags.canEditAmendment;
  const canDeleteAmendment = baseFlags.canDeleteAmendment;

  const canValidate =
    baseFlags.canValidateTerminateContract ||
    baseFlags.canValidateAmendment ||
    baseFlags.canValidateIndexation ||
    baseFlags.canValidateCancelInvoice;

  const hasPermission = (key?: PermissionKey | string | null): boolean => {
    if (!key) return true;

    const k = key as PermissionKey;
    if (k in baseFlags) {
      return Boolean((baseFlags as any)[k]);
    }

    // Fallback permissif tant que la matrice route ⇄ permissions n'est pas alignée
    return true;
  };

  return {
    loading,
    error,
    userRole,

    isAdmin: userRole === "admin",
    isManager: userRole === "manager",
    isValidator: userRole === "validator",

    // flags bruts
    ...baseFlags,

    // alias
    canModifyContract,
    canDeleteContract,
    canModifyAmendment,
    canDeleteAmendment,
    canValidate,

    hasPermission,
  };
}
