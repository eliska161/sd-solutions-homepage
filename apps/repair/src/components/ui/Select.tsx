import type { SelectHTMLAttributes } from "react";

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={[
        "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-white/25",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </select>
  );
}
