import { useMutation } from "@tanstack/react-query";
import { createAmendment } from "../api/amendments.api";
import type { AmendmentCreateDto } from "../domain/types";

export function useCreateAmendment() {
  return useMutation({
    mutationFn: (payload: AmendmentCreateDto) => createAmendment(payload),
  });
}
