import { useQuery } from "@tanstack/react-query";
import { fetchTerminationsByContract } from "../services/terminations.api";
import { TERMINATIONS_QK } from "../domain/constants";

export function useTerminationsByContract(contractId?: string) {
  return useQuery({
    queryKey: contractId
      ? TERMINATIONS_QK.byContract(contractId)
      : ["__noop__"],
    queryFn: () => fetchTerminationsByContract(contractId!),
    enabled: Boolean(contractId),
  });
}
