import type { GoogleReviewSummary } from "@/lib/google-reviews";

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

export function GoogleMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.2 2.8-2.5 3.6v3h4c2.4-2.2 3.5-5.4 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-4-3c-1.1.8-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.3v3.1C3.3 21.3 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4c-.2-.7-.4-1.4-.4-2.4s.1-1.7.4-2.4V6.5H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.5l4.1-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.1 15.2 0 12 0 7.4 0 3.3 2.7 1.3 6.5l4.1 3.1C6.3 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

export function formatGoogleRating(rating: number) {
  return rating.toFixed(1).replace(".", ",");
}

export function GoogleRatingLabel({ data }: { data: GoogleReviewSummary }) {
  if (data.rating == null) {
    return <span>Google-anmeldelser</span>;
  }
  const count =
    data.count > 0
      ? ` · ${data.count} ${data.count === 1 ? "anmeldelse" : "anmeldelser"}`
      : "";
  return (
    <span>
      {formatGoogleRating(data.rating)} på Google{count}
    </span>
  );
}
