import { useQuery } from "@tanstack/react-query";
import { BILLING_QK } from "../domain/constants";
import { fetchBillingSchedules } from "../api/billing.api";
import type { BillingSchedule } from "../domain/types";

export function useBillingSchedules() {
  return useQuery<BillingSchedule[]>({
    queryKey: BILLING_QK.schedules.list(),
    queryFn: fetchBillingSchedules,
  });
}
