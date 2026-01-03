import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID, LocalFileSelection, UploadBatchMeta } from "../domain/types";
import { uploadMultipleContractFiles } from "../services/uploads.api";

export function useUploadDocuments(contractId: ID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      selections: (LocalFileSelection & UploadBatchMeta)[];
    }) => uploadMultipleContractFiles(contractId, payload.selections),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/documents", contractId] });
      qc.invalidateQueries({ queryKey: ["/api/documents", "all"] });
    },
  });
}
