"use client";

import { motion } from "framer-motion";

const loop = {
  duration: 2.4,
  repeat: Infinity,
  ease: [0.22, 1, 0.36, 1] as const,
  repeatDelay: 0.45,
};

export function EnvelopeVisual() {
  return (
    <div className="relative mx-auto h-[210px] w-[280px]" aria-hidden>
      <motion.div
        className="absolute left-1/2 top-1 -translate-x-1/2 text-[22px] font-bold text-[#2b6cb0]"
        animate={{ y: [0, 8, 0], opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      >
        ↓
      </motion.div>
      <motion.div
        className="absolute left-1/2 top-8 h-[96px] w-[52px] -translate-x-1/2"
        animate={{ y: [0, 78, 86], opacity: [1, 1, 0] }}
        transition={{ ...loop, times: [0, 0.55, 1] }}
      >
        <svg viewBox="0 0 52 96" className="h-full w-full">
          <rect x="3" y="4" width="46" height="88" rx="7" fill="#1b1e24" stroke="#1f2430" strokeWidth="3" />
          <rect x="9" y="12" width="34" height="58" rx="2" fill="#e8eaee" />
          <circle cx="26" cy="80" r="4" fill="#e8eaee" />
        </svg>
      </motion.div>
      <svg viewBox="0 0 280 140" className="absolute bottom-0 h-[140px] w-full">
        <rect
          x="16"
          y="38"
          width="248"
          height="92"
          rx="4"
          fill="#ffffff"
          stroke="#1f2430"
          strokeWidth="3"
        />
        <motion.path
          d="M16 42 L140 18 L264 42"
          fill="#d6e4f3"
          stroke="#1f2430"
          strokeWidth="3"
          animate={{ d: ["M16 42 L140 18 L264 42", "M16 42 L140 18 L264 42", "M16 42 L140 92 L264 42"] }}
          transition={{ ...loop, times: [0, 0.45, 1] }}
        />
        <text
          x="140"
          y="108"
          textAnchor="middle"
          fill="#1f2430"
          fontSize="16"
          fontWeight="700"
        >
          SD SOLUTIONS
        </text>
      </svg>
    </div>
  );
}

export function LabelVisual({
  printed,
  ticket,
  device,
}: {
  printed: boolean;
  ticket: string;
  device: string;
}) {
  return (
    <div className="mx-auto flex w-[340px] items-end gap-4" aria-hidden>
      <div className="flex w-[150px] flex-col items-center">
        <div className="h-4 w-[118px] rounded-t bg-[#1b1e24]" />
        <motion.div
          className="h-3 w-[132px] bg-[#2b6cb0]"
          animate={printed ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
          transition={{ duration: 0.7, repeat: Infinity }}
        />
        <div className="relative h-[128px] w-full overflow-hidden border-x-[3px] border-b-[3px] border-[#1f2430] bg-[#e8eaee]">
          <motion.div
            className="absolute left-1/2 w-[124px] -translate-x-1/2 border-[3px] border-[#1f2430] bg-white p-2 text-[#1f2430]"
            initial={false}
            animate={printed ? { y: 10 } : { y: -130 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10px] font-bold tracking-[0.12em]">SD SOLUTIONS</p>
            <p className="text-[13px] font-bold">#{ticket}</p>
            <p className="text-[12px] font-semibold">{device}</p>
            <div className="mt-1 h-4 w-full bg-[repeating-linear-gradient(90deg,#1f2430_0_2px,transparent_2px_4px)]" />
          </motion.div>
        </div>
      </div>

      <div className="relative h-[168px] w-[170px]">
        <svg viewBox="0 0 170 168" className="h-full w-full">
          <rect x="8" y="58" width="154" height="96" rx="4" fill="#fff" stroke="#1f2430" strokeWidth="3" />
          <path d="M8 70 L85 118 L162 70" fill="none" stroke="#2b6cb0" strokeWidth="3" />
        </svg>
        {printed ? (
          <motion.div
            className="absolute left-[28px] w-[114px] border-[3px] border-[#1f2430] bg-white px-1.5 py-1 text-[#1f2430]"
            animate={{ y: [8, 78, 78], rotate: [-8, 0, 0], opacity: [0, 1, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 0.5, times: [0, 0.45, 1] }}
          >
            <p className="text-[9px] font-bold">#{ticket}</p>
            <p className="text-[11px] font-bold leading-tight">{device}</p>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export function LockerVisual({
  openId,
  highlightId,
  occupied = [3],
  action = "none",
}: {
  openId?: number | null;
  highlightId?: number;
  occupied?: number[];
  action?: "none" | "insert" | "retrieve";
}) {
  const bays = [1, 2, 3, 4];
  return (
    <div
      className="relative mx-auto grid w-[340px] grid-cols-2 gap-2 border-[3px] border-[#1f2430] bg-white p-3"
      aria-hidden
    >
      {bays.map((id) => {
        const open = openId === id;
        const hi = highlightId === id;
        const filled = occupied.includes(id) && !open;
        return (
          <div
            key={id}
            className={[
              "relative h-[88px] overflow-hidden bg-[#e8eaee]",
              hi ? "ring-4 ring-[#2b6cb0]" : "",
            ].join(" ")}
          >
            <div className="absolute inset-1 bg-white" />
            {filled ? (
              <div className="absolute inset-x-5 inset-y-6 bg-[#2b6cb0]" />
            ) : null}
            {hi && action === "insert" && open ? (
              <motion.div
                className="absolute left-1/2 top-2 h-[64px] w-[36px] -translate-x-1/2"
                animate={{ y: [-40, 18], opacity: [0.2, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.35 }}
              >
                <EnvelopeMini />
              </motion.div>
            ) : null}
            {hi && action === "retrieve" && open ? (
              <motion.div
                className="absolute left-1/2 top-2 h-[64px] w-[36px] -translate-x-1/2"
                animate={{ y: [18, -42], opacity: [1, 0.15] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.35 }}
              >
                <EnvelopeMini />
              </motion.div>
            ) : null}
            <motion.div
              className="absolute inset-0 origin-left border-[3px] border-[#1f2430] bg-[#1b1e24]"
              initial={false}
              animate={{ x: open ? "-78%" : "0%" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="absolute left-2 top-1.5 text-[18px] font-bold text-white">
                {id}
              </span>
              <motion.span
                className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[#2b6cb0]"
                animate={hi ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

function EnvelopeMini() {
  return (
    <svg viewBox="0 0 36 64" className="h-full w-full">
      <rect x="1" y="1" width="34" height="62" rx="2" fill="#fff" stroke="#1f2430" strokeWidth="2" />
      <path d="M1 10 L18 28 L35 10" fill="none" stroke="#2b6cb0" strokeWidth="2" />
    </svg>
  );
}

export function CheckVisual() {
  return (
    <motion.div
      className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] border-[#2f855a] bg-white"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: [0.6, 1.08, 1], opacity: 1 }}
      transition={{ duration: 0.5 }}
      aria-hidden
    >
      <motion.svg viewBox="0 0 48 48" className="h-12 w-12">
        <motion.path
          d="M12 25 L20 33 L36 15"
          fill="none"
          stroke="#2f855a"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        />
      </motion.svg>
    </motion.div>
  );
}
