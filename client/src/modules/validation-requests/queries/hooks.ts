import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  searchValidationRequests,
  getValidationRequest,
  createValidationRequest,
  updateValidationRequest,
  approveValidationRequest,
  rejectValidationRequest,
  redirectValidationRequest,
  type SearchParams,
} from "../services/validation-requests.service";
import { VALIDATION_REQUESTS_QK } from "../domain/constants";
import { ValidationRequest } from "../domain/types";

export function useSearchValidationRequests(params: SearchParams) {
  return useQuery({
    queryKey: ["validation-requests", "search", params],
    queryFn: () => searchValidationRequests(params),
  });
}

export function useGetValidationRequest(id?: string) {
  return useQuery({
    queryKey: ["validation-requests", "one", id],
    queryFn: () => (id ? getValidationRequest(id) : Promise.reject("no id")),
    enabled: !!id,
  });
}

export function useCreateValidationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createValidationRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validation-requests"] });
    },
  });
}

export function useUpdateValidationRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => updateValidationRequest(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validation-requests"] });
      qc.invalidateQueries({ queryKey: ["validation-requests", "one", id] });
    },
  });
}

export function useApproveValidationRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => approveValidationRequest(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validation-requests"] });
      qc.invalidateQueries({ queryKey: ["validation-requests", "one", id] });
    },
  });
}

export function useRejectValidationRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => rejectValidationRequest(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validation-requests"] });
      qc.invalidateQueries({ queryKey: ["validation-requests", "one", id] });
    },
  });
}

export function useRedirectValidationRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { assignedTo: string; reason?: string }) =>
      redirectValidationRequest(id, vars.assignedTo, vars.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validation-requests"] });
      qc.invalidateQueries({ queryKey: ["validation-requests", "one", id] });
    },
  });
}

export function useValidationRequests() {
  return useQuery({
    queryKey: VALIDATION_REQUESTS_QK.list,
    // by default get first page big enough; you can wire filters later
    queryFn: async () => {
      const res = await searchValidationRequests({ page: 1, limit: 500 });
      // normalize to an array like useTerminations
      return (res ?? []) as ValidationRequest[];
    },
  });
}
