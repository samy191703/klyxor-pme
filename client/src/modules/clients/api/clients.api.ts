// src/modules/clients/api/clients.api.ts
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  Client,
  ClientCreateDto,
  ClientUpdateDto,
} from "../domain/types";
import { CLIENTS_QK } from "../domain/constants";

export async function fetchClients(): Promise<Client[]> {
  const res = await apiRequest("GET", "/api/clients");
  return res.json();
}

export async function fetchClient(id: string): Promise<Client> {
  const res = await apiRequest("GET", `/api/clients/${id}`);
  return res.json();
}

export async function createClient(
  payload: ClientCreateDto
): Promise<Client> {
  const res = await apiRequest("POST", "/api/clients", payload);
  const data = (await res.json()) as Client;

  queryClient.invalidateQueries({ queryKey: CLIENTS_QK.root });
  queryClient.invalidateQueries({ queryKey: CLIENTS_QK.one(data.id) });

  return data;
}

export async function updateClient(
  id: string,
  payload: ClientUpdateDto
): Promise<Client> {
  const res = await apiRequest("PATCH", `/api/clients/${id}`, payload);
  const data = (await res.json()) as Client;

  queryClient.invalidateQueries({ queryKey: CLIENTS_QK.root });
  queryClient.invalidateQueries({ queryKey: CLIENTS_QK.one(id) });

  return data;
}

export async function deleteClient(
  id: string,
  force: boolean = false
): Promise<{ success: boolean }> {
  const url = force ? `/api/clients/${id}?force=true` : `/api/clients/${id}`;
  const res = await apiRequest("DELETE", url);
  const data = (await res.json()) as { success: boolean };

  queryClient.invalidateQueries({ queryKey: CLIENTS_QK.root });

  return data;
}
