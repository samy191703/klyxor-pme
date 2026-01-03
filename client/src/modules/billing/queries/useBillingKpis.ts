import { useQuery } from "@tanstack/react-query";
import { fetchBillingSummaryKpis } from "../api/billing.api";
import { BILLING_QK } from "../domain/constants";

export function useBillingKpis(params?: {
  from?: string;
  to?: string;
  customer?: string;
}) {
  return useQuery({
    queryKey: BILLING_QK.kpis(params),
    queryFn: () => fetchBillingSummaryKpis(params),
  });
}
