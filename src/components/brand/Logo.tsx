type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className = "h-5 w-auto" }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 56 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8.2 15.1c0-3.9 3.4-6.5 7.8-6.5 4.3 0 7.5 2.2 7.5 5.5 0 7-15.4 5-15.4 14.5 0 4.3 3.7 7 8.4 7 4.8 0 8.2-2.6 8.5-6.6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M33.2 8.6v22.8"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M33.2 8.6h3.6c7 0 11.5 5.1 11.5 11.4S43.8 31.4 36.8 31.4h-3.6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
};

export function Logo({ className = "", markClassName }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName ?? "h-[18px] w-auto"} />
      <span className="text-[13px] font-medium tracking-tight">SD Solutions</span>
    </span>
  );
}
