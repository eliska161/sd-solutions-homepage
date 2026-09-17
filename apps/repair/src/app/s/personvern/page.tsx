import { RepairLegalArticle } from "@/components/legal/RepairLegalArticle";
import { personvernRepair } from "@/lib/legal";

export const metadata = {
  title: "Personvern — SD Solutions",
  description: personvernRepair.intro,
};

export default function Page() {
  return (
    <RepairLegalArticle
      doc={personvernRepair}
      pdfHref="/api/public/legal/personvern-repair"
    />
  );
}
