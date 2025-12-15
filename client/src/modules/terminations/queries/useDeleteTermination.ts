import { useMutation } from "@tanstack/react-query";
import { deleteTermination } from "../services/terminations.api";

export function useDeleteTermination(id: string, contractId?: string) {
  return useMutation({
    mutationFn: () => deleteTermination(id, contractId),
  });
}
