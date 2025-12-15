import { useMutation } from "@tanstack/react-query";
import { deleteAmendment } from "../api/amendments.api";

export function useDeleteAmendment() {
  return useMutation({
    mutationFn: (id: string) => deleteAmendment(id),
  });
}
