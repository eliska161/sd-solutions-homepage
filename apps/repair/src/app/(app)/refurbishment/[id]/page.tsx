import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { MoneyText } from "@/components/ui/MoneyText";
import { Select } from "@/components/ui/Select";
import { FlipStatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate, parseKrToOre } from "@/lib/labels";
import { formatRoiBps } from "@/lib/money";
import { listAttachments } from "@/server/attachments";
import {
  getDiagnosticsForFlip,
  getOrCreateFlipDiagnostics,
} from "@/server/diagnostics";
import { getFlipIntakeInspection } from "@/server/flip-intake";
import {
  addFlipCost,
  createListing,
  getFlip,
  recordSale,
} from "@/server/flips";
import { FlipConditionFaultsPanel } from "./FlipConditionFaultsPanel";
import { FlipDevicePanel } from "./FlipDevicePanel";
import { FlipDiagnosticsPanel } from "./FlipDiagnosticsPanel";
import { FlipIntakePanel } from "./FlipIntakePanel";
import { FlipStatusForm } from "./FlipStatusForm";

async function addCostAction(formData: FormData) {
  "use server";
  const refurbishmentId = String(formData.get("refurbishmentId"));
  await addFlipCost({
    refurbishmentId,
    category: String(formData.get("category") || "OTHER") as
      | "PURCHASE"
      | "SHIPPING"
      | "PART"
      | "CONSUMABLE"
      | "TOOL"
      | "PLATFORM_FEE"
      | "OTHER",
    label: String(formData.get("label") || ""),
    amountOre: parseKrToOre(formData.get("amountKr")),
  });
  redirect(`/refurbishment/${refurbishmentId}`);
}

async function createListingAction(formData: FormData) {
  "use server";
  const refurbishmentId = String(formData.get("refurbishmentId"));
  await createListing({
    refurbishmentId,
    title: String(formData.get("title") || ""),
    salePriceOre: parseKrToOre(formData.get("salePriceKr")),
    platform: String(formData.get("platform") || "FINN"),
    description: String(formData.get("description") || "") || null,
    listingUrl: String(formData.get("listingUrl") || "") || null,
  });
  redirect(`/refurbishment/${refurbishmentId}`);
}

async function recordSaleAction(formData: FormData) {
  "use server";
  const refurbishmentId = String(formData.get("refurbishmentId"));
  await recordSale({
    refurbishmentId,
    salePriceOre: parseKrToOre(formData.get("salePriceKr")),
    listingId: String(formData.get("listingId") || "") || null,
    platform: String(formData.get("platform") || "") || null,
    buyerName: String(formData.get("buyerName") || "") || null,
    shippingOre: parseKrToOre(formData.get("shippingKr")),
    platformFeesOre: parseKrToOre(formData.get("platformFeesKr")),
    otherFeesOre: parseKrToOre(formData.get("otherFeesKr")),
  });
  redirect(`/refurbishment/${refurbishmentId}`);
}

async function ensureFlipDiagnosticsAction(formData: FormData) {
  "use server";
  const refurbishmentId = String(formData.get("refurbishmentId"));
  await getOrCreateFlipDiagnostics(refurbishmentId);
  redirect(`/refurbishment/${refurbishmentId}`);
}

export default async function FlipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getFlip(id);
  if (!detail) notFound();
  const { flip, costs, listings, sales } = detail;

  const [intake, diag, photos] = await Promise.all([
    getFlipIntakeInspection(id),
    getDiagnosticsForFlip(id),
    listAttachments("refurbishment", id),
  ]);

  return (
    <div>
      <PageHeader
        title={flip.flipNumber}
        description={flip.model}
        actions={<FlipStatusBadge status={flip.status} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <FlipStatusForm flipId={flip.id} status={flip.status} />
        <Link href="/refurbishment" className="text-[13px] text-muted">
          Tilbake
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Kjøp</p>
            <p className="mt-1 text-xl">
              <MoneyText ore={flip.actualPurchaseOre ?? flip.estimatedPurchaseOre} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Reparasjon</p>
            <p className="mt-1 text-xl">
              <MoneyText ore={flip.actualRepairOre ?? flip.estimatedRepairOre} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Salg</p>
            <p className="mt-1 text-xl">
              <MoneyText ore={flip.actualSaleOre ?? flip.estimatedSaleOre} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Profit / ROI</p>
            <p className="mt-1 text-xl">
              <MoneyText ore={flip.actualProfitOre ?? flip.estimatedProfitOre} />
            </p>
            <p className="text-[12px] text-muted">
              {flip.actualRoiBps != null
                ? formatRoiBps(flip.actualRoiBps)
                : flip.estimatedRoiBps != null
                  ? formatRoiBps(flip.estimatedRoiBps)
                  : "—"}
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Enhet" />
          <CardBody>
            <FlipDevicePanel
              refurbishmentId={flip.id}
              initial={{
                model: flip.model,
                storage: flip.storage,
                color: flip.color,
                serialNumber: flip.serialNumber,
                imei: flip.imei,
                batteryHealth: flip.batteryHealth,
                activationLockClear: flip.activationLockClear,
                findMyOff: flip.findMyOff,
                notes: flip.notes,
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tilstand og feil" />
          <CardBody>
            <FlipConditionFaultsPanel
              refurbishmentId={flip.id}
              initial={{
                conditionGrade: flip.conditionGrade,
                cosmeticFaultKeys: flip.cosmeticFaultKeys ?? [],
                repairFaultKeys: flip.repairFaultKeys ?? [],
                conditionComment: flip.conditionComment,
                faultComment: flip.faultComment,
                conditionSummary: flip.conditionSummary,
                faultSummary: flip.faultSummary,
              }}
            />
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Mottakskontroll" />
          <CardBody>
            <FlipIntakePanel refurbishmentId={flip.id} intake={intake} />
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Diagnostikk"
            actions={
              !diag ? (
                <form action={ensureFlipDiagnosticsAction}>
                  <input type="hidden" name="refurbishmentId" value={flip.id} />
                  <Button type="submit" size="sm" variant="secondary">
                    Start diagnostikk
                  </Button>
                </form>
              ) : null
            }
          />
          <CardBody>
            {diag ? (
              <FlipDiagnosticsPanel
                refurbishmentId={flip.id}
                results={diag.results}
              />
            ) : (
              <EmptyState
                title="Ingen diagnostikk ennå"
                description="Start sjekklisten for denne flip-telefonen."
              />
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Bilder" />
          <CardBody>
            {photos.length === 0 ? (
              <p className="text-sm text-muted">
                Ingen bilder ennå — last opp under mottakskontroll.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.storagePath}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.storagePath}
                      alt={p.description || p.fileName}
                      className="aspect-square w-full object-cover"
                    />
                    <p className="truncate px-2 py-1 text-[11px] text-muted">
                      {p.category}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Kostnader" />
          <CardBody className="space-y-3">
            {costs.map((c) => (
              <div
                key={c.id}
                className="flex justify-between border-b border-border pb-2 text-sm"
              >
                <span>
                  {c.category}: {c.label}
                </span>
                <MoneyText ore={c.amountOre} />
              </div>
            ))}
            <form action={addCostAction} className="grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="refurbishmentId" value={flip.id} />
              <Select name="category" defaultValue="PART">
                <option value="PART">Del</option>
                <option value="SHIPPING">Frakt</option>
                <option value="CONSUMABLE">Forbruk</option>
                <option value="TOOL">Verktøy</option>
                <option value="PLATFORM_FEE">Plattformgebyr</option>
                <option value="OTHER">Annet</option>
              </Select>
              <Input name="label" placeholder="Beskrivelse" required />
              <Input name="amountKr" placeholder="Beløp kr" required />
              <Button type="submit" variant="secondary" size="sm" className="sm:col-span-3">
                Legg til kostnad
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Listing" />
          <CardBody className="space-y-3">
            {listings.map((l) => (
              <div key={l.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <p className="font-medium">{l.title}</p>
                <p className="text-muted">
                  {l.platform} · <MoneyText ore={l.salePriceOre} /> · {l.status}
                </p>
              </div>
            ))}
            <form action={createListingAction} className="space-y-2">
              <input type="hidden" name="refurbishmentId" value={flip.id} />
              <div>
                <Label htmlFor="title">Tittel</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  defaultValue={`${flip.model}${flip.storage ? ` ${flip.storage}` : ""}`}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="salePriceKr">Salgspris (kr)</Label>
                <Input
                  id="salePriceKr"
                  name="salePriceKr"
                  required
                  defaultValue={
                    flip.estimatedSaleOre != null
                      ? String(flip.estimatedSaleOre / 100)
                      : ""
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="platform">Plattform</Label>
                <Input id="platform" name="platform" defaultValue="FINN" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="listingUrl">URL</Label>
                <Input id="listingUrl" name="listingUrl" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  name="description"
                  className="mt-1.5"
                  defaultValue={
                    [flip.conditionSummary, flip.faultSummary]
                      .filter(Boolean)
                      .join("\n\n") || undefined
                  }
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Opprett listing
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Registrer salg" />
          <CardBody>
            {sales.length > 0 ? (
              <div className="mb-4 space-y-2">
                {sales.map((s) => (
                  <div key={s.id} className="text-sm">
                    Solgt {formatDate(s.soldAt)} for{" "}
                    <MoneyText ore={s.salePriceOre} />
                    {s.buyerName ? ` · ${s.buyerName}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
            <form action={recordSaleAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="refurbishmentId" value={flip.id} />
              <div>
                <Label htmlFor="salePriceKr2">Salgspris (kr)</Label>
                <Input id="salePriceKr2" name="salePriceKr" required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="buyerName">Kjøper</Label>
                <Input id="buyerName" name="buyerName" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="platformFeesKr">Plattformgebyr (kr)</Label>
                <Input id="platformFeesKr" name="platformFeesKr" defaultValue="0" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="shippingKr">Frakt (kr)</Label>
                <Input id="shippingKr" name="shippingKr" defaultValue="0" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="listingId">Listing</Label>
                <Select id="listingId" name="listingId" className="mt-1.5">
                  <option value="">—</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Registrer salg</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
