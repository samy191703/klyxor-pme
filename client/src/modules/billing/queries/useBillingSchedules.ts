import { useQuery } from "@tanstack/react-query";
import { BillingSchedulesQuery } from "../api/billing.api";
import { BillingSchedule } from "../domain/types";

export interface BillingSchedulesResponse {
  rows: BillingSchedule[];
  total: number;
}

export function useBillingSchedules(filters: BillingSchedulesQuery) {
  return useQuery<BillingSchedulesResponse>({
    queryKey: ["billingSchedules", filters],
    queryFn: async (): Promise<BillingSchedulesResponse> => {
      const queryString = new URLSearchParams(filters as any).toString();
      const res = await fetch(`/api/billing-schedules?${queryString}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch billing schedules");
      return res.json(); // renvoie { rows, total }
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
