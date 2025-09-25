// src/services/contracts.api.ts

import { CalculationResult } from "@/_dtos/calculate-results.dto";
import { IndexationMode, Policy } from "@/_enums/indexation-policy.enum";
import {
  ID,
  ContractPatch,
  ContractCore,
  IndexationConfig,
  ManualModificationPayload,
} from "@/_models/contract.model";
import { BillingPeriods, PaymentTypes } from "@shared/enums/contracts";
import { ContractStatus } from "@shared/enums/contracts-status.enum";
import { PatchStep1Payload } from "@shared/models/contract.model";
import { Contract } from "@shared/schema";

// ---- Internal helpers ----
async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = text || res.statusText || "Request failed";
    throw new Error(
      `${init?.method || "GET"} ${input} -> ${res.status} ${message}`
    );
  }
  // Some endpoints may return 204
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}

// ---- Contracts: public endpoints ----

// GET /api/contracts
export function listContracts(): Promise<Contract[]> {
  return http<Contract[]>("/api/contracts");
}

// GET /api/contracts/:id
export function getContract(id: ID): Promise<Contract> {
  return http<Contract>(`/api/contracts/${encodeURIComponent(String(id))}`);
}

// POST /api/contracts
// Server sets status: 'draft' on create (brouillon)
// services/contracts.api.ts
export async function createContractDraft(payload: any) {
  const res = await fetch(`/api/contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) {
      const err: any = new Error(
        body?.message || "Numéro de contrat déjà utilisé"
      );
      err.status = 409;
      err.field = body?.field || "number";
      err.detail = body?.detail;
      throw err;
    }
    const txt =
      (await res.text().catch(() => "")) || body?.error || "Erreur serveur";
    throw new Error(`${res.status}: ${txt}`);
  }
  return res.json();
}

// PUT /api/contracts/:id (full update)
export function updateContractFull(
  id: ID,
  data: ContractCore & Partial<{ indexation: IndexationConfig }>
): Promise<Contract> {
  return http<Contract>(
    `/api/contracts/${encodeURIComponent(String(id))}`,
    jsonInit("PUT", data)
  );
}

// PATCH /api/contracts/:id (partial update; dates are coerced server-side)
export function updateContract(
  id: ID,
  patch: ContractPatch
): Promise<Contract> {
  return http<Contract>(
    `/api/contracts/${encodeURIComponent(String(id))}`,
    jsonInit("PATCH", patch)
  );
}

export async function patchContractStep1(
  id: string | number,
  payload: PatchStep1Payload
) {
  const res = await fetch(`/api/contracts/${id}/step1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // duplicate number handling symmetry with POST
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      const err: any = new Error(
        body?.message || "Numéro de contrat déjà utilisé"
      );
      err.status = 409;
      err.field = body?.field || "number";
      err.detail = body?.detail;
      throw err;
    }
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Échec mise à jour (étape 1) ${res.status}: ${txt || "voir logs serveur"}`
    );
  }
  return res.json();
}

export async function patchContractStep2(
  id: string | number,
  payload: {
    startDate: string;
    endDate: string;
    fixedAmount?: number;
    variableAmount?: number;
    billingPeriod: BillingPeriods;
    billingFrequency?: BillingPeriods;
    paymentType: PaymentTypes;
    currency?: "EUR" | "USD";
    maxAnnualProduction?: number;
    numberOfTurbines?: number;
    pricePerMWh?: number;
  }
) {
  const res = await fetch(`/api/contracts/${id}/step2`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Échec mise à jour (étape 2) ${res.status}: ${txt || "voir logs serveur"}`
    );
  }
  return res.json().catch(() => ({}));
}

export type VariableNumberInput =
  | { mode: "FIXED"; fixed?: number | null }
  | { mode: "VARIABLE"; items: Array<{ startingFrom: string; value: number }> };

export type PatchStep3Payload = {
  indexationEnabled: boolean;
  indexationFormulaId?: string;
  indexationFormula?: string;
  indexationFrequency: BillingPeriods;
  indexationMode: IndexationMode;
  indexationPolicy: Policy;
  indexationDate: string; // "YYYY-MM-DD"
  lastIndiceDate?: string; // "YYYY-MM-DD"
  requireRevised: "R" | "P";
  baseAmountInput: VariableNumberInput;
  baseIndices?: Record<string, VariableNumberInput>;
  PN1?: number;
  capPercent?: number | null;
  floorPercent?: number | null;
  currency?: "EUR" | "USD";
  baseIndiceValues?: Record<string, number>;
  lastIndexationPreview?: CalculationResult;
};

export async function patchContractStep3(
  id: string | number,
  payload: PatchStep3Payload
) {
  const res = await fetch(`/api/contracts/${id}/step3`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err?.message || "Failed step 3 patch"), err);
  }
  return res.json();
}

// DELETE /api/contracts/:id
export function deleteContract(id: ID): Promise<{ message: string }> {
  return http<{ message: string }>(
    `/api/contracts/${encodeURIComponent(String(id))}`,
    { method: "DELETE" }
  );
}

// GET /api/contracts/:contractId/amendments
export function getContractAmendments(contractId: ID): Promise<any[]> {
  return http<any[]>(
    `/api/contracts/${encodeURIComponent(String(contractId))}/amendments`
  );
}

// PUT /api/contracts/:id/indexation-config
export function updateIndexationConfig(
  id: ID,
  config: IndexationConfig
): Promise<Contract> {
  return http<Contract>(
    `/api/contracts/${encodeURIComponent(String(id))}/indexation-config`,
    jsonInit("PUT", config)
  );
}

// GET /api/contracts/:id/missing-indices
export function getMissingIndices(id: ID): Promise<{ missing: any[] }> {
  return http<{ missing: any[] }>(
    `/api/contracts/${encodeURIComponent(String(id))}/missing-indices`
  );
}

// GET /api/contracts/upcoming-indexations
export function getUpcomingIndexations(): Promise<any[]> {
  return http<any[]>(`/api/contracts/upcoming-indexations`);
}

// POST /api/contracts/manual-modification
export function postManualModification(
  payload: ManualModificationPayload
): Promise<any> {
  return http<any>(
    `/api/contracts/manual-modification`,
    jsonInit("POST", payload)
  );
}

// ---- Admin (present in routes; optional to use) ----

// GET /api/admin/contracts
export function listAdminContracts(): Promise<any[]> {
  return http<any[]>("/api/admin/contracts");
}

// POST /api/admin/contracts
export function createAdminContract(payload: any): Promise<any> {
  return http<any>("/api/admin/contracts", jsonInit("POST", payload));
}

// GET /api/admin/contracts/list  (separate listing route present in routes.ts)
export function listAdminContractsList(): Promise<any[]> {
  return http<any[]>("/api/admin/contracts/list");
}

// ---- NEW: Status management ----

export function setContractStatus(
  id: ID,
  status: ContractStatus,
  reason?: string
): Promise<Contract> {
  return http<Contract>(
    `/api/contracts/${encodeURIComponent(String(id))}/status`,
    jsonInit("PATCH", { status, reason })
  );
}

export function submitContractForValidation(
  id: ID,
  reason?: string
): Promise<Contract> {
  return setContractStatus(id, ContractStatus.PENDING_VALIDATION, reason);
}
