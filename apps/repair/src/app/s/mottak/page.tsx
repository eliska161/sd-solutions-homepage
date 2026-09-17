import { RepairLegalArticle } from "@/components/legal/RepairLegalArticle";
import { mottak } from "@/lib/legal";

export const metadata = {
  title: "Dokumentasjon ved mottak — SD Solutions",
  description: mottak.intro,
};

export default function Page() {
  return <RepairLegalArticle doc={mottak} pdfHref="/api/public/legal/mottak" />;
}
