import { Logo } from "@/components/brand/Logo";

const links = [
  { label: "Produkter", href: "#produkter" },
  { label: "Om oss", href: "#om-oss" },
  { label: "Kontakt", href: "#kontakt" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <a href="#" className="inline-flex" aria-label="SD Solutions">
              <Logo />
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Programvare bygget for reell drift.
            </p>
          </div>

          <nav className="flex flex-col gap-3 sm:items-end">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-16 border-t border-border pt-8">
          <p className="text-[13px] font-light tracking-[0.01em] text-muted">
            © 2026 Skaug-Danielsen Solutions.
            <br className="sm:hidden" /> Alle rettigheter forbeholdt.
          </p>
        </div>
      </div>
    </footer>
  );
}
