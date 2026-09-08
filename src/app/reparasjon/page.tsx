import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Topography } from "@/components/hero/Topography";
import { RepairHero } from "@/components/sections/repair/RepairHero";
import { RepairServices } from "@/components/sections/repair/RepairServices";
import { RepairAbout } from "@/components/sections/repair/RepairAbout";
import { RepairLocation } from "@/components/sections/repair/RepairLocation";
import { RepairCTA } from "@/components/sections/repair/RepairCTA";
import {
  company,
  formatBusinessAddress,
  hasBusinessAddress,
} from "@/lib/company";

export const metadata: Metadata = {
  title: "iPhone-reparasjon — SD Solutions",
  description:
    "SD Solutions tilbyr iPhone-reparasjon: skjermbytte, batteribytte, ladeport, kamera og diagnostikk. Kvalitetsdeler og tydelig pris før vi starter.",
  openGraph: {
    title: "iPhone-reparasjon — SD Solutions",
    description:
      "iPhone-reparasjon fra SD Solutions. Skjerm, batteri, ladeport og mer.",
    type: "website",
    locale: "nb_NO",
  },
};

export default function RepairPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    name: company.brandName,
    legalName: company.legalName,
    description: hasBusinessAddress()
      ? `${company.organizationType}. ${formatBusinessAddress()}.`
      : company.organizationType,
    email: company.email,
    url: "/reparasjon",
    areaServed: "NO",
    ...(hasBusinessAddress()
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: company.address.line1,
            postalCode: company.address.postalCode,
            addressLocality: company.address.city,
            addressCountry: "NO",
          },
        }
      : {}),
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
        <RepairServices />
        <RepairAbout />
        <RepairLocation />
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
