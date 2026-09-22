"use client";

import { useEffect, useState } from "react";
import { formatCountdown, nextDayOffer } from "@/lib/next-day";

export function NextDayTimer({
  variant = "portal",
  inPerson = true,
}: {
  variant?: "portal" | "dark";
  inPerson?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const offer = nextDayOffer(new Date(now));
  const remain = formatCountdown(offer.cutoffAt.getTime() - now);
  const portal = variant === "portal";

  return (
    <div
      className={
        portal
          ? "rounded border border-border bg-surface-elevated px-4 py-3"
          : "max-w-[40ch] rounded-md border border-border bg-white/[0.04] px-4 py-3"
      }
      role="status"
    >
      <p
        className={
          portal
            ? "text-[13px] font-semibold uppercase tracking-[0.04em] text-muted"
            : "text-[12px] font-medium uppercase tracking-[0.08em] text-muted"
        }
      >
        Ferdig neste dag
      </p>
      <p
        className={
          portal
            ? "mt-1 font-mono text-[28px] font-semibold tabular-nums leading-none text-foreground"
            : "mt-2 font-mono text-[2rem] font-medium tabular-nums leading-none tracking-tight text-foreground"
        }
      >
        {remain}
      </p>
      {offer.active ? (
        <p className={portal ? "mt-2 text-[13px] text-muted" : "mt-2 text-[14px] leading-relaxed text-muted"}>
          {inPerson
            ? `Opprett serviceordre og lever enheten i dag, så er den ferdig ${offer.readyLabel}. Kutt kl. 18:30.`
            : `Gjelder ved innlevering i butikk. Lever innen kl. 18:30 i dag, så er den ferdig ${offer.readyLabel}.`}
        </p>
      ) : (
        <p className={portal ? "mt-2 text-[13px] text-muted" : "mt-2 text-[14px] leading-relaxed text-muted"}>
          Dagens kutt kl. 18:30 er passert. Neste kutt {offer.cutoffDayLabel} kl.
          18:30. Lever innen da, så er den ferdig {offer.readyLabel}.
        </p>
      )}
    </div>
  );
}
