function Star({ fill }: { fill: number }) {
  const clip = Math.max(0, Math.min(1, fill));
  return (
    <span className="relative inline-block h-[1.05em] w-[1.05em]" aria-hidden>
      <svg viewBox="0 0 24 24" className="absolute inset-0 text-white/20">
        <path
          fill="currentColor"
          d="M12 2.6 14.9 8.4l6.4.9-4.6 4.5 1.1 6.4L12 17.2 6.2 20.2l1.1-6.4L2.7 9.3l6.4-.9L12 2.6z"
        />
      </svg>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${clip * 100}%` }}
      >
        <svg viewBox="0 0 24 24" className="h-[1.05em] w-[1.05em] text-[#fbbc04]">
          <path
            fill="currentColor"
            d="M12 2.6 14.9 8.4l6.4.9-4.6 4.5 1.1 6.4L12 17.2 6.2 20.2l1.1-6.4L2.7 9.3l6.4-.9L12 2.6z"
          />
        </svg>
      </span>
    </span>
  );
}

export function GoogleStars({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "text-[1.35rem]" : size === "sm" ? "text-[0.95rem]" : "text-[1.1rem]";
  return (
    <span className={`inline-flex items-center gap-0.5 ${sizeClass}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} fill={rating - i} />
      ))}
    </span>
  );
}
