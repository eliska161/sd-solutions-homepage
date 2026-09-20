"use client";

import { Delete, Eraser } from "lucide-react";

export function PinPad({
  value,
  length = 6,
  onChange,
  disabled,
}: {
  value: string;
  length?: number;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  function press(digit: string) {
    if (disabled) return;
    if (value.length >= length) return;
    onChange(value + digit);
  }

  function backspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }

  function clear() {
    if (disabled) return;
    onChange("");
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

  return (
    <div className="flex w-full max-w-[340px] flex-col items-center gap-3">
      <div className="flex items-center gap-2.5" aria-label="PIN">
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={[
              "h-3.5 w-3.5 rounded-full border",
              i < value.length
                ? "border-[#3ecf86] bg-[#3ecf86]"
                : "border-white/25 bg-transparent",
            ].join(" ")}
          />
        ))}
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => press(key)}
            className="h-[54px] rounded-xl bg-white/[0.06] text-[22px] font-medium text-white active:bg-white/[0.14] disabled:opacity-40"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={clear}
          className="flex h-[54px] items-center justify-center rounded-xl bg-white/[0.04] text-white/70 active:bg-white/[0.1]"
          aria-label="Tøm"
        >
          <Eraser size={20} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => press("0")}
          className="h-[54px] rounded-xl bg-white/[0.06] text-[22px] font-medium text-white active:bg-white/[0.14]"
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={backspace}
          className="flex h-[54px] items-center justify-center rounded-xl bg-white/[0.04] text-white/70 active:bg-white/[0.1]"
          aria-label="Slett"
        >
          <Delete size={20} />
        </button>
      </div>
    </div>
  );
}
