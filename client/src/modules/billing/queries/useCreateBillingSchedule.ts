import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBillingSchedule } from "../api/billing.api";
import { BILLING_QK } from "../domain/constants";
import type {
  BillingScheduleCreateDto,
  BillingSchedule,
  BillingScheduleGenerateDto,
} from "../domain/types";

export function useCreateBillingSchedule() {
  const qc = useQueryClient();
  return useMutation<BillingSchedule, Error, BillingScheduleGenerateDto>({
    mutationFn: (dto) => createBillingSchedule(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BILLING_QK.schedules.list() });
    },
  });
}
