"use client";

import { useMemo, useState } from "react";
import { savePublicDropoffAppointment } from "@/server/public-service-order";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { listDropoffDates, listOpenSlotsForDate } from "@/lib/dropoff";

export function DropoffForm({ token }: { token: string }) {
  const dates = useMemo(() => listDropoffDates(), []);
  const [date, setDate] = useState(dates[0]?.value ?? "");
  const [slot, setSlot] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSlots = date ? listOpenSlotsForDate(date) : [];
  const effectiveSlot = selectedSlots.includes(
    slot as (typeof selectedSlots)[number],
  )
    ? slot
    : (selectedSlots[0] ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await savePublicDropoffAppointment({
      token,
      date,
      slot: effectiveSlot,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = `/s/${token}?ny=1`;
  }

  if (dates.length === 0) {
    return (
      <p className="text-sm">
        Verkstedet har stengt for i dag. Kom tilbake mandag–lørdag mellom
        12:00 og 18:00, eller ta kontakt.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="dropoff-date">Dato</Label>
        <Select
          id="dropoff-date"
          className="mt-1"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSlot("");
          }}
        >
          {dates.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="dropoff-slot">Timeslot</Label>
        <Select
          id="dropoff-slot"
          className="mt-1"
          value={effectiveSlot}
          onChange={(e) => setSlot(e.target.value)}
          required
        >
          {selectedSlots.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !date || !effectiveSlot}>
        {pending ? "Lagrer…" : "Bekreft innlevering"}
      </Button>
    </form>
  );
}
