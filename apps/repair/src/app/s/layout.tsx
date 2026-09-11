import type { Metadata } from "next";
import { Newsreader, Schibsted_Grotesk } from "next/font/google";

const display = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-customer-display",
});

const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-customer-sans",
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
      className={`${display.variable} ${sans.variable} customer-status min-h-screen`}
    >
      {children}
    </div>
  );
}
