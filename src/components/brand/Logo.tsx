import Image from "next/image";

export function LogoMark({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <Image
      src="/sd-solutions-mark.png"
      alt=""
      width={1024}
      height={1024}
      className={`object-contain ${className}`}
      aria-hidden="true"
      priority
    />
  );
}

export function Logo({
  className = "",
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark className={markClassName ?? "h-11 w-11 sm:h-12 sm:w-12"} />
      <span className="text-[15px] font-medium tracking-[0.02em] sm:text-base">
        SD Solutions
      </span>
    </span>
  );
}
