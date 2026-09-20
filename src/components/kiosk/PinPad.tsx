"use client";

import { Delete, Eraser } from "lucide-react";
import { formatNoMobile } from "@/lib/kiosk/mock";

export function PinPad({
  value,
  length = 6,
  onChange,
  disabled,
  mode = "pin",
}: {
  value: string;
  length?: number;
  onChange: (next: string) => void;
  disabled?: boolean;
  mode?: "pin" | "phone";
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
  const keyClass =
    "h-[64px] rounded border-[3px] border-[#1f2430] bg-white text-[26px] font-bold text-[#1f2430] active:bg-[#d5d8de] disabled:opacity-40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#1e4e82]";

  return (
    <div className="flex w-full max-w-[340px] flex-col items-center gap-3">
      {mode === "phone" ? (
        <p
          className="min-h-[48px] text-[32px] font-bold tabular-nums tracking-wide"
          aria-label={`${value.length} av ${length} siffer skrevet inn`}
          role="status"
        >
          {value.length === 0 ? (
            <span className="text-[#8b93a3]">+47 •••• ••••</span>
          ) : (
            formatNoMobile(value)
          )}
        </p>
      ) : (
        <div
          className="flex items-center gap-2.5"
          aria-label={`${value.length} av ${length} siffer skrevet inn`}
          role="status"
        >
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={[
                "h-5 w-5 rounded-full border-[3px]",
                i < value.length
                  ? "border-[#1e4e82] bg-[#2b6cb0]"
                  : "border-[#1f2430] bg-white",
              ].join(" ")}
            />
          ))}
        </div>
      )}
      <div className="grid w-full grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => press(key)}
            className={keyClass}
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={clear}
          className={`${keyClass} text-[15px]`}
          aria-label={mode === "phone" ? "Tøm nummer" : "Tøm PIN"}
        >
          <Eraser size={22} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => press("0")}
          className={keyClass}
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={backspace}
          className={keyClass}
          aria-label="Slett siste siffer"
        >
          <Delete size={22} />
        </button>
      </div>
    </div>
  );
}
