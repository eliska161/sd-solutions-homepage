import { renderLegalPdf } from "@/lib/pdf/customer-document";
import { fysiskReparasjonsvilkar } from "@/lib/legal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pdf = await renderLegalPdf(fysiskReparasjonsvilkar);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'inline; filename="sd-solutions-reparasjonsvilkar.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("==> Betingelses-PDF feilet", err);
    return new Response("PDF kunne ikke lages", { status: 500 });
  }
}

