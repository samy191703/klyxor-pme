import { useMutation } from "@tanstack/react-query";
import { executeTermination } from "../services/terminations.api";

export function useExecuteTermination(id: string, contractId?: string) {
  return useMutation({
    mutationFn: () => executeTermination(id, contractId),
  });
}
