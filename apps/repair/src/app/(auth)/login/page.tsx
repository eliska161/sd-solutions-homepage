import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface px-6 py-8">
        <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">
          SD Solutions Repair
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.03em] text-foreground">
          Logg inn
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Auth kobles til Neon i fase 2. Sett{" "}
          <code className="text-foreground/80">DATABASE_URL</code> og{" "}
          <code className="text-foreground/80">BETTER_AUTH_SECRET</code> først.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full bg-white text-sm font-medium text-black transition-colors hover:bg-white/90"
        >
          Fortsett til dashboard (fase 1)
        </Link>
      </div>
    </div>
  );
}
