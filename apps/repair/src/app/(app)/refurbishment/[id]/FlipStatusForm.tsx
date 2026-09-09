"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/Select";
import { FLIP_STATUS_LABELS, FLIP_STATUSES } from "@/lib/labels";
import { updateFlipStatus } from "@/server/flips";

export function FlipStatusForm({
  flipId,
  status,
}: {
  flipId: string;
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
        const next = e.target.value as (typeof FLIP_STATUSES)[number];
        startTransition(async () => {
          await updateFlipStatus(flipId, next);
          router.refresh();
        });
      }}
    >
      {FLIP_STATUSES.map((s) => (
        <option key={s} value={s}>
          {FLIP_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
