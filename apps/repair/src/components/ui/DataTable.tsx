import type { ReactNode } from "react";

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-elevated text-[12px] text-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">{children}</tbody>
      </table>
    </div>
  );
}

export function DataRow({
  children,
  href,
}: {
  children: ReactNode;
  href?: string;
}) {
  if (href) {
    return (
      <tr className="cursor-pointer transition-colors hover:bg-white/[0.03]">
        {children}
      </tr>
    );
  }
  return <tr className="transition-colors hover:bg-white/[0.02]">{children}</tr>;
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={["px-4 py-3 align-middle text-foreground", className].join(" ")}>
      {children}
    </td>
  );
}
