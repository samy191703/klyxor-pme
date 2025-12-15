import { useQuery } from "@tanstack/react-query";

export interface AdminContract {
  id: string;
  number: string;
  title: string;
  status: string;
  type?: string | null;
  businessUnit?: string | null;
  amount?: number | null;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

async function fetchAdminContracts(): Promise<AdminContract[]> {
  const response = await fetch("/api/admin/contracts");

  if (!response.ok) {
    throw new Error("Erreur lors du chargement de la liste des contrats");
  }

  return response.json();
}

export function useAdminContracts() {
  return useQuery<AdminContract[]>({
    queryKey: ["adminContracts"],
    queryFn: fetchAdminContracts,
    staleTime: 60 * 1000, // 1 minute
  });
}
