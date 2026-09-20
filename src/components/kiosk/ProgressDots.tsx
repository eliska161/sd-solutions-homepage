"use client";

export function ProgressDots({
  step,
  total = 5,
}: {
  step: number;
  total?: number;
}) {
  return (
    <ol className="flex items-center gap-2" aria-label={`Steg ${step} av ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li
            key={n}
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium",
              active
                ? "bg-[#3ecf86] text-[#0c0e0d]"
                : done
                  ? "bg-[#3ecf86]/25 text-[#3ecf86]"
                  : "bg-white/[0.06] text-white/35",
            ].join(" ")}
          >
            {n}
          </li>
        );
      })}
    </ol>
  );
}
