"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/Select";
import { REPAIR_STATUS_LABELS, REPAIR_STATUSES } from "@/lib/labels";
import { updateRepairStatus } from "@/server/repairs";

export function RepairStatusForm({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      className="max-w-xs"
      onChange={(e) => {
        const next = e.target.value as (typeof REPAIR_STATUSES)[number];
        startTransition(async () => {
          await updateRepairStatus(ticketId, next);
          router.refresh();
        });
      }}
    >
      {REPAIR_STATUSES.map((s) => (
        <option key={s} value={s}>
          {REPAIR_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
