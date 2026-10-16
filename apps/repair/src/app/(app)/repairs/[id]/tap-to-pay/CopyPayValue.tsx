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
      className="w-full rounded border border-border bg-white px-4 py-3 text-left hover:bg-black/[0.03]"
      onClick={() => navigator.clipboard.writeText(value)}
    >
      <span className="block text-[12px] text-muted">{label}</span>
      <span className="mt-0.5 block font-mono text-[22px] font-semibold tracking-wide">
        {value}
      </span>
      <span className="mt-1 block text-[12px] text-muted">Trykk for å kopiere</span>
    </button>
  );
}
