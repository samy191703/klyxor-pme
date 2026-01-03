import { useMutation } from "@tanstack/react-query";
import { decideTermination } from "../services/terminations.api";
import type { DecisionPayload } from "../domain/types";

export function useDecisionTermination(id: string, contractId?: string) {
  return useMutation({
    mutationFn: (payload: DecisionPayload) =>
      decideTermination(id, payload, contractId),
  });
}
