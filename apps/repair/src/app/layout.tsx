import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SD Solutions Repair Ops",
  description: "Verksted, lager og flipping.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body
        className={`${sourceSans.variable} min-h-full bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
