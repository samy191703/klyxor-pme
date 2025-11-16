import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBillingSchedule } from "../api/billing.api";
import { BILLING_QK } from "../domain/constants";
import type { BillingScheduleUpdateDto, BillingSchedule } from "../domain/types";

export function useUpdateBillingSchedule(id: string) {
  const qc = useQueryClient();
  return useMutation<BillingSchedule, Error, BillingScheduleUpdateDto>({
    mutationFn: (dto) => updateBillingSchedule(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BILLING_QK.schedules.detail(id) });
      qc.invalidateQueries({ queryKey: BILLING_QK.schedules.list() });
    },
  });
}
