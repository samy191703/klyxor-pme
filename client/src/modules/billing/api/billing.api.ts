// client/src/modules/billing/api/billing.api.ts
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  BillingSchedule,
  BillingScheduleCreateDto,
  BillingScheduleUpdateDto,
  BillingLine,
  BillingLineCreateDto,
  BillingLineUpdateDto,
  BillingScheduleGenerateDto,
  BillingScheduleWithLines,
} from "../domain/types";
import { BILLING_QK } from "../domain/constants";

/** ================== Billing Summary KPIs ================== **/
export async function fetchBillingSummaryKpis(params?: {
  from?: string;
  to?: string;
  customer?: string;
}) {
  const query = new URLSearchParams();

  if (params?.from) query.append("from", params.from);
  if (params?.to) query.append("to", params.to);
  if (params?.customer) query.append("customer", params.customer);

  const url = `/api/billing-schedules/summary/_issam${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  const res = await apiRequest("GET", url);
  return res.json();
}

/** ================== Schedules ================== **/
export type BillingSchedulesQuery = {
  search?: string;
  status?: string;
  customer?: string,
  type?: string;
  frequency?: string;
  contractNumber?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function fetchBillingSchedules(params: BillingSchedulesQuery = {}): Promise<BillingSchedule[]> {
  const query = new URLSearchParams();

  if (params.search) query.append("search", params.search);
  if (params.status) query.append("status", params.status);
  if (params.type) query.append("type", params.type);
  if (params.frequency) query.append("frequency", params.frequency);
  if (params.contractNumber) query.append("contractNumber", params.contractNumber);

  if (params.from) query.append("from", params.from);
  if (params.to) query.append("to", params.to);

  query.append("limit", String(params.limit ?? 50));
  query.append("offset", String(params.offset ?? 0));

  if (params.sortBy) query.append("sortBy", params.sortBy);
  if (params.sortOrder) query.append("sortOrder", params.sortOrder);

  const url = `/api/billing-schedules?${query.toString()}`;

  const res = await apiRequest("GET", url);
  return res.json();
}


export async function fetchBillingSchedule(
  id: string
): Promise<BillingSchedule> {
  const res = await apiRequest("GET", `/api/billing-schedules/${id}`);
  return res.json();
}

export async function fetchBillingScheduleWithLines(
  id: string
): Promise<BillingScheduleWithLines> {
  const res = await apiRequest("GET", `/api/billing-schedules/${id}`);
  return res.json();
}

export async function createBillingSchedule(
  payload: BillingScheduleGenerateDto
): Promise<BillingSchedule> {
  const res = await apiRequest("POST", `/api/billing-schedules/${payload.id}`);
  await queryClient.invalidateQueries({
    queryKey: BILLING_QK.schedules.list(),
  });
  return res.json();
}

export async function updateBillingSchedule(
  id: string,
  payload: BillingScheduleUpdateDto
): Promise<BillingSchedule> {
  const res = await apiRequest(
    "PATCH",
    `/api/billing-schedules/${id}`,
    payload
  );
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: BILLING_QK.schedules.detail(id),
    }),
    queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.list() }),
  ]);
  return res.json();
}

export async function deleteBillingSchedule(
  id: string
): Promise<{ success: true }> {
  const res = await apiRequest("DELETE", `/api/billing-schedules/${id}`);
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: BILLING_QK.schedules.detail(id),
    }),
    queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.list() }),
  ]);
  return res.json();
}

/**
 * ================== Download Schedule PDF ==================
 * Télécharge l’échéancier en PDF via un lien invisible.
 */
export async function downloadBillingSchedulePdf(
  id: string,
  contractNumber?: string | null
): Promise<void> {
  const res = await apiRequest("GET", `/api/billing-schedules/${id}/pdf`);

  if (!res.ok) {
    throw new Error("Erreur lors du téléchargement du PDF");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;

  const safeContract = contractNumber ?? id;
  link.download = `echeancier-${safeContract}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/** ================== Lines ================== **/
export async function fetchBillingLinesBySchedule(
  scheduleId: string
): Promise<BillingLine[]> {
  const res = await apiRequest(
    "GET",
    `/api/billing-schedules/${scheduleId}/lines`
  );
  return res.json();
}

export async function fetchBillingLine(id: string): Promise<BillingLine> {
  const res = await apiRequest("GET", `/api/billing-lines/${id}`);
  return res.json();
}

export async function createBillingLine(
  scheduleId: string,
  payload: Omit<BillingLineCreateDto, "scheduleId">
): Promise<BillingLine> {
  const res = await apiRequest(
    "POST",
    `/api/billing-schedules/${scheduleId}/lines`,
    {
      ...payload,
      scheduleId,
    }
  );
  await queryClient.invalidateQueries({
    queryKey: BILLING_QK.schedules.lines(scheduleId),
  });
  return res.json();
}

export async function updateBillingLine(
  lineId: string,
  payload: BillingLineUpdateDto,
  scheduleId?: string
): Promise<BillingLine> {
  const res = await apiRequest(
    "PATCH",
    `/api/billing-lines/${lineId}`,
    payload
  );
  if (scheduleId) {
    await queryClient.invalidateQueries({
      queryKey: BILLING_QK.schedules.lines(scheduleId),
    });
  }
  await queryClient.invalidateQueries({
    queryKey: BILLING_QK.lines.detail(lineId),
  });
  return res.json();
}

export async function deleteBillingLine(
  lineId: string,
  scheduleId?: string
): Promise<{ success: true }> {
  const res = await apiRequest("DELETE", `/api/billing-lines/${lineId}`);
  if (scheduleId) {
    await queryClient.invalidateQueries({
      queryKey: BILLING_QK.schedules.lines(scheduleId),
    });
  }
  await queryClient.invalidateQueries({
    queryKey: BILLING_QK.lines.detail(lineId),
  });
  return res.json();
}
