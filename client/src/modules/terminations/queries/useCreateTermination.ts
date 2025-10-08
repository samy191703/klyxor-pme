import { useMutation } from "@tanstack/react-query";
import { createTermination } from "../services/terminations.api";
import type { TerminationCreateDto } from "../domain/types";

export function useCreateTermination() {
  return useMutation({
    mutationFn: (dto: TerminationCreateDto) => createTermination(dto),
  });
}
