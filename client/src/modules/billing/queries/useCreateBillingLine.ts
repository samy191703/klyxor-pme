import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBillingLine } from "../api/billing.api";
import { BILLING_QK } from "../domain/constants";
import type { BillingLine, BillingLineCreateDto } from "../domain/types";

export function useCreateBillingLine(scheduleId: string) {
  const qc = useQueryClient();
  return useMutation<BillingLine, Error, Omit<BillingLineCreateDto,"scheduleId">>({
    mutationFn: (dto) => createBillingLine(scheduleId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BILLING_QK.schedules.lines(scheduleId) });
    },
  });
}
