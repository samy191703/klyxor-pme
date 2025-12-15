import { useMutation } from "@tanstack/react-query";
import { patchTermination } from "../services/terminations.api";
import type { TerminationPatchDto } from "../domain/types";

export function usePatchTermination(id: string, contractId?: string) {
  return useMutation({
    mutationFn: (dto: TerminationPatchDto) =>
      patchTermination(id, dto, contractId),
  });
}
