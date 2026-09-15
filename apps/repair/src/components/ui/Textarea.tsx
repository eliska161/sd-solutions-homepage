import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={[
        "min-h-24 w-full rounded border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
