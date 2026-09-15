import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "h-9 w-full rounded border border-border bg-white px-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
