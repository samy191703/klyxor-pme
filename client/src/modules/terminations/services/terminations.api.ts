// src/modules/terminations/services/terminations.api.ts
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Termination,
  TerminationCreateDto,
  TerminationUpdateDto,
  TerminationPatchDto,
  SetStatusPayload,
  DecisionPayload,
} from "../domain/types";
import { TERMINATIONS_QK } from "../domain/constants";

// LIST
export async function fetchTerminations(): Promise<Termination[]> {
  const res = await apiRequest("GET", "/api/terminations");
  return res.json();
}

// READ ONE
export async function fetchTermination(id: string): Promise<Termination> {
  const res = await apiRequest("GET", `/api/terminations/${id}`);
  return res.json();
}

// LIST BY CONTRACT
export async function fetchTerminationsByContract(
  contractId: string
): Promise<Termination[]> {
  const res = await apiRequest(
    "GET",
    `/api/contracts/${contractId}/terminations`
  );
  return res.json();
}

// CREATE
export async function createTermination(
  payload: TerminationCreateDto
): Promise<Termination> {
  const res = await apiRequest("POST", "/api/terminations", payload);
  const json = (await res.json()) as Termination;

  // invalidate lists
  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.root });
  queryClient.invalidateQueries({
    queryKey: TERMINATIONS_QK.byContract(json.contractId),
  });

  // seed cache for read-one
  queryClient.setQueryData(TERMINATIONS_QK.one(json.id), json);
  return json;
}

// UPDATE (PUT — only draft/rejected per backend rule)
export async function updateTermination(
  id: string,
  payload: TerminationUpdateDto,
  contractId?: string
): Promise<Termination> {
  const res = await apiRequest("PUT", `/api/terminations/${id}`, payload);
  const json = (await res.json()) as Termination;

  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.root });
  queryClient.invalidateQueries({
    queryKey: TERMINATIONS_QK.one(id),
  });
  if (contractId ?? json.contractId) {
    queryClient.invalidateQueries({
      queryKey: TERMINATIONS_QK.byContract(contractId ?? json.contractId),
    });
  }
  return json;
}

// PATCH (partial)
export async function patchTermination(
  id: string,
  payload: TerminationPatchDto,
  contractId?: string
): Promise<Termination> {
  const res = await apiRequest("PATCH", `/api/terminations/${id}`, payload);
  const json = (await res.json()) as Termination;

  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.root });
  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.one(id) });
  if (contractId ?? json.contractId) {
    queryClient.invalidateQueries({
      queryKey: TERMINATIONS_QK.byContract(contractId ?? json.contractId),
    });
  }
  return json;
}

// DELETE (draft/rejected only)
export async function deleteTermination(
  id: string,
  contractId?: string
): Promise<{ success: true }> {
  const res = await apiRequest("DELETE", `/api/terminations/${id}`);
  const json = (await res.json()) as { success: true };

  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.root });
  if (contractId) {
    queryClient.invalidateQueries({
      queryKey: TERMINATIONS_QK.byContract(contractId),
    });
  }
  return json;
}

// STATUS TRANSITION
export async function setTerminationStatus(
  id: string,
  payload: SetStatusPayload,
  contractId?: string
): Promise<Termination> {
  const res = await apiRequest(
    "PATCH",
    `/api/terminations/${id}/status`,
    payload
  );
  const json = (await res.json()) as Termination;

  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.root });
  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.one(id) });
  queryClient.invalidateQueries({
    queryKey: TERMINATIONS_QK.byContract(contractId ?? json.contractId),
  });
  return json;
}

// DECISION (validate / reject)
export async function decideTermination(
  id: string,
  payload: DecisionPayload,
  contractId?: string
): Promise<Termination> {
  const res = await apiRequest(
    "POST",
    `/api/terminations/${id}/decision`,
    payload
  );
  const json = (await res.json()) as Termination;

  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.root });
  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.one(id) });
  queryClient.invalidateQueries({
    queryKey: TERMINATIONS_QK.byContract(contractId ?? json.contractId),
  });
  return json;
}

// EXECUTE (only when validated)
export async function executeTermination(
  id: string,
  contractId?: string
): Promise<Termination> {
  const res = await apiRequest("POST", `/api/terminations/${id}/execute`);
  const json = (await res.json()) as Termination;

  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.root });
  queryClient.invalidateQueries({ queryKey: TERMINATIONS_QK.one(id) });
  queryClient.invalidateQueries({
    queryKey: TERMINATIONS_QK.byContract(contractId ?? json.contractId),
  });

  // If you cache contracts, also refresh the contract read query here.
  // queryClient.invalidateQueries({ queryKey: CONTRACTS_QK.one(json.contractId) });

  return json;
}
