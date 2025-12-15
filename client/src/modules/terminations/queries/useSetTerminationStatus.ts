import { useMutation } from "@tanstack/react-query";
import { setTerminationStatus } from "../services/terminations.api";
import type { SetStatusPayload } from "../domain/types";

export function useSetTerminationStatus(id: string, contractId?: string) {
  return useMutation({
    mutationFn: (payload: SetStatusPayload) =>
      setTerminationStatus(id, payload, contractId),
  });
}
