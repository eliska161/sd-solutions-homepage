/** Native anchor so the browser downloads the PDF instead of soft-navigating. */
export function DownloadSummaryLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-8 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.04]"
    >
      Last ned sammendrag
    </a>
  );
}
