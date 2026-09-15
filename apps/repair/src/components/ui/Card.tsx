import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["overflow-hidden rounded border border-border bg-surface shadow-sm", className].join(
        " ",
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 bg-[#1b1e24] px-4 py-2.5 text-white sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[12px] text-white/65">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={["px-4 py-3", className].join(" ")}>{children}</div>;
}
