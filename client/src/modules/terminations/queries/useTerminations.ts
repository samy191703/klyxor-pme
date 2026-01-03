import { useQuery } from "@tanstack/react-query";
import { fetchTerminations } from "../services/terminations.api";
import { TERMINATIONS_QK } from "../domain/constants";

export function useTerminations() {
  return useQuery({
    queryKey: TERMINATIONS_QK.root,
    queryFn: fetchTerminations,
  });
}
