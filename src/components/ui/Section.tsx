import { type ReactNode } from "react";

type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function Section({
  id,
  children,
  className = "",
  containerClassName = "",
}: SectionProps) {
  return (
    <section id={id} className={`relative py-28 md:py-36 lg:py-40 ${className}`}>
      <div
        className={`mx-auto w-full max-w-5xl px-6 lg:px-8 ${containerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
