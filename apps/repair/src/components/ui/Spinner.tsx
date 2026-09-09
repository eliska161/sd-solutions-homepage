export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-label="Laster"
      className={[
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground",
        className,
      ].join(" ")}
    />
  );
}
