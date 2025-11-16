import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBillingSchedule } from "../api/billing.api";
import { BILLING_QK } from "../domain/constants";

export function useDeleteBillingSchedule(id: string | null) {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, void>({
    mutationFn: () => deleteBillingSchedule(id as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BILLING_QK.schedules.list() });
    },
  });
}
