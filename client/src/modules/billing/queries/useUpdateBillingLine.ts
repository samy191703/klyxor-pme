import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBillingLine } from "../api/billing.api";
import type { BillingLine, BillingLineUpdateDto } from "../domain/types";

export function useUpdateBillingLine(lineId: string, scheduleId?: string) {
  const qc = useQueryClient();
  return useMutation<BillingLine, Error, BillingLineUpdateDto>({
    mutationFn: (dto) => updateBillingLine(lineId, dto, scheduleId),
    onSuccess: () => {
      if (scheduleId) {
        qc.invalidateQueries({ queryKey: ["billing-schedules", "lines", scheduleId] });
      }
      qc.invalidateQueries({ queryKey: ["billing-lines", "detail", lineId] });
    },
  });
}
