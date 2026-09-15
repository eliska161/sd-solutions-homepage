import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";
import { company, formatBusinessAddress } from "@/lib/company";
import { SERVICE_ORDER_URL } from "@/lib/repair-portal";

export function RepairCTA() {
  return (
    <Section id="bestill" className="pb-32 md:pb-40">
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
            Opprett serviceordre
          </h2>
          <p className="mt-5 text-[15px] leading-[1.75] text-muted">
            Personalia, modell, IMEI og feil. Lever i butikk eller send med post
            (+69 kr hver vei).
          </p>
        </FadeIn>

        <FadeIn delay={0.06}>
          <div className="mt-10">
            <Button href={SERVICE_ORDER_URL} size="lg">
              Gå til skjema
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <dl className="mt-14 space-y-8 border-t border-border pt-14 text-[15px]">
            <div>
              <dt className="text-[13px] text-muted">Adresse</dt>
              <dd className="mt-2 leading-relaxed text-foreground">
                <span className="block">{company.address.line1}</span>
                <span className="block">
                  {company.address.postalCode} {company.address.city}
                </span>
                <span className="sr-only">{formatBusinessAddress()}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">E-post</dt>
              <dd className="mt-2">
                <a
                  href={`mailto:${company.email}`}
                  className="text-foreground transition-colors hover:text-white/80"
                >
                  {company.email}
                </a>
              </dd>
            </div>
          </dl>
        </FadeIn>
      </div>
    </Section>
  );
}
