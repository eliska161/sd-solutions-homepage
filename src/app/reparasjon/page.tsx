import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Topography } from "@/components/hero/Topography";
import { RepairHero } from "@/components/sections/repair/RepairHero";
import { RepairAbout } from "@/components/sections/repair/RepairAbout";
import { RepairServices } from "@/components/sections/repair/RepairServices";
import { RepairCTA } from "@/components/sections/repair/RepairCTA";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "SD Solutions Repair — iPhone-reparasjon",
  description: company.repairDescription,
  openGraph: {
    title: "SD Solutions Repair",
    description: company.repairDescription,
    type: "website",
    locale: "nb_NO",
  },
};

export default function RepairPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    name: company.repairName,
    legalName: company.legalName,
    description: company.repairDescription,
    email: company.email,
    url: "/reparasjon",
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address.line1,
      postalCode: company.address.postalCode,
      addressLocality: company.address.city,
      addressCountry: "NO",
    },
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "iPhone-reparasjon",
        serviceType: "Mobile phone repair",
      },
    },
  };

  return (
    <div className="bg-atmosphere relative min-h-screen">
      <Topography />
      <Navbar />
      <main className="relative">
        <RepairHero />
        <RepairAbout />
        <RepairServices />
        <RepairCTA />
      </main>
      <div className="relative">
        <Footer />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
