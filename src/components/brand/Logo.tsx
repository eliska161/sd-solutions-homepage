type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className = "h-6 w-6" }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3.25"
        y="3.25"
        width="33.5"
        height="33.5"
        rx="11"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <rect
        x="9.25"
        y="9.25"
        width="21.5"
        height="21.5"
        rx="7"
        stroke="currentColor"
        strokeWidth="1.1"
        opacity="0.72"
      />
      <rect
        x="15"
        y="15"
        width="10"
        height="10"
        rx="3.2"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <rect x="18.4" y="18.4" width="3.2" height="3.2" rx="0.9" fill="currentColor" />
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
      <LogoMark className={markClassName ?? "h-[18px] w-[18px]"} />
      <span className="text-[13px] font-medium tracking-tight">SD Solutions</span>
    </span>
  );
}
