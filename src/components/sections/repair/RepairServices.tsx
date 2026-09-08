import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";

const services = [
  {
    name: "Skjermbytte",
    description:
      "Sprukket eller uklar skjerm byttes med kvalitetsdeler tilpasset din iPhone-modell.",
  },
  {
    name: "Batteribytte",
    description:
      "Når batteriet holder dårlig, bytter vi det slik at telefonen varer gjennom dagen igjen.",
  },
  {
    name: "Ladeport og tilkobling",
    description:
      "Problemer med lading, løs Lightning/USB-C-port eller ustabil tilkobling.",
  },
  {
    name: "Kamera og lyd",
    description:
      "Feil på kamera, mikrofon eller høyttaler — vi diagnostiserer og reparerer.",
  },
  {
    name: "Diagnostikk",
    description:
      "Usikker på feilen? Vi sjekker telefonen og gir deg en tydelig anbefaling før jobb.",
  },
];

export function RepairServices() {
  return (
    <Section id="tjenester" className="border-y border-border">
      <FadeIn>
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
          Hva vi reparerer
        </h2>
        <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-muted">
          Fokus på iPhone. Du får pris og omfang før vi går i gang.
        </p>
      </FadeIn>

      <ul className="mt-16 space-y-0 md:mt-20">
        {services.map((service, index) => (
          <FadeIn key={service.name} delay={index * 0.05}>
            <li className="border-t border-border py-8 first:border-t-0 first:pt-0 md:grid md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10 md:py-10">
              <h3 className="text-lg font-medium tracking-[-0.02em] text-foreground">
                {service.name}
              </h3>
              <p className="mt-3 max-w-xl text-[15px] leading-[1.75] text-muted md:mt-0">
                {service.description}
              </p>
            </li>
          </FadeIn>
        ))}
      </ul>
    </Section>
  );
}
