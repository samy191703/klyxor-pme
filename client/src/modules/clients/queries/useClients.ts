// src/modules/clients/queries/useClients.ts
import { useQuery } from "@tanstack/react-query";
import { fetchClients } from "../api/clients.api.ts";
import { CLIENTS_QK } from "../domain/constants";
import type { Client } from "../domain/types";

export function useClients() {
  return useQuery<Client[]>({
    queryKey: CLIENTS_QK.root,
    queryFn: fetchClients,
  });
}
