import axios from "axios";
import type { ValidationRequest } from "../domain/types";

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

export async function searchValidationRequests(params: SearchParams) {
  const res = await axios.get(`${BASE}`, { params });
  return res.data as ValidationRequest[];
}

export async function getValidationRequest(id: string) {
  const res = await axios.get(`${BASE}/${id}`);
  return res.data as ValidationRequest;
}

export async function createValidationRequest(
  payload: Partial<ValidationRequest>
) {
  const res = await axios.post(`${BASE}/create`, payload);
  return res.data as ValidationRequest;
}

export async function updateValidationRequest(
  id: string,
  payload: Partial<ValidationRequest>
) {
  const res = await axios.patch(`${BASE}/${id}`, payload);
  return res.data as ValidationRequest;
}

export async function approveValidationRequest(id: string, reason?: string) {
  const res = await axios.post(`${BASE}/${id}/approve`, {
    reason: reason ?? null,
  });
  return res.data as ValidationRequest;
}

export async function rejectValidationRequest(id: string, reason?: string) {
  const res = await axios.post(`${BASE}/${id}/reject`, {
    reason: reason ?? null,
  });
  return res.data as ValidationRequest;
}

export async function redirectValidationRequest(
  id: string,
  assignedTo: string,
  reason?: string
) {
  const res = await axios.post(`${BASE}/${id}/redirect`, {
    assignedTo,
    reason: reason ?? null,
  });
  return res.data as ValidationRequest;
}
