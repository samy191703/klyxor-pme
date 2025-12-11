// src/modules/clients/queries/useCreateClient.ts
import { useMutation } from "@tanstack/react-query";
import { createClient } from "../api/clients.api";
import type { ClientCreateDto } from "../domain/types";

export function useCreateClient() {
  return useMutation({
    mutationFn: (payload: ClientCreateDto) => createClient(payload),
  });
}
