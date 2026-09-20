"use client";

import { motion } from "framer-motion";
import { MOCK_DEVICE, MOCK_TICKET } from "@/lib/kiosk/mock";

export function EnvelopeVisual({ packed = false }: { packed?: boolean }) {
  return (
    <div className="relative mx-auto h-[168px] w-[250px]">
      <svg viewBox="0 0 250 168" className="h-full w-full" aria-hidden>
        <rect x="18" y="58" width="214" height="92" rx="10" fill="#1c211e" stroke="#3ecf86" strokeOpacity="0.45" strokeWidth="2" />
        <path d="M18 70 L125 118 L232 70" fill="none" stroke="#3ecf86" strokeOpacity="0.35" strokeWidth="1.5" />
        <text x="125" y="138" textAnchor="middle" fill="#8d948f" fontSize="11">
          SD SOLUTIONS
        </text>
      </svg>
      <motion.div
        className="absolute left-1/2 top-2 h-[86px] w-[46px] -translate-x-1/2"
        initial={false}
        animate={packed ? { y: 48, opacity: 0.15, scale: 0.92 } : { y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 46 86" className="h-full w-full drop-shadow-lg">
          <rect x="3" y="4" width="40" height="78" rx="8" fill="#2a2e32" stroke="#c8ccd0" strokeWidth="1.5" />
          <rect x="8" y="10" width="30" height="52" rx="3" fill="#111418" />
          <circle cx="23" cy="72" r="3" fill="#c8ccd0" />
        </svg>
      </motion.div>
    </div>
  );
}

export function LabelVisual({ printed }: { printed: boolean }) {
  return (
    <div className="mx-auto flex w-[280px] flex-col items-center">
      <div className="h-3 w-[200px] rounded-t-md bg-[#2a2f2c]" />
      <div className="h-2 w-[220px] bg-[#3a403c]" />
      <div className="relative h-[132px] w-full overflow-hidden">
        <motion.div
          className="absolute left-1/2 w-[200px] -translate-x-1/2 rounded-sm bg-[#f4f1e8] p-3 text-[#1b1b1b] shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          initial={false}
          animate={printed ? { y: 8 } : { y: -120 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[10px] font-semibold tracking-[0.14em]">SD SOLUTIONS</p>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em]">
            REPARASJON #{MOCK_TICKET}
          </p>
          <p className="mt-0.5 text-[13px]">{MOCK_DEVICE}</p>
          <div className="mt-2 h-5 w-full bg-[repeating-linear-gradient(90deg,#1b1b1b_0_2px,transparent_2px_4px)]" />
        </motion.div>
      </div>
    </div>
  );
}

export function LockerVisual({
  openId,
  highlightId,
  occupied = [3],
}: {
  openId?: number | null;
  highlightId?: number;
  occupied?: number[];
}) {
  const bays = [1, 2, 3, 4];
  return (
    <div className="mx-auto grid w-[280px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#121614] p-3">
      {bays.map((id) => {
        const open = openId === id;
        const hi = highlightId === id;
        const filled = occupied.includes(id) && !open;
        return (
          <div key={id} className="relative h-[78px] overflow-hidden rounded-lg bg-[#0c0e0d]">
            <div className="absolute inset-1 rounded-md bg-[#1a1f1c]" />
            {filled ? (
              <div className="absolute inset-x-4 inset-y-5 rounded-sm bg-[#2c3330]" />
            ) : null}
            <motion.div
              className="absolute inset-0 origin-left rounded-lg border border-white/12 bg-[#1e2421]"
              initial={false}
              animate={{ rotateY: open ? -62 : 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <span
                className={[
                  "absolute left-2 top-2 text-[11px] font-medium",
                  hi ? "text-[#3ecf86]" : "text-white/45",
                ].join(" ")}
              >
                {id}
              </span>
              <span className="absolute right-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white/15" />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

export function ParcelOutVisual({ visible }: { visible: boolean }) {
  return (
    <div className="relative mx-auto h-[120px] w-[160px]">
      <motion.div
        className="absolute left-1/2 top-6 h-[88px] w-[52px] -translate-x-1/2"
        initial={false}
        animate={visible ? { y: -10, opacity: 1 } : { y: 36, opacity: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 52 88" className="h-full w-full">
          <rect x="2" y="2" width="48" height="84" rx="6" fill="#ece7d8" stroke="#c2b79a" />
          <rect x="8" y="10" width="36" height="18" rx="2" fill="#1b1b1b" />
          <text x="26" y="22" textAnchor="middle" fill="#f4f1e8" fontSize="7">
            SD
          </text>
        </svg>
      </motion.div>
    </div>
  );
}

export function CheckVisual() {
  return (
    <motion.div
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#3ecf86]"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.svg viewBox="0 0 48 48" className="h-9 w-9">
        <motion.path
          d="M12 25 L20 33 L36 15"
          fill="none"
          stroke="#3ecf86"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        />
      </motion.svg>
    </motion.div>
  );
}
