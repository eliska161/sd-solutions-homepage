import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SD Solutions — Programvare bygget for reell drift",
  description:
    "SD Solutions utvikler moderne programvare, webapplikasjoner og digitale plattformer som løser reelle driftsutfordringer.",
  openGraph: {
    title: "SD Solutions",
    description:
      "Programvare bygget for reell drift. Moderne programvare, webapplikasjoner og digitale plattformer.",
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
