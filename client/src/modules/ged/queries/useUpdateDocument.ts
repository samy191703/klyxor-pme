import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDocument } from "../services/uploads.api";
import type { ID } from "../domain/types";

export function useUpdateDocument(contractId?: ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; data: any }) =>
      updateDocument(payload.id, payload.data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({
        queryKey: ["/api/documents", contractId ?? "all"],
      });
      qc.invalidateQueries({ queryKey: ["/api/documents", "all"] });
      qc.invalidateQueries({ queryKey: ["/api/documents", vars?.id] });
    },
  });
}
