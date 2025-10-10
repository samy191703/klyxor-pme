// @shared/enums/validation.ts
import { z } from "zod";

export const ValidationRequestTypes = {
  CONTRACT: "contract",
  AMENDMENT: "amendment",
  TERMINATION: "termination",
  INDEXATION: "indexation",
  MANUAL_AMOUNT: "manual_amount",
} as const;

export enum ValidationRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  REDIRECTED = "redirected",
}

export const zValidationRequestType = z.enum([
  ValidationRequestTypes.CONTRACT,
  ValidationRequestTypes.AMENDMENT,
  ValidationRequestTypes.TERMINATION,
  ValidationRequestTypes.INDEXATION,
  ValidationRequestTypes.MANUAL_AMOUNT,
]);
