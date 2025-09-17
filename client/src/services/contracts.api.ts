// src/services/contracts.api.ts

import {
  ID,
  ContractPatch,
  ContractCore,
  IndexationConfig,
  ManualModificationPayload,
} from "@/_models/contract.model";
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
export function createContractDraft(
  payload: ContractPatch | ContractCore
): Promise<Contract> {
  return http<Contract>("/api/contracts", jsonInit("POST", payload));
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
