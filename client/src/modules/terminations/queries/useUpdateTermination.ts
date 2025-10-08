import { useMutation } from "@tanstack/react-query";
import { updateTermination } from "../services/terminations.api";
import type { TerminationUpdateDto } from "../domain/types";

export function useUpdateTermination(id: string, contractId?: string) {
  return useMutation({
    mutationFn: (dto: TerminationUpdateDto) =>
      updateTermination(id, dto, contractId),
  });
}
