import { useQuery } from "@tanstack/react-query";
import type { ID, UploadDocument } from "../domain/types";
import { listDocuments } from "../services/uploads.api";

export function useDocuments(contractId?: ID) {
  return useQuery<UploadDocument[]>({
    queryKey: ["/api/documents", contractId ?? "all"],
    queryFn: () => listDocuments(contractId ? { contractId } : undefined),
  });
}
