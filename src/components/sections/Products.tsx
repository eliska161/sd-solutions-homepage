"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, MonitorSmartphone } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

type Product = {
  name: string;
  description: string[];
  features: string[];
  icon?: ReactNode;
  logo?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  href: string;
  external?: boolean;
};

const products: Product[] = [
  {
    name: "Kartarkiv",
    description: [
      "Kartarkiv er en skyplattform for lagring, organisering og forvaltning av orienteringskart.",
      "Bygget spesielt for orienteringsklubber som trenger sikker lagring, versjonshistorikk og enkelt samarbeid.",
    ],
    features: [
      "Skylagring",
      "Versjonshistorikk",
      "Sikre sikkerhetskopier",
      "Klubbadministrasjon",
      "Raskt søk",
    ],
    logo: {
      src: "/kartarkiv-logo.png",
      alt: "Kartarkiv",
      width: 320,
      height: 72,
    },
    href: "https://kartarkiv.co",
    external: true,
  },
  {
    name: "EOK Kiosk",
    description: [
      "EOK Kiosk er en dedikert kiosk-applikasjon for orienteringstidtakingssystemer.",
      "Den gir rask tilgang til tidtakingsprogramvare, Eventor-integrasjon og viktige systemfunksjoner på løpsdag.",
    ],
    features: [
      "Eventor-integrasjon",
      "Start O-Tid med ett klikk",
      "Live arrangementsinformasjon",
      "Nettverksovervåking",
      "Selvoppdaterende kioskprogramvare",
    ],
    icon: <MonitorSmartphone className="h-4 w-4" strokeWidth={1.5} />,
    href: "#kontakt",
  },
];

function ProductBlock({ product, delay }: { product: Product; delay: number }) {
  const linkProps = product.external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <FadeIn delay={delay}>
      <article className="group border-t border-border pt-12 first:border-t-0 first:pt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12 lg:first:border-l-0 lg:first:pl-0">
        {product.logo ? (
          <>
            <a href={product.href} {...linkProps} className="inline-block">
              <Image
                src={product.logo.src}
                alt={product.logo.alt}
                width={product.logo.width}
                height={product.logo.height}
                className="h-14 w-auto object-contain object-left sm:h-16"
                priority
              />
            </a>
            <h3 className="sr-only">{product.name}</h3>
          </>
        ) : (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground/70">
              {product.icon}
            </div>
            <h3 className="mt-8 text-2xl font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
              {product.name}
            </h3>
          </>
        )}

        <div
          className={`max-w-md space-y-4 text-[15px] leading-[1.75] text-muted ${
            product.logo ? "mt-8" : "mt-5"
          }`}
        >
          {product.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <ul className="mt-8 space-y-3">
          {product.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 text-sm leading-relaxed text-muted"
            >
              <span className="mt-[9px] h-px w-3 shrink-0 bg-white/25" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <a
            href={product.href}
            {...linkProps}
            className="inline-flex items-center gap-1.5 text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            {product.external ? "Besøk Kartarkiv" : "Les mer"}
            {product.external ? (
              <ArrowUpRight
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={1.5}
              />
            ) : (
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            )}
          </a>
        </div>
      </article>
    </FadeIn>
  );
}

export function Products() {
  return (
    <Section id="produkter">
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          Våre produkter
        </h2>
      </FadeIn>

      <div className="mt-16 grid gap-16 lg:mt-20 lg:grid-cols-2 lg:gap-0">
        {products.map((product, index) => (
          <ProductBlock
            key={product.name}
            product={product}
            delay={index * 0.08}
          />
        ))}
      </div>
    </Section>
  );
}
