import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, Td } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { MoneyText } from "@/components/ui/MoneyText";
import { Textarea } from "@/components/ui/Textarea";
import { formatRoiBps } from "@/lib/money";
import { parseKrToOre, riskTone } from "@/lib/labels";
import {
  convertCandidateToFlip,
  createCandidate,
  listCandidates,
} from "@/server/flips";

async function createCandidateAction(formData: FormData) {
  "use server";
  await createCandidate({
    model: String(formData.get("model") || ""),
    storage: String(formData.get("storage") || "") || null,
    color: String(formData.get("color") || "") || null,
    platform: String(formData.get("platform") || "FINN"),
    listingUrl: String(formData.get("listingUrl") || "") || null,
    seller: String(formData.get("seller") || "") || null,
    askingPriceOre: parseKrToOre(formData.get("askingPriceKr")),
    shippingOre: parseKrToOre(formData.get("shippingKr")),
    estimatedRepairOre: parseKrToOre(formData.get("estimatedRepairKr")),
    estimatedResaleOre: parseKrToOre(formData.get("estimatedResaleKr")),
    reportedFault: String(formData.get("reportedFault") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  });
  redirect("/refurbishment/candidates");
}

async function convertAction(formData: FormData) {
  "use server";
  const flip = await convertCandidateToFlip(String(formData.get("id")));
  redirect(`/refurbishment/${flip.id}`);
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const candidates = await listCandidates();

  return (
    <div>
      <PageHeader
        title="Kandidater"
        description="Deal-vurdering før kjøp."
        actions={
          <Link href="/refurbishment/candidates?new=1">
            <Button type="button">Ny kandidat</Button>
          </Link>
        }
      />

      {params.new === "1" ? (
        <form
          action={createCandidateAction}
          className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 text-sm font-medium">Ny kandidat</div>
          <div>
            <Label htmlFor="model">Modell *</Label>
            <Input id="model" name="model" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="platform">Plattform</Label>
            <Input
              id="platform"
              name="platform"
              defaultValue="FINN"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="storage">Lagring</Label>
            <Input id="storage" name="storage" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="color">Farge</Label>
            <Input id="color" name="color" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="askingPriceKr">Pris (kr) *</Label>
            <Input id="askingPriceKr" name="askingPriceKr" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="shippingKr">Frakt (kr)</Label>
            <Input id="shippingKr" name="shippingKr" defaultValue="0" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="estimatedRepairKr">Est. reparasjon (kr)</Label>
            <Input id="estimatedRepairKr" name="estimatedRepairKr" defaultValue="0" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="estimatedResaleKr">Est. salg (kr)</Label>
            <Input id="estimatedResaleKr" name="estimatedResaleKr" defaultValue="0" className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="listingUrl">Annonse-URL</Label>
            <Input id="listingUrl" name="listingUrl" className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="reportedFault">Rapportert feil</Label>
            <Textarea id="reportedFault" name="reportedFault" className="mt-1.5" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Lagre kandidat</Button>
            <Link href="/refurbishment/candidates">
              <Button type="button" variant="ghost">
                Avbryt
              </Button>
            </Link>
          </div>
        </form>
      ) : null}

      {candidates.length === 0 ? (
        <EmptyState
          title="Ingen kandidater"
          action={
            <Link href="/refurbishment/candidates?new=1">
              <Button type="button">Ny kandidat</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          headers={["Modell", "Investering", "Profit", "ROI", "Risiko", ""]}
        >
          {candidates.map((c) => (
            <tr key={c.id}>
              <Td>
                <p className="font-medium">{c.model}</p>
                <p className="text-[12px] text-muted">
                  {[c.storage, c.color, c.platform].filter(Boolean).join(" · ")}
                </p>
              </Td>
              <Td>
                <MoneyText ore={c.estimatedInvestmentOre} />
              </Td>
              <Td>
                <MoneyText ore={c.estimatedProfitOre} />
              </Td>
              <Td className="text-muted">{formatRoiBps(c.estimatedRoiBps)}</Td>
              <Td>
                <Badge tone={riskTone(c.risk)}>{c.risk}</Badge>
              </Td>
              <Td>
                <form action={convertAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" size="sm" variant="secondary">
                    Konverter
                  </Button>
                </form>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
