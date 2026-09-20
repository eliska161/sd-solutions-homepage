"use client";

export function ProgressDots({
  step,
  total = 5,
}: {
  step: number;
  total?: number;
}) {
  return (
    <ol
      className="flex items-center gap-2"
      aria-label={`Steg ${step} av ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li
            key={n}
            aria-current={active ? "step" : undefined}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full border-[3px] text-[13px] font-bold",
              active
                ? "border-[#1e4e82] bg-[#2b6cb0] text-white"
                : done
                  ? "border-[#1e4e82] bg-[#d6e4f3] text-[#1e4e82]"
                  : "border-[#1f2430] bg-white text-[#1f2430]",
            ].join(" ")}
          >
            {n}
          </li>
        );
      })}
    </ol>
  );
}
