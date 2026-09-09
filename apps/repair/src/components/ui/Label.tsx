import type { LabelHTMLAttributes, ReactNode } from "react";

export function Label({
  children,
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) {
  return (
    <label
      className={["block text-sm text-muted", className].join(" ")}
      {...props}
    >
      {children}
    </label>
  );
}
