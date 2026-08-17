import Image from "next/image";

export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <Image
      src="/sd-solutions-mark.png"
      alt=""
      width={1024}
      height={1024}
      className={`rounded-sm object-contain ${className}`}
      aria-hidden="true"
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
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName ?? "h-[22px] w-[22px]"} />
      <span className="text-[13px] font-medium tracking-[0.02em]">
        SD Solutions
      </span>
    </span>
  );
}
