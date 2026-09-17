import { LegalArticle, legalMetadata } from "@/components/legal/LegalArticle";
import { personvernNettsted } from "@/lib/legal";

export const metadata = legalMetadata(personvernNettsted);

export default function Page() {
  return <LegalArticle doc={personvernNettsted} />;
}
