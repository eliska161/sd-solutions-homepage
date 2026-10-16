"use client";

export function CopyPayValue({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <button
      type="button"
      className="rounded border border-border bg-white px-3 py-2 text-left text-sm hover:bg-black/[0.03]"
      onClick={() => navigator.clipboard.writeText(value)}
    >
      <span className="block text-[12px] text-muted">{label}</span>
      <span className="font-mono text-[16px] font-semibold">{value}</span>
    </button>
  );
}
