import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SD Solutions — iPhone-reparasjon",
  description:
    "iPhone-reparasjon hos SD Solutions. Programvare som Kartarkiv og SD Kiosk.",
  openGraph: {
    title: "SD Solutions",
    description: "iPhone-reparasjon. Programvare under Programvare.",
    type: "website",
    locale: "nb_NO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" className="bg-background">
      <body className={`${inter.variable} font-sans antialiased text-foreground`}>
        {children}
      </body>
    </html>
  );
}
