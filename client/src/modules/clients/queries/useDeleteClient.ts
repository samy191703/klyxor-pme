// src/modules/clients/queries/useDeleteClient.ts
import { useMutation } from "@tanstack/react-query";
import { deleteClient } from "../api/clients.api";

export function useDeleteClient() {
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
  });
}
