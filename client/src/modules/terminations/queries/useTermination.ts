import { useQuery } from "@tanstack/react-query";
import { fetchTermination } from "../services/terminations.api";
import { TERMINATIONS_QK } from "../domain/constants";

export function useTermination(id?: string) {
  return useQuery({
    queryKey: id ? TERMINATIONS_QK.one(id) : ["__noop__"],
    queryFn: () => fetchTermination(id!),
    enabled: Boolean(id),
  });
}
