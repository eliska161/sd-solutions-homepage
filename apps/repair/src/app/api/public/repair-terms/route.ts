import { renderUnsignedTermsPdf } from "@/lib/pdf/customer-document";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pdf = await renderUnsignedTermsPdf();
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'inline; filename="sd-solutions-reparasjonsbetingelser.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("==> Betingelses-PDF feilet", err);
    return new Response("PDF kunne ikke lages", { status: 500 });
  }
}
