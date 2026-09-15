import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reparasjonsstatus · SD Solutions",
  description: "Status og serviceordre hos SD Solutions.",
};

export default function CustomerStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="customer-status min-h-screen">{children}</div>;
}
