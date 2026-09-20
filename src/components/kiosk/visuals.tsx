"use client";

import { motion } from "framer-motion";
import { MOCK_DEVICE, MOCK_TICKET } from "@/lib/kiosk/mock";

export function EnvelopeVisual({ packed = false }: { packed?: boolean }) {
  return (
    <div className="relative mx-auto h-[168px] w-[250px]" aria-hidden>
      <svg viewBox="0 0 250 168" className="h-full w-full">
        <rect
          x="18"
          y="58"
          width="214"
          height="92"
          rx="4"
          fill="#ffffff"
          stroke="#1f2430"
          strokeWidth="3"
        />
        <path
          d="M18 70 L125 118 L232 70"
          fill="none"
          stroke="#2b6cb0"
          strokeWidth="3"
        />
        <text
          x="125"
          y="140"
          textAnchor="middle"
          fill="#1f2430"
          fontSize="12"
          fontWeight="700"
        >
          SD SOLUTIONS
        </text>
      </svg>
      <motion.div
        className="absolute left-1/2 top-2 h-[86px] w-[46px] -translate-x-1/2"
        initial={false}
        animate={packed ? { y: 48, opacity: 0.2, scale: 0.92 } : { y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 46 86" className="h-full w-full">
          <rect x="3" y="4" width="40" height="78" rx="6" fill="#1b1e24" stroke="#1f2430" strokeWidth="2" />
          <rect x="8" y="10" width="30" height="52" rx="2" fill="#e8eaee" />
          <circle cx="23" cy="72" r="3" fill="#e8eaee" />
        </svg>
      </motion.div>
    </div>
  );
}

export function LabelVisual({ printed }: { printed: boolean }) {
  return (
    <div className="mx-auto flex w-[280px] flex-col items-center" aria-hidden={!printed}>
      <div className="h-3 w-[200px] rounded-t bg-[#1b1e24]" />
      <div className="h-2 w-[220px] bg-[#2b6cb0]" />
      <div className="relative h-[132px] w-full overflow-hidden">
        <motion.div
          className="absolute left-1/2 w-[210px] -translate-x-1/2 border-[3px] border-[#1f2430] bg-white p-3 text-[#1f2430]"
          initial={false}
          animate={printed ? { y: 8 } : { y: -120 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] font-bold tracking-[0.12em]">SD SOLUTIONS</p>
          <p className="mt-1 text-[16px] font-bold">REPARASJON #{MOCK_TICKET}</p>
          <p className="mt-0.5 text-[14px] font-semibold">{MOCK_DEVICE}</p>
          <div className="mt-2 h-5 w-full bg-[repeating-linear-gradient(90deg,#1f2430_0_2px,transparent_2px_4px)]" />
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
    <div
      className="mx-auto grid w-[300px] grid-cols-2 gap-2 border-[3px] border-[#1f2430] bg-white p-3"
      aria-hidden
    >
      {bays.map((id) => {
        const open = openId === id;
        const hi = highlightId === id;
        const filled = occupied.includes(id) && !open;
        return (
          <div key={id} className="relative h-[78px] overflow-hidden bg-[#e8eaee]">
            <div className="absolute inset-1 bg-white" />
            {filled ? (
              <div className="absolute inset-x-4 inset-y-5 bg-[#2b6cb0]" />
            ) : null}
            <motion.div
              className="absolute inset-0 origin-left border-[3px] border-[#1f2430] bg-[#1b1e24]"
              initial={false}
              animate={{ rotateY: open ? -62 : 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <span
                className={[
                  "absolute left-2 top-1.5 text-[13px] font-bold",
                  hi ? "text-white" : "text-white/80",
                ].join(" ")}
              >
                {id}
              </span>
              <span className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#2b6cb0]" />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

export function ParcelOutVisual({ visible }: { visible: boolean }) {
  return (
    <div className="relative mx-auto h-[100px] w-[160px]" aria-hidden>
      <motion.div
        className="absolute left-1/2 top-2 h-[88px] w-[52px] -translate-x-1/2"
        initial={false}
        animate={visible ? { y: -6, opacity: 1 } : { y: 36, opacity: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox="0 0 52 88" className="h-full w-full">
          <rect x="2" y="2" width="48" height="84" rx="3" fill="#ffffff" stroke="#1f2430" strokeWidth="3" />
          <rect x="8" y="10" width="36" height="18" rx="1" fill="#1b1e24" />
          <text x="26" y="22" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="700">
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
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#2f855a] bg-white"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35 }}
      aria-hidden
    >
      <motion.svg viewBox="0 0 48 48" className="h-9 w-9">
        <motion.path
          d="M12 25 L20 33 L36 15"
          fill="none"
          stroke="#2f855a"
          strokeWidth="4"
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
