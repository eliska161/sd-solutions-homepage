import { RepairLegalArticle } from "@/components/legal/RepairLegalArticle";
import { garanti } from "@/lib/legal";

export const metadata = {
  title: "Reparasjonsgaranti — SD Solutions",
  description: garanti.intro,
};

export default function Page() {
  return (
    <RepairLegalArticle doc={garanti} pdfHref="/api/public/legal/garanti" />
  );
}
