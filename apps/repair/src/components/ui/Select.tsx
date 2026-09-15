import type { SelectHTMLAttributes } from "react";

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={[
        "h-9 w-full rounded border border-border bg-white px-2.5 text-sm text-foreground outline-none focus:border-accent",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </select>
  );
}
