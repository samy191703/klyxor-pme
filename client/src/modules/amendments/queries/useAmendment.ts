import { useQuery } from "@tanstack/react-query";
import { fetchAmendment } from "../api/amendments.api";
import { AMENDMENTS_QK } from "../domain/constants";
import type { Amendment } from "../domain/types";

export function useAmendment(id?: string) {
  return useQuery<Amendment>({
    queryKey: id ? AMENDMENTS_QK.one(id) : AMENDMENTS_QK.one("_"),
    queryFn: () => fetchAmendment(id!),
    enabled: Boolean(id),
  });
}
