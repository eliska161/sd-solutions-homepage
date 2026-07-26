"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const links = [
  { label: "Produkter", href: "#produkter" },
  { label: "Om oss", href: "#om-oss" },
  { label: "Kontakt", href: "#kontakt" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6 md:pt-5">
      <div
        className={[
          "mx-auto max-w-5xl transition-all duration-300",
          scrolled || open
            ? "rounded-2xl border border-border bg-background/70 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            : "rounded-2xl border border-transparent bg-transparent",
        ].join(" ")}
      >
        <nav className="flex h-12 items-center justify-between px-4 sm:px-5">
          <a
            href="#"
            className="text-[13px] font-medium tracking-tight text-foreground transition-opacity hover:opacity-70"
          >
            SD Solutions
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="ml-2">
              <Button href="#kontakt" size="md">
                Ta kontakt
              </Button>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground md:hidden"
            aria-label={open ? "Lukk meny" : "Åpne meny"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {open && (
          <div className="border-t border-border px-3 pb-3 pt-1 md:hidden">
            <div className="flex flex-col gap-0.5">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-3 py-2.5 text-[13px] text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2">
                <Button
                  href="#kontakt"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Ta kontakt
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
