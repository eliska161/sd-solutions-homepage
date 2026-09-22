"use client";

import { useEffect, useState } from "react";
import { Outfit } from "next/font/google";
import { formatCountdown, nextDayOffer } from "@/lib/next-day";

const clockFont = Outfit({
  subsets: ["latin"],
  weight: ["600"],
});

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
        <p
          className={`${clockFont.className} text-[40px] font-semibold tabular-nums leading-none tracking-tight`}
        >
          {remain}
        </p>
      </div>
      {offer.active ? (
        <p className="mt-2 text-[14px] leading-snug text-white/85">
          Opprett serviceordre og lever enheten i dag, så er den ferdig{" "}
          {offer.readyLabel}.
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-snug text-white/85">
          Fristen i dag er passert. Lever {offer.cutoffDayLabel}, så er den
          ferdig {offer.readyLabel}.
        </p>
      )}
    </div>
  );
}
