import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-customer",
});

export const metadata: Metadata = {
  title: "Reparasjonsstatus · SD Solutions",
  description: "Følg status på reparasjonen din hos SD Solutions.",
};

export default function CustomerStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${plex.variable} customer-status min-h-screen text-zinc-900`}
      style={{ fontFamily: "var(--font-customer), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
