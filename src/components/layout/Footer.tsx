import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SERVICE_ORDER_URL } from "@/lib/repair-portal";

const links = [
  { label: "Reparasjon", href: "/" },
  { label: "Priser", href: "/#priser" },
  { label: "Programvare", href: "/programvare" },
  { label: "Opprett serviceordre", href: SERVICE_ORDER_URL },
  { label: "Kontakt", href: "/kontakt" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex" aria-label="SD Solutions">
              <Logo />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              iPhone-reparasjon og programvare.
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
          <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted">
            <Link href="/personvern" className="hover:text-foreground">
              Personvern
            </Link>
            <Link href="/cookies" className="hover:text-foreground">
              Cookies
            </Link>
            <Link href="/vilkar" className="hover:text-foreground">
              Bruksvilkår
            </Link>
            <Link href="/kontakt" className="hover:text-foreground">
              Kontakt
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
