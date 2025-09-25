import { useMutation } from "@tanstack/react-query";
import { updateAmendment } from "../api/amendments.api";
import type { AmendmentUpdateDto } from "../domain/types";

export function useUpdateAmendment() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AmendmentUpdateDto }) =>
      updateAmendment(id, payload),
  });
}
