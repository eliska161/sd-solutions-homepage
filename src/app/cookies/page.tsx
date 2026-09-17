import { LegalArticle, legalMetadata } from "@/components/legal/LegalArticle";
import { cookies } from "@/lib/legal";

export const metadata = legalMetadata(cookies);

export default function Page() {
  return <LegalArticle doc={cookies} />;
}
