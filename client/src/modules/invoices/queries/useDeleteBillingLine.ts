import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBillingLine } from "../api/billing.api";

export function useDeleteBillingLine(lineId: string, scheduleId?: string) {
  const qc = useQueryClient();
  return useMutation<{ success: true }, Error, void>({
    mutationFn: () => deleteBillingLine(lineId, scheduleId),
    onSuccess: () => {
      if (scheduleId) {
        qc.invalidateQueries({ queryKey: ["billing-schedules", "lines", scheduleId] });
      }
    },
  });
}
