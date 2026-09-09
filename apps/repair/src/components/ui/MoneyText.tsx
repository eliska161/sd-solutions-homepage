import { formatNokFromOre } from "@/lib/money";

export function MoneyText({
  ore,
  className = "",
}: {
  ore: number | null | undefined;
  className?: string;
}) {
  if (ore == null) {
    return <span className={["text-muted", className].join(" ")}>—</span>;
  }
  return (
    <span className={["tabular-nums text-foreground", className].join(" ")}>
      {formatNokFromOre(ore)}
    </span>
  );
}
