import type { ReactNode } from "react";

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded border border-border bg-surface shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#1b1e24] text-[12px] font-semibold text-white">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">{children}</tbody>
      </table>
    </div>
  );
}

export function DataRow({
  children,
}: {
  children: ReactNode;
  href?: string;
}) {
  return <tr className="hover:bg-black/[0.03]">{children}</tr>;
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={["px-3 py-2.5 align-middle text-foreground", className].join(" ")}>
      {children}
    </td>
  );
}
