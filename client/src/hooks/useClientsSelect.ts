import { useQuery } from "@tanstack/react-query";

export interface ClientOption {
  id: string;
  type_client: "PRO" | "PARTICULIER";
  nom_affichage: string;
}

async function fetchClientsSelect(): Promise<ClientOption[]> {
  const response = await fetch("/api/clients/select");

  if (!response.ok) {
    throw new Error("Erreur lors du chargement de la liste des clients");
  }

  return response.json();
}

export function useClientsSelect() {
  const query = useQuery<ClientOption[]>({
    queryKey: ["clients", "select"],
    queryFn: fetchClientsSelect,
    staleTime: 60 * 1000, // 1 minute
  });

  return query;
}
