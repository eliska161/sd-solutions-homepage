import type { ReactNode } from "react";

const tones = {
  default: "bg-white/[0.06] text-foreground",
  muted: "bg-white/[0.04] text-muted",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
} as const;

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
