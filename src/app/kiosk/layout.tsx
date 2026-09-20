import type { Metadata } from "next";

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
    <div className="h-[100dvh] overflow-hidden bg-[#0c0e0d] overscroll-none">
      {children}
    </div>
  );
}
