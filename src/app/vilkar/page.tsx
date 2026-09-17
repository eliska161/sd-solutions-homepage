import { LegalArticle, legalMetadata } from "@/components/legal/LegalArticle";
import { bruksvilkar } from "@/lib/legal";

export const metadata = legalMetadata(bruksvilkar);

export default function Page() {
  return <LegalArticle doc={bruksvilkar} />;
}
