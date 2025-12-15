import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUpload } from "../services/uploads.api";
import type { ID } from "../domain/types";

export function useDeleteDocument(contractId?: ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => deleteUpload(docId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["/api/documents", contractId ?? "all"],
      });
    },
  });
}
