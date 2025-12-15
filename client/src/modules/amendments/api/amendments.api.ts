import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Amendment,
  AmendmentCreateDto,
  AmendmentUpdateDto,
} from "../domain/types";
import { AMENDMENTS_QK } from "../domain/constants";

export async function fetchAmendments(): Promise<Amendment[]> {
  const res = await apiRequest("GET", "/api/amendments");
  return res.json();
}

export async function fetchAmendment(id: string): Promise<Amendment> {
  const res = await apiRequest("GET", `/api/amendments/${id}`);
  return res.json();
}

export async function createAmendment(payload: AmendmentCreateDto) {
  const res = await apiRequest("POST", "/api/amendments", payload);
  queryClient.invalidateQueries({ queryKey: AMENDMENTS_QK.root });
  return res.json() as Promise<Amendment>;
}

export async function updateAmendment(id: string, payload: AmendmentUpdateDto) {
  const res = await apiRequest("PUT", `/api/amendments/${id}`, payload);
  queryClient.invalidateQueries({ queryKey: AMENDMENTS_QK.root });
  queryClient.invalidateQueries({ queryKey: AMENDMENTS_QK.one(id) });
  return res.json() as Promise<Amendment>;
}

export async function deleteAmendment(id: string) {
  const res = await apiRequest("DELETE", `/api/amendments/${id}`);
  queryClient.invalidateQueries({ queryKey: AMENDMENTS_QK.root });
  return res.json() as Promise<{ success: true }>;
}
