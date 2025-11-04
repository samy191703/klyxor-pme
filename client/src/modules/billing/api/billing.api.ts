// client/src/modules/billing/api/billing.api.ts
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  BillingSchedule,
  BillingScheduleCreateDto,
  BillingScheduleUpdateDto,
  BillingLine,
  BillingLineCreateDto,
  BillingLineUpdateDto,
} from "../domain/types";
import { BILLING_QK } from "../domain/constants";

/** ================== Schedules ================== **/
export async function fetchBillingSchedules(): Promise<BillingSchedule[]> {
  const res = await apiRequest("GET", "/api/billing-schedules");
  return res.json();
}

export async function fetchBillingSchedule(
  id: string
): Promise<BillingSchedule> {
  const res = await apiRequest("GET", `/api/billing-schedules/${id}`);
  return res.json();
}

export async function createBillingSchedule(
  payload: BillingScheduleCreateDto
): Promise<BillingSchedule> {
  const res = await apiRequest("POST", "/api/billing-schedules", payload);
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
