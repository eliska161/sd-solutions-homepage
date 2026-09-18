import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Takk — SD Solutions",
  description: "Vi har mottatt henvendelsen din.",
  robots: { index: false, follow: false },
};

export default function TakkPage() {
  return (
    <>
      <h1 className="mt-8 text-3xl font-medium tracking-[-0.03em] text-foreground">
        Takk!
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Vi har fått meldingen din, og tar kontakt så snart vi kan.
      </p>
      <p className="mt-8 text-[15px] leading-relaxed text-foreground">
        Tusen takk for at du velger SD Solutions!
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-black"
      >
        Til startsiden
      </Link>
    </>
  );
}
