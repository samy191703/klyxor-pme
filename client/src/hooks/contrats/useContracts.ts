import { useQuery } from "@tanstack/react-query";

export function useContracts(filters: any) {
  const {
    data: contracts = [],
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: ["/api/contracts"],
  });

  const kpis = {
    drafts: contracts.filter((c) => c.status === "draft").length,
    toValidate: contracts.filter((c) => c.status === "pending_validation")
      .length,
    active: contracts.filter((c) => c.status === "active").length,
    terminated: contracts.filter((c) => c.status === "terminated").length,
    closed: contracts.filter((c) => c.status === "closed").length,
  };

  const filtered = contracts.filter((c) => {
    const search = (filters.search || "").toLowerCase();
    const n = (c.number ?? "").toLowerCase();
    const t = (c.title ?? "").toLowerCase();
    const matchesSearch = !search || n.includes(search) || t.includes(search);
    const matchesStatus =
      filters.status === "all" || c.status === filters.status;
    const matchesType = filters.type === "all" || c.type === filters.type;
    const matchesBU =
      filters.businessUnit === "all" || c.businessUnit === filters.businessUnit;
    return matchesSearch && matchesStatus && matchesType && matchesBU;
  });

  return { contracts, kpis, filtered, isLoading, refetch };
}
