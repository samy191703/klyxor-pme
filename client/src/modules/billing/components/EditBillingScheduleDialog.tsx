import React, { useState, useEffect } from "react";
import { useUpdateBillingSchedule } from "../queries/useUpdateBillingSchedule";
import type { BillingSchedule } from "../domain/types";

export function EditBillingScheduleDialog({ open, onOpenChange, bs }: { open: boolean; onOpenChange: (v: boolean) => void; bs: BillingSchedule | null }) {
  const [form, setForm] = useState({
    frequency: "monthly",
    startDate: "",
    endDate: "",
    totalAmount: 0,
    currency: "EUR",
    status: "draft",
  });
  const { mutate, isLoading } = useUpdateBillingSchedule(bs?.id || "");

  useEffect(() => {
    if (bs) {
      setForm({
        frequency: bs.frequency,
        startDate: bs.startDate,
        endDate: bs.endDate,
        totalAmount: bs.totalAmount,
        currency: bs.currency || "EUR",
        status: bs.status,
      });
    }
  }, [bs]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!bs) return;
    mutate(form as any, { onSuccess: () => onOpenChange(false) });
  }

  if (!open || !bs) return null;
  return (
    <div className="dialog">
      <h3>Edit Billing Schedule</h3>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })} />
        <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="draft">Draft</option>
          <option value="generated">Generated</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="submit" disabled={isLoading}>Save</button>
        </div>
      </form>
    </div>
  );
}
