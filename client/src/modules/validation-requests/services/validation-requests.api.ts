// src/modules/validation-requests/services/validation-requests.api.ts
import { apiRequest } from "@/lib/queryClient";
import { ValidationRequest } from "../domain/types";

export type SearchParams = {
  q?: string;
  status?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
};

const BASE = "/api/validation-requests";

function buildQuery(params?: SearchParams) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  return `?${new URLSearchParams(entries as [string, string][]).toString()}`;
}

export async function searchValidationRequests(
  params: SearchParams
): Promise<ValidationRequest[]> {
  const res = await apiRequest("GET", `${BASE}${buildQuery(params)}`);
  return res.json();
}

export async function getValidationRequest(
  id: string
): Promise<ValidationRequest> {
  const res = await apiRequest("GET", `${BASE}/${id}`);
  return res.json();
}

export async function createValidationRequest(
  payload: Partial<ValidationRequest>
): Promise<ValidationRequest> {
  const res = await apiRequest("POST", `${BASE}/create`, payload);
  return res.json();
}

export async function updateValidationRequest(
  id: string,
  payload: Partial<ValidationRequest>
): Promise<ValidationRequest> {
  const res = await apiRequest("PATCH", `${BASE}/${id}`, payload);
  return res.json();
}

export async function approveValidationRequest(
  id: string,
  reason?: string
): Promise<ValidationRequest> {
  const res = await apiRequest("POST", `${BASE}/${id}/approve`, {
    reason: reason ?? null,
  });
  return res.json();
}

export async function rejectValidationRequest(
  id: string,
  reason?: string
): Promise<ValidationRequest> {
  const res = await apiRequest("POST", `${BASE}/${id}/reject`, {
    reason: reason ?? null,
  });
  return res.json();
}

export async function redirectValidationRequest(
  id: string,
  assignedTo: string,
  reason?: string
): Promise<ValidationRequest> {
  const res = await apiRequest("POST", `${BASE}/${id}/redirect`, {
    assignedTo,
    reason: reason ?? null,
  });
  return res.json();
}
