import { useQuery } from "@tanstack/react-query";
import { BILLING_QK } from "../domain/constants";
import { fetchBillingSchedule } from "../api/billing.api";
import type { BillingSchedule } from "../domain/types";

export function useBillingSchedule(id: string | null) {
  return useQuery<BillingSchedule>({
    queryKey: id ? BILLING_QK.schedules.detail(id) : ["skip"],
    queryFn: () => fetchBillingSchedule(id as string),
    enabled: !!id,
  });
}
