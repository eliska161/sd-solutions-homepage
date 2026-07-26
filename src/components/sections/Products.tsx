"use client";

import { type ReactNode } from "react";
import { ArrowRight, Map, MonitorSmartphone } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
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
    icon: <Map className="h-5 w-5" strokeWidth={1.75} />,
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
    icon: <MonitorSmartphone className="h-5 w-5" strokeWidth={1.75} />,
    href: "#contact",
  },
];

function ProductCard({ product, delay }: { product: Product; delay: number }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <FadeIn delay={delay}>
      <motion.article
        className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-7 sm:p-8 transition-colors duration-300 hover:border-white/12"
        whileHover={prefersReducedMotion ? undefined : { y: -4 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-primary">
          {product.icon}
        </div>

        <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {product.name}
        </h3>

        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
          {product.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <ul className="mt-6 space-y-2.5">
          {product.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-muted"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <a
            href={product.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Learn More
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={1.75}
            />
          </a>
        </div>
      </motion.article>
    </FadeIn>
  );
}

export function Products() {
  return (
    <Section id="products">
      <FadeIn>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Our Products
        </h2>
      </FadeIn>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {products.map((product, index) => (
          <ProductCard
            key={product.name}
            product={product}
            delay={index * 0.08}
          />
        ))}
      </div>
    </Section>
  );
}
