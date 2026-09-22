"use client";

import { useEffect, useState } from "react";
import { formatCountdown, nextDayOffer } from "@/lib/next-day";

export function NextDayTimer() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const offer = nextDayOffer(new Date(now));
  const remain = formatCountdown(offer.cutoffAt.getTime() - now);

  return (
    <div
      className="rounded border border-[#1e4e82] bg-[#1b1e24] px-4 py-3 text-white"
      role="status"
    >
      <div className="flex items-end justify-between gap-4">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/70">
          Ferdig neste dag
        </p>
        <p className="font-mono text-[36px] font-semibold tabular-nums leading-none tracking-tight">
          {remain}
        </p>
      </div>
      {offer.active ? (
        <p className="mt-2 text-[14px] leading-snug text-white/85">
          Opprett serviceordre og lever enheten i dag, så er den ferdig{" "}
          {offer.readyLabel}. Kutt kl. 18:30.
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-snug text-white/85">
          Dagens kutt kl. 18:30 er passert. Neste kutt {offer.cutoffDayLabel} kl.
          18:30. Lever innen da, så er den ferdig {offer.readyLabel}.
        </p>
      )}
    </div>
  );
}
