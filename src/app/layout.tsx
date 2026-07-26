import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SD Solutions — Software built for real-world operations",
  description:
    "SD Solutions develops modern software, web applications and digital platforms that solve real operational challenges.",
  openGraph: {
    title: "SD Solutions",
    description:
      "Software built for real-world operations. Modern software, web applications and digital platforms.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} font-sans antialiased text-foreground`}>
        {children}
      </body>
    </html>
  );
}
