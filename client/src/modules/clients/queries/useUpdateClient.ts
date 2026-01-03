// src/modules/clients/queries/useUpdateClient.ts
import { useMutation } from "@tanstack/react-query";
import { updateClient } from "../api/clients.api";
import type { ClientUpdateDto } from "../domain/types";

export function useUpdateClient() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClientUpdateDto }) =>
      updateClient(id, payload),
  });
}
