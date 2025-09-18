// server/validators/contract-status.validator.ts
import {
  CONTRACT_STATUS_VALUES,
  ContractStatus as ContractStatusValue,
} from "@shared/enums/contracts-status.enum";
import { z } from "zod";

/** Zod enum based on shared tuple */
export const contractStatusSchema = z.enum(CONTRACT_STATUS_VALUES, {
  errorMap: () => ({ message: "Statut de contrat invalide" }),
});

/** Payload for setStatus */
export const setStatusSchema = z.object({
  status: contractStatusSchema,
  reason: z
    .string()
    .max(500, "La raison ne doit pas dépasser 500 caractères")
    .optional(),
});

/** Allowed transitions (state machine) — uses shared enum constants */
export function getAllowedTransitions(
  current: (typeof CONTRACT_STATUS_VALUES)[number]
): (typeof CONTRACT_STATUS_VALUES)[number][] {
  switch (current) {
    case ContractStatusValue.DRAFT:
      return [ContractStatusValue.PENDING_VALIDATION];
    case ContractStatusValue.PENDING_VALIDATION:
      return [ContractStatusValue.ACTIVE, ContractStatusValue.DRAFT];
    case ContractStatusValue.ACTIVE:
      return [ContractStatusValue.TERMINATED, ContractStatusValue.CLOSED];
    case ContractStatusValue.TERMINATED:
      return [ContractStatusValue.ARCHIVED];
    case ContractStatusValue.CLOSED:
      return [ContractStatusValue.ARCHIVED];
    case ContractStatusValue.ARCHIVED:
      return [];
    default:
      return [];
  }
}

/** Schema that also enforces the transition from the current status */
export function makeSetStatusSchema(
  current: (typeof CONTRACT_STATUS_VALUES)[number]
) {
  const allowed = new Set(getAllowedTransitions(current));
  return setStatusSchema.superRefine((data, ctx) => {
    if (!allowed.has(data.status)) {
      const list = Array.from(allowed);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message:
          list.length > 0
            ? `Transition invalide depuis "${current}" vers "${
                data.status
              }". Autorisées: ${list.join(", ")}.`
            : `Aucune transition possible depuis "${current}".`,
      });
    }
  });
}
