import { useQuery } from "@tanstack/react-query";
import { fetchAmendments } from "../api/amendments.api";
import { AMENDMENTS_QK } from "../domain/constants";
import type { Amendment } from "../domain/types";

export function useAmendments() {
  return useQuery<Amendment[]>({
    queryKey: AMENDMENTS_QK.root,
    queryFn: fetchAmendments,
  });
}
