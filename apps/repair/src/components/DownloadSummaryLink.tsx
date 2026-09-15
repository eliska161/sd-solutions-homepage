/** Native anchor so the browser downloads the PDF instead of soft-navigating. */
export function DownloadSummaryLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-8 items-center justify-center gap-2 rounded border border-border bg-white px-3 text-xs font-medium text-foreground hover:bg-black/[0.04]"
    >
      Last ned sammendrag
    </a>
  );
}
