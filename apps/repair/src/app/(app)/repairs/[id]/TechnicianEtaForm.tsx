"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { toDateInputValue } from "@/lib/labels";
import {
  updateEstimatedCompletionDate,
  updateRepairAssignee,
} from "@/server/repairs";

type Tech = { id: string; name: string; email: string };

export function TechnicianEtaForm({
  ticketId,
  assigneeId,
  estimatedCompletionDate,
  technicians,
}: {
  ticketId: string;
  assigneeId: string | null;
  estimatedCompletionDate: Date | string | null;
  technicians: Tech[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignee, setAssignee] = useState(assigneeId ?? "");
  const [eta, setEta] = useState(toDateInputValue(estimatedCompletionDate));

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="assigneeId">Ansvarlig tekniker</Label>
        <Select
          id="assigneeId"
          className="mt-1.5"
          disabled={pending}
          value={assignee}
          onChange={(e) => {
            const value = e.target.value;
            setAssignee(value);
            startTransition(async () => {
              await updateRepairAssignee(ticketId, value || null);
              router.refresh();
            });
          }}
        >
          <option value="">Tekniker ikke tildelt</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="eta">Estimert ferdig</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Input
            id="eta"
            type="date"
            className="max-w-[11rem]"
            disabled={pending}
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await updateEstimatedCompletionDate(ticketId, eta || null);
                router.refresh();
              });
            }}
          >
            Lagre dato
          </Button>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          Vises for kunden som «Estimert ferdig» — ikke garantert.
        </p>
      </div>
    </div>
  );
}

export function CustomerLinkCard({
  publicUrl,
}: {
  publicUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">
        Sikker kundelink (tilfeldig token — ikke bare ticket-nummer).
      </p>
      <Input readOnly value={publicUrl} className="font-mono text-[12px]" />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Kopiert" : "Kopier link"}
        </Button>
        <a href={publicUrl} target="_blank" rel="noreferrer">
          <Button type="button" size="sm" variant="ghost">
            Åpne kundeside
          </Button>
        </a>
      </div>
    </div>
  );
}
