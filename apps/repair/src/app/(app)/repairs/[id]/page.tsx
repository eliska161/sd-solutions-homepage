import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { MoneyText } from "@/components/ui/MoneyText";
import { Select } from "@/components/ui/Select";
import { RepairStatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { formatDate, formatDateOnly, parseKrToOre } from "@/lib/labels";
import { grossProfitOre } from "@/lib/money";
import { listActivity } from "@/server/activity";
import {
  listAttachments,
  setAttachmentVisibility,
  uploadAttachment,
} from "@/server/attachments";
import { getCustomer } from "@/server/customers";
import { getDevice } from "@/server/devices";
import {
  getDiagnosticsForTicket,
  getOrCreateDiagnostics,
} from "@/server/diagnostics";
import { getIntakeInspection } from "@/server/intake";
import { listParts, usePartOnRepair as consumePartOnRepair } from "@/server/parts";
import {
  addRepairNote,
  addServiceToRepair,
  getRepair,
  getRepairAssigneeName,
  listRepairNotes,
  listRepairParts,
  listRepairServices,
  listRepairStatusHistory,
  updateRepairPricing,
} from "@/server/repairs";
import { listServices } from "@/server/services-catalog";
import { listTechnicians } from "@/server/users";
import {
  createWarrantyForRepair,
  getWarrantyForTicket,
} from "@/server/warranty";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { CustomerDiagnosisForm } from "./CustomerDiagnosisForm";
import { IntakePanel } from "./IntakePanel";
import { RepairStatusForm } from "./RepairStatusForm";
import {
  CustomerLinkCard,
  TechnicianEtaForm,
} from "./TechnicianEtaForm";

async function ensureDiagnosticsAction(formData: FormData) {
  "use server";
  const ticketId = String(formData.get("ticketId"));
  await getOrCreateDiagnostics(ticketId);
  redirect(`/repairs/${ticketId}`);
}

async function addNoteAction(formData: FormData) {
  "use server";
  const ticketId = String(formData.get("ticketId"));
  await addRepairNote({
    ticketId,
    content: String(formData.get("content") || ""),
    visibility: (String(formData.get("visibility") || "INTERNAL") as
      | "INTERNAL"
      | "CUSTOMER"),
  });
  redirect(`/repairs/${ticketId}`);
}

async function addServiceAction(formData: FormData) {
  "use server";
  const ticketId = String(formData.get("ticketId"));
  await addServiceToRepair({
    ticketId,
    serviceId: String(formData.get("serviceId") || ""),
  });
  redirect(`/repairs/${ticketId}`);
}

async function addPartAction(formData: FormData) {
  "use server";
  const ticketId = String(formData.get("ticketId"));
  await consumePartOnRepair({
    ticketId,
    partId: String(formData.get("partId") || ""),
    quantity: Number(formData.get("quantity") || 1),
  });
  redirect(`/repairs/${ticketId}`);
}

async function updatePricingAction(formData: FormData) {
  "use server";
  const ticketId = String(formData.get("ticketId"));
  await updateRepairPricing(ticketId, {
    customerPriceOre: parseKrToOre(formData.get("customerPriceKr")),
    otherCostsOre: parseKrToOre(formData.get("otherCostsKr")),
  });
  redirect(`/repairs/${ticketId}`);
}

async function createWarrantyAction(formData: FormData) {
  "use server";
  const ticketId = String(formData.get("ticketId"));
  await createWarrantyForRepair(ticketId, {
    days: Number(formData.get("days") || 90),
  });
  redirect(`/repairs/${ticketId}`);
}

async function uploadPhotoAction(formData: FormData) {
  "use server";
  const ticketId = String(formData.get("ticketId"));
  await uploadAttachment({
    entityType: "repair_ticket",
    entityId: ticketId,
    category: String(formData.get("category") || "OTHER") as
      | "BEFORE"
      | "DURING"
      | "AFTER"
      | "DAMAGE"
      | "SERIAL_NUMBER"
      | "OTHER"
      | "INTAKE_FRONT"
      | "INTAKE_BACK"
      | "INTAKE_LEFT"
      | "INTAKE_RIGHT"
      | "INTAKE_TOP"
      | "INTAKE_BOTTOM",
    visibility: (String(formData.get("visibility") || "INTERNAL") as
      | "INTERNAL"
      | "CUSTOMER"),
    description: String(formData.get("description") || "") || null,
    formData,
  });
  redirect(`/repairs/${ticketId}`);
}

async function togglePhotoVisibilityAction(formData: FormData) {
  "use server";
  const ticketId = String(formData.get("ticketId"));
  const attachmentId = String(formData.get("attachmentId"));
  const visibility = String(formData.get("visibility")) as
    | "INTERNAL"
    | "CUSTOMER";
  await setAttachmentVisibility({ attachmentId, visibility });
  redirect(`/repairs/${ticketId}`);
}

export default async function RepairDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getRepair(id);
  if (!ticket) notFound();

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : "";

  const [
    customer,
    device,
    notes,
    history,
    usedParts,
    usedServices,
    catalogServices,
    parts,
    diag,
    activity,
    warranty,
    photos,
    technicians,
    assigneeName,
    intake,
  ] = await Promise.all([
    getCustomer(ticket.customerId),
    getDevice(ticket.deviceId),
    listRepairNotes(id),
    listRepairStatusHistory(id),
    listRepairParts(id),
    listRepairServices(id),
    listServices(true),
    listParts(),
    getDiagnosticsForTicket(id),
    listActivity({ entityType: "repair_ticket", entityId: id, limit: 40 }),
    getWarrantyForTicket(id),
    listAttachments("repair_ticket", id),
    listTechnicians(),
    getRepairAssigneeName(ticket.assigneeId),
    getIntakeInspection(id),
  ]);

  const customerPrice = ticket.customerPriceOre ?? 0;
  const partsCost = ticket.actualPartsCostOre ?? 0;
  const otherCosts = ticket.otherCostsOre ?? 0;
  const profit = grossProfitOre({
    customerPriceOre: customerPrice,
    partsCostOre: partsCost,
    otherCostsOre: otherCosts,
  });
  const publicUrl = `${origin}/s/${ticket.publicAccessToken}`;

  return (
    <div>
      <PageHeader
        title={ticket.ticketNumber}
        description={ticket.customerProblem}
        actions={<RepairStatusBadge status={ticket.status} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <RepairStatusForm ticketId={ticket.id} status={ticket.status} />
        <p className="text-[13px] text-muted">
          Opprettet {formatDate(ticket.createdAt)}
        </p>
        <p className="text-[13px] text-muted">
          Tekniker: {assigneeName || "Tekniker ikke tildelt"}
        </p>
        <p className="text-[13px] text-muted">
          Estimert ferdig: {formatDateOnly(ticket.estimatedCompletionDate)}
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Kundepris</p>
            <p className="mt-1 text-xl">
              <MoneyText ore={customerPrice} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Delkost</p>
            <p className="mt-1 text-xl">
              <MoneyText ore={partsCost} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Andre kostnader</p>
            <p className="mt-1 text-xl">
              <MoneyText ore={otherCosts} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Fortjeneste</p>
            <p className="mt-1 text-xl">
              <MoneyText ore={profit} />
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Kunde & enhet" />
            <CardBody className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted">Kunde</p>
                {customer ? (
                  <Link
                    href={`/customers/${customer.id}`}
                    className="mt-1 block text-accent"
                  >
                    {customer.name}
                  </Link>
                ) : (
                  <p>—</p>
                )}
                <p className="text-muted">{customer?.phone}</p>
                <p className="text-muted">{customer?.email}</p>
              </div>
              <div>
                <p className="text-muted">Enhet</p>
                {device ? (
                  <Link
                    href={`/devices/${device.id}`}
                    className="mt-1 block text-accent"
                  >
                    {device.brand} {device.model}
                  </Link>
                ) : (
                  <p>—</p>
                )}
                <p className="text-muted">
                  {device?.imei || device?.serialNumber || "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted">Fysisk tilstand (kort)</p>
                <p className="mt-1">{ticket.physicalCondition || "—"}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Mottakskontroll" />
            <CardBody>
              <IntakePanel ticketId={ticket.id} intake={intake} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Diagnostikk"
              actions={
                !diag ? (
                  <form action={ensureDiagnosticsAction}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      Start diagnostikk
                    </Button>
                  </form>
                ) : null
              }
            />
            <CardBody className="space-y-6">
              {diag ? (
                <DiagnosticsPanel
                  ticketId={ticket.id}
                  results={diag.results}
                />
              ) : (
                <EmptyState
                  title="Ingen diagnostikk ennå"
                  description="Start sjekklisten for denne ticketen."
                />
              )}
              <div className="border-t border-border pt-5">
                <CustomerDiagnosisForm
                  ticketId={ticket.id}
                  initialValue={ticket.internalProblem}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tjenester" />
            <CardBody className="space-y-4">
              {usedServices.length === 0 ? (
                <p className="text-sm text-muted">Ingen tjenester lagt til.</p>
              ) : (
                usedServices.map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between text-sm border-b border-border pb-2"
                  >
                    <span>
                      {s.serviceCode} · {s.serviceName}
                    </span>
                    <MoneyText ore={s.priceOre} />
                  </div>
                ))
              )}
              <form action={addServiceAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <Select name="serviceId" required className="max-w-sm flex-1">
                  <option value="">Velg tjeneste…</option>
                  {catalogServices
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({Math.round(s.customerPriceOre / 100)} kr)
                      </option>
                    ))}
                </Select>
                <Button type="submit" variant="secondary">
                  Legg til
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Deler" />
            <CardBody className="space-y-4">
              {usedParts.length === 0 ? (
                <p className="text-sm text-muted">Ingen deler brukt.</p>
              ) : (
                usedParts.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between text-sm border-b border-border pb-2"
                  >
                    <span>
                      {p.quantity} × {p.partName} ({p.partSku})
                    </span>
                    <MoneyText ore={p.quantity * p.unitCostOre} />
                  </div>
                ))
              )}
              <form action={addPartAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <Select name="partId" required className="max-w-sm flex-1">
                  <option value="">Velg del…</option>
                  {parts
                    .filter((p) => p.active && p.quantityOnHand > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.quantityOnHand} på lager)
                      </option>
                    ))}
                </Select>
                <Input
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="w-24"
                />
                <Button type="submit" variant="secondary">
                  Bruk del
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Bilder & filer" />
            <CardBody className="space-y-4">
              {photos.length === 0 ? (
                <p className="text-sm text-muted">Ingen filer lastet opp.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((p) => (
                    <div
                      key={p.id}
                      className="overflow-hidden rounded-xl border border-border"
                    >
                      <a
                        href={p.storagePath}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        {p.mimeType.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.storagePath}
                            alt={p.fileName}
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-28 items-center justify-center px-2 text-center text-[12px] text-muted">
                            {p.fileName}
                          </div>
                        )}
                      </a>
                      <div className="space-y-1 px-2 py-2">
                        <p className="truncate text-[11px] text-muted">
                          {p.category || "OTHER"}
                          {p.description ? ` · ${p.description}` : ""}
                        </p>
                        <p className="text-[11px] text-muted">
                          {p.visibility === "CUSTOMER"
                            ? "Kunde-synlig"
                            : "Internt"}{" "}
                          · {formatDate(p.createdAt)}
                        </p>
                        <form action={togglePhotoVisibilityAction}>
                          <input type="hidden" name="ticketId" value={ticket.id} />
                          <input
                            type="hidden"
                            name="attachmentId"
                            value={p.id}
                          />
                          <input
                            type="hidden"
                            name="visibility"
                            value={
                              p.visibility === "CUSTOMER"
                                ? "INTERNAL"
                                : "CUSTOMER"
                            }
                          />
                          <Button type="submit" size="sm" variant="secondary">
                            {p.visibility === "CUSTOMER"
                              ? "Skjul for kunde"
                              : "Vis for kunde"}
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <form
                action={uploadPhotoAction}
                encType="multipart/form-data"
                className="flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="ticketId" value={ticket.id} />
                <div>
                  <Label htmlFor="category">Kategori</Label>
                  <Select
                    id="category"
                    name="category"
                    defaultValue="BEFORE"
                    className="mt-1.5 w-44"
                  >
                    <option value="BEFORE">Før</option>
                    <option value="DAMAGE">Skade</option>
                    <option value="DURING">Under</option>
                    <option value="AFTER">Etter</option>
                    <option value="SERIAL_NUMBER">Serienummer</option>
                    <option value="OTHER">Annet</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="visibility">Synlighet</Label>
                  <Select
                    id="visibility"
                    name="visibility"
                    defaultValue="INTERNAL"
                    className="mt-1.5 w-40"
                  >
                    <option value="INTERNAL">Internt</option>
                    <option value="CUSTOMER">Kunde</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Input
                    id="description"
                    name="description"
                    className="mt-1.5 w-44"
                  />
                </div>
                <div>
                  <Label htmlFor="file">Fil</Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept="image/*,application/pdf"
                    required
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Last opp
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notater" />
            <CardBody className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-sm text-muted">Ingen notater.</p>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-border px-3 py-2"
                  >
                    <p className="text-[11px] text-muted">
                      {n.visibility} · {formatDate(n.createdAt)}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {n.content}
                    </p>
                  </div>
                ))
              )}
              <form action={addNoteAction} className="space-y-2">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <Textarea name="content" required placeholder="Skriv notat…" />
                <div className="flex gap-2">
                  <Select
                    name="visibility"
                    defaultValue="INTERNAL"
                    className="w-40"
                  >
                    <option value="INTERNAL">Internt</option>
                    <option value="CUSTOMER">Kunde</option>
                  </Select>
                  <Button type="submit" variant="secondary">
                    Lagre notat
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Tekniker & levering" />
            <CardBody>
              <TechnicianEtaForm
                ticketId={ticket.id}
                assigneeId={ticket.assigneeId}
                estimatedCompletionDate={ticket.estimatedCompletionDate}
                technicians={technicians}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Kundestatus-side" />
            <CardBody>
              <CustomerLinkCard publicUrl={publicUrl} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Prising" />
            <CardBody>
              <form action={updatePricingAction} className="space-y-3">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <div>
                  <Label htmlFor="customerPriceKr">Kundepris (kr)</Label>
                  <Input
                    id="customerPriceKr"
                    name="customerPriceKr"
                    defaultValue={
                      ticket.customerPriceOre != null
                        ? (ticket.customerPriceOre / 100).toString()
                        : ""
                    }
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="otherCostsKr">Andre kostnader (kr)</Label>
                  <Input
                    id="otherCostsKr"
                    name="otherCostsKr"
                    defaultValue={(otherCosts / 100).toString()}
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Oppdater
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Garanti" />
            <CardBody className="space-y-3 text-sm">
              {warranty ? (
                <div>
                  <p>
                    {warranty.days} dager · {formatDate(warranty.startsAt)} –{" "}
                    {formatDate(warranty.endsAt)}
                  </p>
                </div>
              ) : (
                <form action={createWarrantyAction} className="space-y-2">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <Label htmlFor="days">Dager</Label>
                  <Input
                    id="days"
                    name="days"
                    type="number"
                    defaultValue={ticket.warrantyDays ?? 90}
                    className="mt-1.5"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Opprett garanti
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Statushistorikk" />
            <CardBody className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="text-sm border-b border-border pb-2">
                  <p>
                    {h.fromStatus ?? "—"} → {h.toStatus}
                  </p>
                  <p className="text-[12px] text-muted">
                    {formatDate(h.createdAt)}
                    {h.note ? ` · ${h.note}` : ""}
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Aktivitet" />
            <CardBody className="space-y-2">
              {activity.length === 0 ? (
                <p className="text-sm text-muted">Ingen aktivitet.</p>
              ) : (
                activity.map((a) => (
                  <div
                    key={a.id}
                    className="text-sm border-b border-border pb-2"
                  >
                    <p>{a.message}</p>
                    <p className="text-[12px] text-muted">
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
