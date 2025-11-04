import React from "react";
import { useDeleteBillingSchedule } from "../../queries/useDeleteBillingSchedule";
import type { BillingSchedule } from "../../domain/types";

export function DeleteBillingScheduleDialog({
  open,
  onOpenChange,
  bs,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bs: BillingSchedule | null;
}) {
  const { mutate, isLoading } = useDeleteBillingSchedule(bs?.id || null);

  function confirm() {
    mutate(undefined, { onSuccess: () => onOpenChange(false) });
  }

  if (!open || !bs) return null;
  return (
    <div className="dialog">
      <p>
        Delete billing schedule <b>{bs.id}</b>?
      </p>
      <div className="flex gap-2">
        <button onClick={() => onOpenChange(false)}>Cancel</button>
        <button onClick={confirm} disabled={isLoading}>
          Delete
        </button>
      </div>
    </div>
  );
}
