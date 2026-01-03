import { useQuery } from "@tanstack/react-query";
import type { BillingScheduleResponse } from "@/types/billing";

/**
 * Hook to fetch active billing schedule for a contract with optional billing lines
 * @param contractId - Contract ID (required)
 * @param includeLines - Whether to include billing lines in the response
 */
export function useBillingSchedule(contractId: string | undefined, includeLines: boolean = true) {
  return useQuery<BillingScheduleResponse>({
    queryKey: ['billing-schedule', contractId, includeLines ? 'lines' : 'no-lines'],
    queryFn: async (): Promise<BillingScheduleResponse> => {
      if (!contractId) {
        throw new Error('Contract ID is required');
      }

      const url = `/api/billing-schedules?contractId=${contractId}${includeLines ? '&include=lines' : ''}`;
      const res = await fetch(url, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('No active billing schedule found for this contract');
        }
        throw new Error(`Failed to fetch billing schedule: ${res.statusText}`);
      }

      return res.json();
    },
    enabled: !!contractId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

