"use client";

import { useId } from "react";
import { motion } from "framer-motion";

const drop = {
  duration: 3.2,
  repeat: Infinity,
  ease: [0.22, 1, 0.36, 1] as const,
  repeatDelay: 0.7,
};

function BubbleField({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const dots: Array<{ cx: number; cy: number; r: number }> = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 9; col++) {
      dots.push({
        cx: x + 14 + col * ((w - 20) / 8),
        cy: y + 16 + row * ((h - 24) / 6),
        r: row % 2 === col % 2 ? 4.2 : 3.4,
      });
    }
  }
  return (
    <g fill="#c5d4e6" opacity="0.9">
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} />
      ))}
    </g>
  );
}

function PaddedMailer({
  className,
  sealOpen,
}: {
  className?: string;
  sealOpen?: boolean;
}) {
  const clip = `pouch${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 280 168" className={className}>
      <rect x="28" y="36" width="224" height="124" rx="18" fill="#f4f6f8" stroke="#1f2430" strokeWidth="3" />
      <clipPath id={clip}>
        <rect x="34" y="54" width="212" height="100" rx="12" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x="34" y="54" width="212" height="100" fill="#eef2f6" />
        <BubbleField x={34} y={54} w={212} h={100} />
      </g>
      <rect x="40" y="40" width="200" height="16" rx="4" fill="#d7dee8" stroke="#1f2430" strokeWidth="2" />
      <motion.g
        animate={
          sealOpen
            ? { y: [0, 0, 14, 14, 0], rotate: [0, 0, 0, 0, 0] }
            : undefined
        }
        transition={sealOpen ? { ...drop, times: [0, 0.42, 0.58, 0.86, 1] } : undefined}
        style={{ transformOrigin: "140px 48px" }}
      >
        <rect x="48" y="32" width="184" height="18" rx="3" fill="#2b6cb0" stroke="#1f2430" strokeWidth="2" />
        <rect x="56" y="37" width="168" height="4" rx="1" fill="#d6e4f3" />
      </motion.g>
    </svg>
  );
}

export function EnvelopeVisual() {
  return (
    <div className="relative mx-auto h-[250px] w-[300px]" aria-hidden>
      <motion.p
        className="absolute left-0 right-0 top-0 text-center text-[18px] font-bold text-[#2b6cb0]"
        animate={{ opacity: [0.25, 1, 0.25] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        Ned i åpningen
      </motion.p>
      <div className="absolute inset-x-0 bottom-0 h-[168px] overflow-hidden">
        <PaddedMailer className="h-full w-full" sealOpen />
      </div>
      <div className="absolute left-1/2 top-7 h-[150px] w-[72px] -translate-x-1/2 overflow-hidden">
        <motion.div
          className="absolute left-1/2 w-[56px] -translate-x-1/2"
          animate={{ y: [-8, 78, 96], opacity: [1, 1, 0] }}
          transition={{ ...drop, times: [0, 0.48, 0.72] }}
        >
          <svg viewBox="0 0 56 104" className="h-[104px] w-full">
            <rect x="3" y="3" width="50" height="98" rx="10" fill="#1b1e24" stroke="#1f2430" strokeWidth="3" />
            <rect x="9" y="12" width="38" height="64" rx="3" fill="#e8eaee" />
            <circle cx="28" cy="88" r="4" fill="#e8eaee" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

export function LabelVisual({
  printed,
  ticket,
  device,
  phone,
  issue,
  parts = [],
}: {
  printed: boolean;
  ticket: string;
  device: string;
  phone?: string;
  issue?: string;
  parts?: string[];
}) {
  const clip = `mailer${useId().replace(/:/g, "")}`;
  const partLine = parts[0] ?? "Ikke valgt ennå";
  return (
    <div className="mx-auto flex w-[420px] items-end gap-5" aria-hidden>
      <div className="flex w-[186px] flex-col items-center">
        <div className="h-4 w-[148px] rounded-t bg-[#1b1e24]" />
        <motion.div
          className="h-3 w-[164px] bg-[#2b6cb0]"
          animate={printed ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
          transition={{ duration: 0.7, repeat: Infinity }}
        />
        <div className="relative h-[188px] w-full overflow-hidden border-x-[3px] border-b-[3px] border-[#1f2430] bg-[#e8eaee]">
          <motion.div
            className="absolute left-1/2 w-[164px] -translate-x-1/2 border-[3px] border-[#1f2430] bg-white p-2 text-[#1f2430]"
            initial={false}
            animate={printed ? { y: 8 } : { y: -190 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-center text-[9px] font-bold tracking-[0.14em]">SD SOLUTIONS</p>
            <div className="mt-1 h-7 w-full bg-[repeating-linear-gradient(90deg,#1f2430_0_2px,transparent_2px_3px)]" />
            <p className="text-center text-[12px] font-bold tracking-wide">{ticket}</p>
            <p className="mt-0.5 text-[9px] font-semibold leading-tight">{phone ?? ""}</p>
            <p className="text-[10px] font-bold leading-tight">{device}</p>
            {issue ? <p className="text-[9px] font-semibold leading-tight">Feil: {issue}</p> : null}
            <p className="mt-0.5 border-t border-[#1f2430] pt-0.5 text-[8px] font-bold leading-tight">
              {partLine}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="relative h-[210px] w-[210px]">
        <svg viewBox="0 0 210 210" className="h-full w-full">
          <rect x="18" y="48" width="174" height="148" rx="16" fill="#f4f6f8" stroke="#1f2430" strokeWidth="3" />
          <clipPath id={clip}>
            <rect x="26" y="68" width="158" height="118" rx="10" />
          </clipPath>
          <g clipPath={`url(#${clip})`}>
            <rect x="26" y="68" width="158" height="118" fill="#eef2f6" />
            <BubbleField x={26} y={68} w={158} h={118} />
          </g>
          <rect x="32" y="52" width="146" height="14" rx="3" fill="#2b6cb0" stroke="#1f2430" strokeWidth="2" />
        </svg>
        {printed ? (
          <motion.div
            className="absolute left-[42px] w-[126px] border-[3px] border-[#1f2430] bg-white px-1.5 py-1 text-[#1f2430]"
            animate={{ y: [12, 92, 92], rotate: [-8, 0, 0], opacity: [0, 1, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.6, times: [0, 0.4, 1] }}
          >
            <div className="h-4 w-full bg-[repeating-linear-gradient(90deg,#1f2430_0_2px,transparent_2px_3px)]" />
            <p className="text-[9px] font-bold">{ticket}</p>
            <p className="text-[10px] font-bold leading-tight">{device}</p>
            <p className="text-[8px] font-semibold leading-tight">{partLine}</p>
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
            className={["relative h-[88px] overflow-hidden bg-[#e8eaee]", hi ? "ring-4 ring-[#2b6cb0]" : ""].join(
              " ",
            )}
          >
            <div className="absolute inset-1 bg-white" />
            {filled ? <div className="absolute inset-x-5 inset-y-6 rounded-sm bg-[#2b6cb0]" /> : null}
            {hi && action === "insert" && open ? (
              <motion.div
                className="absolute left-1/2 top-1 h-[70px] w-[48px] -translate-x-1/2"
                animate={{ y: [-46, 16], opacity: [0.15, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <EnvelopeMini />
              </motion.div>
            ) : null}
            {hi && action === "retrieve" && open ? (
              <motion.div
                className="absolute left-1/2 top-1 h-[70px] w-[48px] -translate-x-1/2"
                animate={{ y: [16, -48], opacity: [1, 0.12] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
              <span className="absolute left-2 top-1.5 text-[18px] font-bold text-white">{id}</span>
              <motion.span
                className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[#2b6cb0]"
                animate={hi ? { scale: [1, 1.28, 1] } : { scale: 1 }}
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
    <svg viewBox="0 0 48 70" className="h-full w-full">
      <rect x="2" y="8" width="44" height="58" rx="8" fill="#f4f6f8" stroke="#1f2430" strokeWidth="2" />
      <circle cx="12" cy="28" r="3" fill="#c5d4e6" />
      <circle cx="24" cy="28" r="3" fill="#c5d4e6" />
      <circle cx="36" cy="28" r="3" fill="#c5d4e6" />
      <circle cx="18" cy="40" r="3" fill="#c5d4e6" />
      <circle cx="30" cy="40" r="3" fill="#c5d4e6" />
      <circle cx="24" cy="52" r="3" fill="#c5d4e6" />
      <rect x="8" y="4" width="32" height="10" rx="2" fill="#2b6cb0" stroke="#1f2430" strokeWidth="2" />
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
