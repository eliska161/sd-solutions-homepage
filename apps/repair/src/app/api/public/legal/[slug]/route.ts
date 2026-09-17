import { renderLegalPdfBySlug } from "@/lib/pdf/customer-document";
import { getLegalDocument } from "@/lib/legal";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const document = getLegalDocument(slug);
  if (!document) {
    return new Response("Ikke funnet", { status: 404 });
  }
  try {
    const pdf = await renderLegalPdfBySlug(slug);
    if (!pdf) return new Response("Ikke funnet", { status: 404 });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${document.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("==> Legal-PDF feilet", slug, err);
    return new Response("PDF kunne ikke lages", { status: 500 });
  }
}
