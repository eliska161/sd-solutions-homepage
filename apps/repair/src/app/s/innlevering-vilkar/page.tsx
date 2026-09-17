import { RepairLegalArticle } from "@/components/legal/RepairLegalArticle";
import { innUtlevering } from "@/lib/legal";

export const metadata = {
  title: "Inn- og utlevering — SD Solutions",
  description: innUtlevering.intro,
};

export default function Page() {
  return (
    <RepairLegalArticle
      doc={innUtlevering}
      pdfHref="/api/public/legal/inn-utlevering"
    />
  );
}
