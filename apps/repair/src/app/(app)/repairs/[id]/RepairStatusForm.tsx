"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { updateRepairStatus, updateReturnTracking } from "@/server/repairs";
import { REPAIR_STATUS_LABELS, REPAIR_STATUSES } from "@/lib/labels";
import { Select } from "@/components/ui/Select";

export function RepairStatusForm({
  ticketId,
  status,
  outboundPost,
  returnTrackingNumber,
}: {
  ticketId: string;
  status: string;
  outboundPost: boolean;
  returnTrackingNumber: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tracking, setTracking] = useState(returnTrackingNumber ?? "");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        value={status}
        disabled={pending}
        className="max-w-xs"
        onChange={(e) => {
          const next = e.target.value as (typeof REPAIR_STATUSES)[number];
          startTransition(async () => {
            await updateRepairStatus(
              ticketId,
              next,
              outboundPost && tracking.trim()
                ? { returnTrackingNumber: tracking }
                : undefined,
            );
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
      {outboundPost ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await updateReturnTracking(ticketId, tracking);
              router.refresh();
            });
          }}
        >
          <div>
            <Label htmlFor="returnTracking">Sporingsnummer retur</Label>
            <Input
              id="returnTracking"
              className="mt-1 w-52"
              value={tracking}
              disabled={pending}
              placeholder="f.eks. POSTNORD…"
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Lagrer…" : "Lagre sporing"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
