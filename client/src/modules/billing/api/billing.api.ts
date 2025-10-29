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

export async function fetchBillingSchedule(id: string): Promise<BillingSchedule> {
  const res = await apiRequest("GET", `/api/billing-schedules/${id}`);
  return res.json();
}

export async function createBillingSchedule(payload: BillingScheduleCreateDto): Promise<BillingSchedule> {
  const res = await apiRequest("POST", "/api/billing-schedules", payload);
  await queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.list() });
  return res.json();
}

export async function updateBillingSchedule(id: string, payload: BillingScheduleUpdateDto): Promise<BillingSchedule> {
  const res = await apiRequest("PATCH", `/api/billing-schedules/${id}`, payload);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.detail(id) }),
    queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.list() }),
  ]);
  return res.json();
}

export async function deleteBillingSchedule(id: string): Promise<{ success: true }> {
  const res = await apiRequest("DELETE", `/api/billing-schedules/${id}`);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.detail(id) }),
    queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.list() }),
  ]);
  return res.json();
}

/** ================== Lines ================== **/
export async function fetchBillingLinesBySchedule(scheduleId: string): Promise<BillingLine[]> {
  const res = await apiRequest("GET", `/api/billing-schedules/${scheduleId}/lines`);
  return res.json();
}

export async function fetchBillingLine(id: string): Promise<BillingLine> {
  const res = await apiRequest("GET", `/api/billing-lines/${id}`);
  return res.json();
}

export async function createBillingLine(scheduleId: string, payload: Omit<BillingLineCreateDto,"scheduleId">): Promise<BillingLine> {
  const res = await apiRequest("POST", `/api/billing-schedules/${scheduleId}/lines`, { ...payload, scheduleId });
  await queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.lines(scheduleId) });
  return res.json();
}

export async function updateBillingLine(lineId: string, payload: BillingLineUpdateDto, scheduleId?: string): Promise<BillingLine> {
  const res = await apiRequest("PATCH", `/api/billing-lines/${lineId}`, payload);
  if (scheduleId) {
    await queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.lines(scheduleId) });
  }
  await queryClient.invalidateQueries({ queryKey: BILLING_QK.lines.detail(lineId) });
  return res.json();
}

export async function deleteBillingLine(lineId: string, scheduleId?: string): Promise<{ success: true }> {
  const res = await apiRequest("DELETE", `/api/billing-lines/${lineId}`);
  if (scheduleId) {
    await queryClient.invalidateQueries({ queryKey: BILLING_QK.schedules.lines(scheduleId) });
  }
  await queryClient.invalidateQueries({ queryKey: BILLING_QK.lines.detail(lineId) });
  return res.json();
}
