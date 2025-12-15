import { useQuery } from "@tanstack/react-query";
import { BILLING_QK } from "../domain/constants";
import { fetchBillingLinesBySchedule } from "../api/billing.api";
import type { BillingLine } from "../domain/types";

export function useBillingLinesBySchedule(scheduleId: string | null) {
  return useQuery<BillingLine[]>({
    queryKey: scheduleId ? BILLING_QK.schedules.lines(scheduleId) : ["skip"],
    queryFn: () => fetchBillingLinesBySchedule(scheduleId as string),
    enabled: !!scheduleId,
  });
}
