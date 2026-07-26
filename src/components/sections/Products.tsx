"use client";

import { type ReactNode } from "react";
import { ArrowRight, Map, MonitorSmartphone } from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

type Product = {
  name: string;
  description: string[];
  features: string[];
  icon: ReactNode;
  href: string;
};

const products: Product[] = [
  {
    name: "Kartarkiv",
    description: [
      "Kartarkiv is a cloud platform for storing, organizing and managing orienteering maps.",
      "Built specifically for orienteering clubs that need secure storage, version history and easy collaboration.",
    ],
    features: [
      "Cloud storage",
      "Version history",
      "Secure backups",
      "Club management",
      "Fast search",
    ],
    icon: <Map className="h-4 w-4" strokeWidth={1.5} />,
    href: "#contact",
  },
  {
    name: "EOK Kiosk",
    description: [
      "EOK Kiosk is a dedicated kiosk application for orienteering timing computers.",
      "It provides quick access to timing software, Eventor integration and important system functions during race day.",
    ],
    features: [
      "Eventor integration",
      "Launch O-Tid with one click",
      "Live event information",
      "Network monitoring",
      "Self-updating kiosk software",
    ],
    icon: <MonitorSmartphone className="h-4 w-4" strokeWidth={1.5} />,
    href: "#contact",
  },
];

function ProductBlock({ product, delay }: { product: Product; delay: number }) {
  return (
    <FadeIn delay={delay}>
      <article className="group border-t border-border pt-12 first:border-t-0 first:pt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12 lg:first:border-l-0 lg:first:pl-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground/70">
          {product.icon}
        </div>

        <h3 className="mt-8 text-2xl font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
          {product.name}
        </h3>

        <div className="mt-5 max-w-md space-y-4 text-[15px] leading-[1.75] text-muted">
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
            className="inline-flex items-center gap-1.5 text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Learn More
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </a>
        </div>
      </article>
    </FadeIn>
  );
}

export function Products() {
  return (
    <Section id="products">
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          Our Products
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
