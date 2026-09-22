"use client";

const ROWS = ["1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const;

export function IdentifierPad({
  value,
  onChange,
  disabled,
  maxLength = 15,
  withSpace = false,
  placeholder = "IMEI eller serienummer",
  extras = [],
  letterCase = "upper",
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  maxLength?: number;
  withSpace?: boolean;
  placeholder?: string;
  extras?: readonly string[];
  letterCase?: "upper" | "lower";
}) {
  function press(ch: string) {
    if (disabled) return;
    if (value.length >= maxLength) return;
    const next = letterCase === "lower" ? ch.toLowerCase() : ch;
    onChange(value + next);
  }

  const keyClass =
    "min-h-[48px] rounded border-[3px] border-[#1f2430] bg-white text-[20px] font-bold text-[#1f2430] active:bg-[#d5d8de] disabled:opacity-40 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-1 focus-visible:outline-[#1e4e82]";

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-2">
      <p
        className="min-h-[44px] w-full break-all text-center text-[28px] font-bold tracking-[0.08em]"
        aria-label={`${value.length} tegn skrevet inn`}
        role="status"
      >
        {value ? (
          value
        ) : (
          <span className="tracking-normal text-[#8b93a3]">{placeholder}</span>
        )}
      </p>
      <div className="flex w-full flex-col gap-1.5">
        {ROWS.map((row) => (
          <div key={row} className="grid grid-cols-10 gap-1.5">
            {row.split("").map((ch) => {
              const label = letterCase === "lower" ? ch.toLowerCase() : ch;
              return (
                <button
                  key={ch}
                  type="button"
                  disabled={disabled}
                  onClick={() => press(label)}
                  className={keyClass}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
        <div className={`grid gap-1.5 ${withSpace || extras.length ? "grid-cols-6" : "grid-cols-5"}`}>
          {["Æ", "Ø", "Å"].map((ch) => {
            const label = letterCase === "lower" ? ch.toLowerCase() : ch;
            return (
              <button
                key={ch}
                type="button"
                disabled={disabled}
                onClick={() => press(label)}
                className={keyClass}
              >
                {label}
              </button>
            );
          })}
          {extras.map((ch) => (
            <button
              key={ch}
              type="button"
              disabled={disabled}
              onClick={() => press(ch)}
              className={keyClass}
            >
              {ch}
            </button>
          ))}
          {withSpace ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => press(" ")}
              className={`${keyClass} col-span-2 text-[16px]`}
            >
              Mellomrom
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(value.slice(0, -1))}
            className={`${keyClass} text-[16px]`}
            aria-label="Slett siste tegn"
          >
            Slett
          </button>
        </div>
      </div>
    </div>
  );
}
