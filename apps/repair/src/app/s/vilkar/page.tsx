import { RepairLegalArticle } from "@/components/legal/RepairLegalArticle";
import { vilkarReparasjon } from "@/lib/legal";

export const metadata = {
  title: "Vilkår for reparasjon — SD Solutions",
  description: vilkarReparasjon.intro,
};

export default function Page() {
  return (
    <RepairLegalArticle
      doc={vilkarReparasjon}
      pdfHref="/api/public/legal/vilkar-reparasjon"
    />
  );
}
