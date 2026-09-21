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
  variant?: "primary" | "ghost" | "home" | "homeAlt";
  disabled?: boolean;
}) {
  const styles = {
    primary:
      "h-[76px] border-[3px] border-[#1e4e82] bg-[#2b6cb0] text-white active:bg-[#245a96]",
    ghost:
      "h-[68px] border-[3px] border-[#1f2430] bg-white text-[#1f2430] active:bg-[#e8eaee]",
    home:
      "h-[124px] border-[3px] border-[#1e4e82] bg-[#2b6cb0] text-white active:bg-[#245a96]",
    homeAlt:
      "h-[124px] border-[3px] border-[#1b1e24] bg-[#1b1e24] text-white active:bg-[#2a2e38]",
  } as const;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "w-full rounded text-[26px] font-bold tracking-[0.02em]",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]",
        "disabled:pointer-events-none disabled:opacity-50",
        styles[variant],
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ChoiceGrid({
  options,
  onPick,
}: {
  options: readonly string[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-auto">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className="min-h-[72px] border-[3px] border-[#1f2430] bg-white px-3 text-[22px] font-bold active:bg-[#d5d8de] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function CommentList({
  options,
  onPick,
}: {
  options: readonly string[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 content-start gap-3 overflow-auto">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className="min-h-[84px] border-[3px] border-[#1f2430] bg-white px-5 text-left text-[26px] font-bold active:bg-[#d5d8de] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
        >
          {option}
        </button>
      ))}
    </div>
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
    <div className="flex h-full flex-col px-6 py-4">
      <div className="flex h-10 items-center justify-between gap-3">
        {progress ? <ProgressDots step={progress} /> : <span />}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
                className="h-11 min-w-[96px] rounded border-[3px] border-[#1f2430] bg-white px-4 text-[16px] font-bold text-[#1f2430] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#1e4e82]"
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
        className={compact ? "h-8 w-8" : "h-9 w-9"}
        priority
      />
      <span className="text-left leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">
          SD Solutions
        </span>
        <span className="block text-[11px] font-semibold tracking-[0.16em] text-white/80">
          LOCKER
        </span>
      </span>
    </>
  );

  if (!onClick) {
    return <span className="inline-flex items-center gap-2.5">{inner}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2.5 rounded px-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
      aria-label="Åpne administrasjon"
    >
      {inner}
    </button>
  );
}
