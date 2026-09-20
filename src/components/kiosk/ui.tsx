"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import { ProgressDots } from "@/components/kiosk/ProgressDots";

export function KioskButton({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "home";
  disabled?: boolean;
}) {
  const styles = {
    primary:
      "h-[72px] bg-[#3ecf86] text-[#0c0e0d] active:bg-[#36bf7b]",
    ghost:
      "h-[64px] border border-white/12 bg-white/[0.04] text-white active:bg-white/[0.08]",
    home:
      "h-[118px] border border-white/10 bg-[#161b18] text-white active:border-[#3ecf86]/50 active:bg-[#1c2420]",
  } as const;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "w-full rounded-2xl text-[20px] font-semibold tracking-[0.02em]",
        "disabled:pointer-events-none disabled:opacity-40",
        styles[variant],
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ScreenFrame({
  children,
  progress,
  onCancel,
}: {
  children: ReactNode;
  progress?: number;
  onCancel?: () => void;
}) {
  return (
    <div className="flex h-full flex-col px-8 py-5">
      <div className="flex h-8 items-center justify-between">
        {progress ? <ProgressDots step={progress} /> : <span />}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-3 py-1 text-[13px] text-white/45 active:text-white"
          >
            Avbryt
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function KioskLogo({
  onClick,
  compact = false,
}: {
  onClick?: () => void;
  compact?: boolean;
}) {
  const inner = (
    <>
      <Image
        src="/sd-solutions-mark.png"
        alt=""
        width={96}
        height={96}
        className={compact ? "h-8 w-8" : "h-12 w-12"}
        priority
      />
      <span className="text-left">
        <span className={compact ? "block text-[13px] font-medium" : "block text-[17px] font-medium tracking-[0.02em]"}>
          SD Solutions
        </span>
        <span className="block text-[11px] tracking-[0.18em] text-white/45">
          LOCKER
        </span>
      </span>
    </>
  );

  if (!onClick) {
    return <span className="inline-flex items-center gap-3">{inner}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-xl px-2 py-1 active:bg-white/[0.04]"
      aria-label="SD Solutions administrasjon"
    >
      {inner}
    </button>
  );
}
