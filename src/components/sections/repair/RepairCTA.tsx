import { ContactForm } from "@/components/contact/ContactForm";
import { FadeIn } from "@/components/ui/FadeIn";
import { Section } from "@/components/ui/Section";
import { company, formatBusinessAddress } from "@/lib/company";

export function RepairCTA() {
  return (
    <Section id="bestill" className="pb-32 md:pb-40">
      <div className="mx-auto max-w-xl">
        <FadeIn>
          <h2 className="text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-4xl">
            Kontakt
          </h2>
        </FadeIn>

        <FadeIn delay={0.06}>
          <dl className="mt-10 space-y-8 text-[15px]">
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

        <FadeIn delay={0.1}>
          <div className="mt-14 border-t border-border pt-14">
            <p className="mb-8 text-[15px] leading-relaxed text-muted">
              Beskriv modell og feil, så tar vi kontakt.
            </p>
            <ContactForm defaultInquiryType="repair" hideInquiryType />
          </div>
        </FadeIn>
      </div>
    </Section>
  );
}
