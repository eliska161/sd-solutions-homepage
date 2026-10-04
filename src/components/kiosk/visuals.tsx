"use client";

import { useId } from "react";
import { motion } from "framer-motion";

const drop = {
  duration: 2.8,
  repeat: Infinity,
  ease: [0.22, 1, 0.36, 1] as const,
  repeatDelay: 0.55,
};

function compactDevice(
  device: string,
  model?: string | null,
  storage?: string | null,
  color?: string | null,
) {
  let name = (model || device || "").replace(/\s+/g, " ").trim();
  for (const extra of [storage, color]) {
    const bit = extra?.replace(/\s+/g, " ").trim();
    if (bit && !name.toLowerCase().includes(bit.toLowerCase())) {
      name = `${name} ${bit}`;
    }
  }
  return name;
}

function BubbleField({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const dots: Array<{ cx: number; cy: number; r: number }> = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      dots.push({
        cx: x + 16 + col * ((w - 24) / 7),
        cy: y + 18 + row * ((h - 28) / 5),
        r: row % 2 === col % 2 ? 4 : 3.2,
      });
    }
  }
  return (
    <g fill="#c5d4e6">
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} />
      ))}
    </g>
  );
}

function MailerBody({
  clipId,
  x,
  y,
  w,
  h,
}: {
  clipId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="16" fill="#f4f6f8" stroke="#1f2430" strokeWidth="3" />
      <clipPath id={clipId}>
        <rect x={x + 8} y={y + 22} width={w - 16} height={h - 30} rx="10" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x={x + 8} y={y + 22} width={w - 16} height={h - 30} fill="#e8eef4" />
        <BubbleField x={x + 8} y={y + 22} w={w - 16} h={h - 30} />
      </g>
      <rect
        x={x + 18}
        y={y + 6}
        width={w - 36}
        height="16"
        rx="3"
        fill="#2b6cb0"
        stroke="#1f2430"
        strokeWidth="2"
      />
    </>
  );
}

export function EnvelopeVisual() {
  const clip = `pouch${useId().replace(/:/g, "")}`;
  return (
    <div className="relative mx-auto h-[230px] w-[300px] overflow-hidden" aria-hidden>
      <p className="absolute left-0 right-0 top-0 text-center text-[18px] font-bold text-[#2b6cb0]">
        Ned i åpningen
      </p>
      <svg viewBox="0 0 300 168" className="absolute bottom-0 h-[168px] w-full">
        <MailerBody clipId={clip} x={28} y={8} w={244} h={152} />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-6 h-[150px] overflow-hidden">
        <motion.div
          className="absolute left-1/2 w-[56px] -translate-x-1/2"
          animate={{ y: [0, 92, 118], opacity: [1, 1, 0] }}
          transition={{ ...drop, times: [0, 0.55, 1] }}
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

function MiniSticker({
  ticket,
  device,
}: {
  ticket: string;
  device?: string;
}) {
  return (
    <div className="border-[3px] border-[#1f2430] bg-white px-1.5 py-1 text-[#1f2430]">
      <div className="h-3.5 w-full bg-[repeating-linear-gradient(90deg,#1f2430_0_2px,transparent_2px_3px)]" />
      <p className="text-center text-[11px] font-bold leading-none">{ticket}</p>
      {device ? (
        <p className="truncate text-center text-[8px] font-semibold leading-tight">{device}</p>
      ) : null}
    </div>
  );
}

export function LabelVisual({
  printed,
  ticket,
  device,
  model,
  storage,
  color,
  phone,
  issue,
  parts = [],
}: {
  printed: boolean;
  ticket: string;
  device: string;
  model?: string | null;
  storage?: string | null;
  color?: string | null;
  phone?: string;
  issue?: string;
  parts?: string[];
}) {
  const clip = `mailer${useId().replace(/:/g, "")}`;
  const name = compactDevice(device, model, storage, color);
  const grade = parts.find((row) => row.trim() && !/ikke valgt/i.test(row)) ?? "";
  return (
    <div className="mx-auto flex h-[220px] w-[440px] items-end justify-center gap-6 overflow-hidden" aria-hidden>
      <div className="flex w-[176px] flex-col items-center">
        <div className="h-4 w-[140px] rounded-t bg-[#1b1e24]" />
        <motion.div
          className="h-3 w-[156px] bg-[#2b6cb0]"
          animate={printed ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
          transition={{ duration: 0.7, repeat: Infinity }}
        />
        <div className="relative h-[168px] w-full overflow-hidden border-x-[3px] border-b-[3px] border-[#1f2430] bg-[#e8eaee]">
          <motion.div
            className="absolute left-1/2 w-[150px] -translate-x-1/2 border-[3px] border-[#1f2430] bg-white p-2 text-[#1f2430]"
            initial={false}
            animate={printed ? { y: 10 } : { y: -180 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-center text-[8px] font-bold tracking-[0.12em]">SD SOLUTIONS</p>
            <div className="mt-1 h-6 w-full bg-[repeating-linear-gradient(90deg,#1f2430_0_2px,transparent_2px_3px)]" />
            <p className="text-center text-[12px] font-bold tracking-wide">{ticket}</p>
            {phone ? (
              <p className="mt-0.5 truncate text-center text-[9px] font-semibold">{phone}</p>
            ) : null}
            <p className="truncate text-center text-[10px] font-bold leading-tight">{name}</p>
            {issue ? (
              <p className="truncate text-center text-[9px] font-semibold leading-tight">{issue}</p>
            ) : null}
            {grade ? (
              <p className="truncate text-center text-[8px] font-bold leading-tight">{grade}</p>
            ) : null}
          </motion.div>
        </div>
      </div>

      <div className="relative h-[210px] w-[210px] overflow-hidden">
        <svg viewBox="0 0 210 210" className="h-full w-full">
          <MailerBody clipId={clip} x={18} y={36} w={174} h={164} />
        </svg>
        {printed ? (
          <motion.div
            className="absolute left-[48px] w-[114px]"
            animate={{ y: [18, 96, 96], rotate: [-10, 0, 0], opacity: [0, 1, 1] }}
            transition={{ duration: 2.1, repeat: Infinity, repeatDelay: 0.7, times: [0, 0.42, 1] }}
          >
            <MiniSticker ticket={ticket} device={name} />
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
      className="relative mx-auto grid w-[340px] grid-cols-2 gap-2 overflow-hidden border-[3px] border-[#1f2430] bg-white p-3"
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
