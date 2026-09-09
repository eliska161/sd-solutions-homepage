import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-white text-black hover:bg-white/90 disabled:opacity-60",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-white/[0.04] disabled:opacity-60",
  ghost:
    "text-muted hover:bg-white/[0.04] hover:text-foreground disabled:opacity-60",
  danger:
    "bg-danger/15 text-danger hover:bg-danger/25 disabled:opacity-60",
  accent:
    "bg-accent text-black hover:bg-accent/90 disabled:opacity-60",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
} as const;

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
