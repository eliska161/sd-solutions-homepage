const links = [
  { label: "Products", href: "#products" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="flex flex-col gap-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <a
              href="#"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              SD Solutions
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Software built for real-world operations.
            </p>
          </div>

          <nav className="flex flex-col gap-3 sm:items-end">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-14 border-t border-border pt-8">
          <p className="text-sm text-muted">
            © 2026 Skaug-Danielsen Solutions.
            <br className="sm:hidden" /> All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
