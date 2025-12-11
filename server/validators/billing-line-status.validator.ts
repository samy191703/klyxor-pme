// server/validators/billing-line-status.validator.ts
import { BillingLineStatus } from "@shared/enums/billing.enum";

/**
 * Transitions autorisées pour les statuts de billing line :
 * - DRAFT → A_FACTURER | ANNULEE
 * - A_FACTURER → FACTUREE | ANNULEE
 * 
 * Toutes les autres transitions sont interdites (ex: FACTUREE → DRAFT/A_FACTURER, ANNULEE → FACTUREE)
 */
const ALLOWED_TRANSITIONS: Record<BillingLineStatus, BillingLineStatus[]> = {
  DRAFT: [BillingLineStatus.A_FACTURER, BillingLineStatus.ANNULEE],
  A_FACTURER: [BillingLineStatus.FACTUREE, BillingLineStatus.ANNULEE],
  FACTUREE: [], // Aucune transition autorisée depuis FACTUREE
  ANNULEE: [], // Aucune transition autorisée depuis ANNULEE
};

/**
 * Valide si une transition de statut est autorisée
 * @param fromStatus Statut actuel
 * @param toStatus Nouveau statut
 * @returns true si la transition est autorisée, false sinon
 */
export function isStatusTransitionAllowed(
  fromStatus: BillingLineStatus,
  toStatus: BillingLineStatus
): boolean {
  // Si c'est le même statut, c'est autorisé (pas de changement)
  if (fromStatus === toStatus) {
    return true;
  }

  const allowedTargets = ALLOWED_TRANSITIONS[fromStatus];
  return allowedTargets.includes(toStatus);
}

/**
 * Valide une transition de statut et lance une erreur si elle n'est pas autorisée
 * @param fromStatus Statut actuel
 * @param toStatus Nouveau statut
 * @throws Error si la transition n'est pas autorisée
 */
export function validateStatusTransition(
  fromStatus: BillingLineStatus,
  toStatus: BillingLineStatus
): void {
  if (!isStatusTransitionAllowed(fromStatus, toStatus)) {
    throw new Error(
      `Transition de statut interdite: ${fromStatus} → ${toStatus}. ` +
      `Transitions autorisées depuis ${fromStatus}: ${ALLOWED_TRANSITIONS[fromStatus].join(", ") || "aucune"}`
    );
  }
}

/**
 * Retourne la liste des statuts vers lesquels on peut transitionner depuis un statut donné
 * @param fromStatus Statut actuel
 * @returns Liste des statuts cibles autorisés
 */
export function getAllowedTargetStatuses(
  fromStatus: BillingLineStatus
): BillingLineStatus[] {
  return ALLOWED_TRANSITIONS[fromStatus];
}

