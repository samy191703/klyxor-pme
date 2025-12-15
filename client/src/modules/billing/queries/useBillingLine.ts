import { useQuery } from "@tanstack/react-query";
import { BILLING_QK } from "../domain/constants";
import { fetchBillingLine } from "../api/billing.api";
import type { BillingLine } from "../domain/types";

export function useBillingLine(id: string | null) {
  return useQuery<BillingLine>({
    queryKey: id ? BILLING_QK.lines.detail(id) : ["skip"],
    queryFn: () => fetchBillingLine(id as string),
    enabled: !!id,
  });
}
