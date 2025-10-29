import React, { useState } from "react";
import { useCreateBillingSchedule } from "../queries/useCreateBillingSchedule";

export function CreateBillingScheduleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState({
    contractId: "",
    frequency: "monthly",
    startDate: "",
    endDate: "",
    totalAmount: 0,
    currency: "EUR",
  });
  const { mutate, isLoading } = useCreateBillingSchedule();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    mutate(form, { onSuccess: () => onOpenChange(false) });
  }

  if (!open) return null;
  return (
    <div className="dialog">
      <h3>Create Billing Schedule</h3>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input placeholder="Contract ID" value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })} />
        <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })} />
        <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        <div className="flex gap-2">
          <button type="button" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="submit" disabled={isLoading}>Create</button>
        </div>
      </form>
    </div>
  );
}
