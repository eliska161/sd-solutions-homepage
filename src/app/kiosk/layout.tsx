import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-kiosk-sans",
});

export const metadata: Metadata = {
  title: "SD Solutions Locker",
  robots: { index: false, follow: false },
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${sourceSans.variable} h-[100dvh] overflow-hidden bg-[#e8eaee] font-[family-name:var(--font-kiosk-sans)] text-[#1f2430] overscroll-none`}
    >
      {children}
    </div>
  );
}
