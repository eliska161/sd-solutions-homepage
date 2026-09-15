import { listIphoneModels } from "@/lib/apple-models";
import { ServiceOrderForm } from "./ServiceOrderForm";

export const dynamic = "force-dynamic";

export default function NewServiceOrderPage() {
  const models = listIphoneModels();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:py-12">
      <header className="mb-8">
        <p className="text-[13px] font-semibold tracking-tight text-[var(--cs-teal)]">
          SD Solutions
        </p>
        <h1 className="cs-display mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--cs-ink)]">
          Opprett serviceordre
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--cs-muted)]">
          Fyll inn kontaktinfo og hva som er galt. Vi tar saken inn i
          verkstedet når enheten er levert — i butikk eller med post.
        </p>
      </header>
      <section className="rounded border border-[var(--cs-line)] bg-white px-5 py-6 shadow-sm sm:px-6">
        <ServiceOrderForm models={models} />
      </section>
      <p className="mt-6 text-center text-[12px] text-[var(--cs-muted)]">
        Slåttmyrvegen 49, 2406 Elverum
      </p>
    </main>
  );
}
