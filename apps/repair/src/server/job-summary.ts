import {
  DIAGNOSTIC_CHECKS,
} from "@/lib/diagnostics-catalog";
import {
  FLIP_INTAKE_CHECKLIST,
  INTAKE_CHECKLIST,
  INTAKE_PHYSICAL_ZONES,
} from "@/lib/intake-catalog";
import {
  CONDITION_GRADES,
  COSMETIC_FAULTS,
  REPAIR_FAULTS,
  labelForOption,
} from "@/lib/intake-options";
import {
  FLIP_STATUS_LABELS,
  REPAIR_STATUS_LABELS,
} from "@/lib/labels";
import { grossProfitOre } from "@/lib/money";
import {
  dateLabel,
  dateOnlyLabel,
  moneyLabel,
  type JobSummaryDocument,
  type SummarySection,
} from "@/lib/pdf/summary-document";
import { listActivity } from "@/server/activity";
import { listAttachments } from "@/server/attachments";
import { getCustomer } from "@/server/customers";
import { getDevice } from "@/server/devices";
import {
  getDiagnosticsForFlip,
  getDiagnosticsForTicket,
} from "@/server/diagnostics";
import { getFlipIntakeInspection } from "@/server/flip-intake";
import { getFlip } from "@/server/flips";
import { getIntakeInspection } from "@/server/intake";
import { listFlipParts } from "@/server/parts";
import {
  getRepair,
  getRepairAssigneeName,
  listRepairNotes,
  listRepairParts,
  listRepairServices,
  listRepairStatusHistory,
} from "@/server/repairs";
import { getWarrantyForTicket } from "@/server/warranty";

const CHECK_RESULT_LABELS: Record<string, string> = {
  PASS: "OK",
  FAIL: "Avvik / feil",
  NOT_TESTED: "Ikke testet",
  NOT_APPLICABLE: "Ikke relevant",
};

const PART_STATUS_LABELS: Record<string, string> = {
  USED: "Brukt",
  ORDERED: "Bestilt",
  CANCELLED: "Kansellert",
};

const COST_CATEGORY_LABELS: Record<string, string> = {
  PURCHASE: "Kjøp",
  SHIPPING: "Frakt",
  PART: "Del",
  CONSUMABLE: "Forbruk",
  TOOL: "Verktøy",
  PLATFORM_FEE: "Plattformgebyr",
  OTHER: "Annet",
};

const PHOTO_CATEGORY_LABELS: Record<string, string> = {
  BEFORE: "Før",
  DURING: "Under arbeid",
  AFTER: "Etter",
  DAMAGE: "Skade",
  SERIAL_NUMBER: "Serienummer / IMEI",
  OTHER: "Annet",
  INTAKE_FRONT: "Mottak: forside",
  INTAKE_BACK: "Mottak: bakside",
  INTAKE_LEFT: "Mottak: venstre",
  INTAKE_RIGHT: "Mottak: høyre",
  INTAKE_TOP: "Mottak: topp",
  INTAKE_BOTTOM: "Mottak: bunn",
};

function zoneLabel(key: string) {
  return (
    INTAKE_PHYSICAL_ZONES.find((z) => z.key === key)?.label ?? key
  );
}

function checkLabel(
  key: string,
  catalog: readonly { key: string; label: string }[],
) {
  return catalog.find((c) => c.key === key)?.label ?? key;
}

function diagnosticLabel(key: string) {
  return DIAGNOSTIC_CHECKS.find((c) => c.key === key)?.label ?? key;
}

function resultLabel(result: string) {
  return CHECK_RESULT_LABELS[result] ?? result;
}

function intakeSections(
  intake: {
    damageNotes: string | null;
    physicalZones: Record<string, string>;
    checklist: Record<
      string,
      { result: string; note?: string }
    >;
    completedAt?: Date | string | null;
  } | null,
  checklistCatalog: readonly { key: string; label: string }[],
): SummarySection[] {
  if (!intake) {
    return [
      {
        title: "Mottakskontroll",
        emptyText: "Mottakskontroll er ikke utført.",
      },
    ];
  }

  const zones = Object.entries(intake.physicalZones ?? {})
    .filter(([, note]) => Boolean(note?.trim()))
    .map(([key, note]) => `${zoneLabel(key)}: ${note}`);

  const checks = Object.entries(intake.checklist ?? {}).map(
    ([key, value]) => {
      if (!value || typeof value !== "object") {
        return `${checkLabel(key, checklistCatalog)}: ${String(value ?? "—")}`;
      }
      const note = value.note?.trim() ? ` — ${value.note.trim()}` : "";
      return `${checkLabel(key, checklistCatalog)}: ${resultLabel(value.result)}${note}`;
    },
  );

  const failChecks = Object.entries(intake.checklist ?? {})
    .filter(([, v]) => v && typeof v === "object" && v.result === "FAIL")
    .map(([key, value]) => {
      const note = value.note?.trim() ? ` — ${value.note.trim()}` : "";
      return `${checkLabel(key, checklistCatalog)}${note}`;
    });

  return [
    {
      title: "Mottakskontroll",
      rows: [
        {
          label: "Fullført",
          value: dateLabel(intake.completedAt),
        },
      ],
      paragraphs: intake.damageNotes
        ? [`Skadenotater: ${intake.damageNotes}`]
        : undefined,
      bullets: zones.length ? zones : undefined,
      emptyText: "Ingen mottaksdetaljer.",
    },
    {
      title: "Sjekkliste mottak",
      bullets: checks,
      emptyText: "Ingen sjekklistepunkter.",
    },
    {
      title: "Avvik i mottak",
      bullets: failChecks,
      emptyText: "Ingen avvik registrert i mottak.",
    },
  ];
}

function diagnosticsSections(
  diag: Awaited<ReturnType<typeof getDiagnosticsForTicket>>,
): SummarySection[] {
  if (!diag) {
    return [
      {
        title: "Diagnostikk",
        emptyText: "Diagnostikk er ikke startet.",
      },
    ];
  }

  const bullets = diag.results.map((r) => {
    const note = r.note?.trim() ? ` — ${r.note.trim()}` : "";
    return `${diagnosticLabel(r.checkKey)}: ${resultLabel(r.result)}${note}`;
  });

  const fails = diag.results
    .filter((r) => r.result === "FAIL")
    .map((r) => {
      const note = r.note?.trim() ? ` — ${r.note.trim()}` : "";
      return `${diagnosticLabel(r.checkKey)}${note}`;
    });

  return [
    {
      title: "Diagnostikk",
      paragraphs: diag.diagnostics.notes
        ? [diag.diagnostics.notes]
        : undefined,
      bullets,
      emptyText: "Ingen diagnostikkpunkter.",
    },
    {
      title: "Feil funnet i diagnostikk",
      bullets: fails,
      emptyText: "Ingen feil markert i diagnostikk.",
    },
  ];
}

function partsSection(
  parts: Array<{
    partName: string | null;
    partSku: string | null;
    quantity: number;
    unitCostOre: number;
    status: string;
    notes: string | null;
  }>,
): SummarySection {
  return {
    title: "Deler",
    bullets: parts.map((p) => {
      const status =
        PART_STATUS_LABELS[p.status] ?? p.status;
      const sku = p.partSku ? ` (${p.partSku})` : "";
      const note = p.notes?.trim() ? ` — ${p.notes.trim()}` : "";
      return `${p.quantity} × ${p.partName ?? "Ukjent del"}${sku} · ${moneyLabel(p.unitCostOre)} · ${status}${note}`;
    }),
    emptyText: "Ingen deler knyttet.",
  };
}

function photosSection(
  photos: Array<{
    fileName: string;
    category: string | null;
    description: string | null;
    visibility: string;
    createdAt: Date | string;
  }>,
): SummarySection {
  return {
    title: "Bilder / vedlegg",
    bullets: photos.map((p) => {
      const cat =
        PHOTO_CATEGORY_LABELS[p.category ?? ""] ?? p.category ?? "Annet";
      const vis = p.visibility === "CUSTOMER" ? "Kunde" : "Internt";
      const desc = p.description?.trim()
        ? ` — ${p.description.trim()}`
        : "";
      return `${p.fileName} · ${cat} · ${vis} · ${dateLabel(p.createdAt)}${desc}`;
    }),
    emptyText: "Ingen bilder eller vedlegg.",
  };
}

export async function buildRepairSummaryDocument(
  ticketId: string,
): Promise<JobSummaryDocument | null> {
  const ticket = await getRepair(ticketId);
  if (!ticket) return null;

  const [
    customer,
    device,
    notes,
    history,
    usedParts,
    usedServices,
    diag,
    warranty,
    photos,
    assigneeName,
    intake,
    activity,
  ] = await Promise.all([
    getCustomer(ticket.customerId),
    getDevice(ticket.deviceId),
    listRepairNotes(ticketId),
    listRepairStatusHistory(ticketId),
    listRepairParts(ticketId),
    listRepairServices(ticketId),
    getDiagnosticsForTicket(ticketId),
    getWarrantyForTicket(ticketId),
    listAttachments("repair_ticket", ticketId),
    getRepairAssigneeName(ticket.assigneeId),
    getIntakeInspection(ticketId),
    listActivity({
      entityType: "repair_ticket",
      entityId: ticketId,
      limit: 30,
    }),
  ]);

  const customerPrice = ticket.customerPriceOre ?? 0;
  const partsCost = ticket.actualPartsCostOre ?? 0;
  const otherCosts = ticket.otherCostsOre ?? 0;
  const profit = grossProfitOre({
    customerPriceOre: customerPrice,
    partsCostOre: partsCost,
    otherCostsOre: otherCosts,
  });

  const deviceLabel = [
    device?.brand,
    device?.model,
    device?.storage,
    device?.color,
  ]
    .filter(Boolean)
    .join(" ");

  const sections: SummarySection[] = [
    {
      title: "Oversikt",
      rows: [
        { label: "Saksnummer", value: ticket.ticketNumber },
        {
          label: "Status",
          value:
            REPAIR_STATUS_LABELS[
              ticket.status as keyof typeof REPAIR_STATUS_LABELS
            ] ?? ticket.status,
        },
        { label: "Tekniker", value: assigneeName || "Ikke tildelt" },
        { label: "Opprettet", value: dateLabel(ticket.createdAt) },
        {
          label: "Estimert ferdig",
          value: dateOnlyLabel(ticket.estimatedCompletionDate),
        },
        { label: "Fullført", value: dateLabel(ticket.completedAt) },
        { label: "Betaling", value: ticket.paymentStatus },
      ],
    },
    {
      title: "Kunde",
      rows: customer
        ? [
            { label: "Navn", value: customer.name },
            { label: "Telefon", value: customer.phone },
            { label: "E-post", value: customer.email },
            {
              label: "Adresse",
              value: [
                customer.streetAddress,
                [customer.postalCode, customer.city]
                  .filter(Boolean)
                  .join(" "),
                customer.country,
              ]
                .filter(Boolean)
                .join(", "),
            },
            { label: "Kundenotat", value: customer.notes || "—" },
          ]
        : undefined,
      emptyText: "Kunde mangler.",
    },
    {
      title: "Enhet",
      rows: device
        ? [
            { label: "Enhet", value: deviceLabel || "—" },
            { label: "Variant", value: device.variant || "—" },
            { label: "IMEI", value: device.imei || "—" },
            { label: "Serienummer", value: device.serialNumber || "—" },
            {
              label: "Batterihelse",
              value:
                device.batteryHealth != null
                  ? `${device.batteryHealth} %`
                  : "—",
            },
            { label: "Tilstand", value: device.condition || "—" },
            { label: "Eierskap", value: device.ownershipType },
          ]
        : undefined,
      emptyText: "Enhet mangler.",
    },
    {
      title: "Problem / hva må fikses",
      paragraphs: [
        `Kundens beskrivelse: ${ticket.customerProblem || "—"}`,
        `Intern / diagnose: ${ticket.internalProblem || "—"}`,
        `Fysisk tilstand: ${ticket.physicalCondition || "—"}`,
      ],
    },
    ...intakeSections(intake, INTAKE_CHECKLIST),
    ...diagnosticsSections(diag),
    {
      title: "Tjenester",
      bullets: usedServices.map((s) => {
        const code = s.serviceCode ? ` [${s.serviceCode}]` : "";
        return `${s.serviceName ?? "Tjeneste"}${code} · ${moneyLabel(s.priceOre)}`;
      }),
      paragraphs:
        ticket.discountOre > 0
          ? [
              `Rabatt (${ticket.discountLabel || "Rabatt"}): −${moneyLabel(ticket.discountOre)}`,
            ]
          : undefined,
      emptyText: "Ingen tjenester lagt til.",
    },
    partsSection(usedParts),
    {
      title: "Økonomi",
      rows: [
        { label: "Kundepris", value: moneyLabel(customerPrice) },
        { label: "Delkost", value: moneyLabel(partsCost) },
        { label: "Andre kostnader", value: moneyLabel(otherCosts) },
        { label: "Fortjeneste", value: moneyLabel(profit) },
        {
          label: "Estimert delkost",
          value: moneyLabel(ticket.estimatedPartsCostOre),
        },
      ],
    },
    {
      title: "Kommentarer / notater",
      bullets: notes.map((n) => {
        const vis = n.visibility === "CUSTOMER" ? "Kunde" : "Internt";
        return `[${vis}] ${dateLabel(n.createdAt)} — ${n.content}`;
      }),
      emptyText: "Ingen kommentarer.",
    },
    {
      title: "Statushistorikk",
      bullets: history.map((h) => {
        const from =
          REPAIR_STATUS_LABELS[
            h.fromStatus as keyof typeof REPAIR_STATUS_LABELS
          ] ??
          h.fromStatus ??
          "—";
        const to =
          REPAIR_STATUS_LABELS[
            h.toStatus as keyof typeof REPAIR_STATUS_LABELS
          ] ?? h.toStatus;
        const note = h.note?.trim() ? ` — ${h.note.trim()}` : "";
        return `${dateLabel(h.createdAt)}: ${from} → ${to}${note}`;
      }),
      emptyText: "Ingen statusendringer.",
    },
    {
      title: "Garanti",
      rows: warranty
        ? [
            { label: "Dager", value: String(warranty.days) },
            { label: "Start", value: dateOnlyLabel(warranty.startsAt) },
            { label: "Slutt", value: dateOnlyLabel(warranty.endsAt) },
          ]
        : undefined,
      emptyText: "Ingen garanti registrert.",
    },
    photosSection(photos),
    {
      title: "Aktivitet",
      bullets: activity.map(
        (a) => `${dateLabel(a.createdAt)} — ${a.message}`,
      ),
      emptyText: "Ingen aktivitet.",
    },
  ];

  return {
    kind: "repair",
    title: `Sammendrag · ${ticket.ticketNumber}`,
    subtitle: [deviceLabel, customer?.name].filter(Boolean).join(" · "),
    statusLabel:
      REPAIR_STATUS_LABELS[
        ticket.status as keyof typeof REPAIR_STATUS_LABELS
      ] ?? ticket.status,
    generatedAt: new Date(),
    sections,
  };
}

export async function buildFlipSummaryDocument(
  refurbishmentId: string,
): Promise<JobSummaryDocument | null> {
  const detail = await getFlip(refurbishmentId);
  if (!detail) return null;
  const { flip, costs, listings, sales } = detail;

  const [intake, diag, photos, flipParts] = await Promise.all([
    getFlipIntakeInspection(refurbishmentId),
    getDiagnosticsForFlip(refurbishmentId),
    listAttachments("refurbishment", refurbishmentId),
    listFlipParts(refurbishmentId),
  ]);

  const deviceLabel = [flip.model, flip.storage, flip.color]
    .filter(Boolean)
    .join(" ");

  const cosmetic = (
    Array.isArray(flip.cosmeticFaultKeys) ? flip.cosmeticFaultKeys : []
  ).map((k) => labelForOption(COSMETIC_FAULTS, k));
  const repairFaults = (
    Array.isArray(flip.repairFaultKeys) ? flip.repairFaultKeys : []
  ).map((k) => labelForOption(REPAIR_FAULTS, k));

  const sections: SummarySection[] = [
    {
      title: "Oversikt",
      rows: [
        { label: "Flipnummer", value: flip.flipNumber },
        {
          label: "Status",
          value:
            FLIP_STATUS_LABELS[
              flip.status as keyof typeof FLIP_STATUS_LABELS
            ] ?? flip.status,
        },
        { label: "Opprettet", value: dateLabel(flip.createdAt) },
        { label: "Kjøpt", value: dateLabel(flip.purchasedAt) },
        { label: "Mottatt", value: dateLabel(flip.receivedAt) },
        { label: "Solgt", value: dateLabel(flip.soldAt) },
      ],
    },
    {
      title: "Enhet",
      rows: [
        { label: "Modell", value: deviceLabel || "—" },
        { label: "IMEI", value: flip.imei || "—" },
        { label: "Serienummer", value: flip.serialNumber || "—" },
        {
          label: "Batterihelse",
          value:
            flip.batteryHealth != null ? `${flip.batteryHealth} %` : "—",
        },
        {
          label: "Activation Lock klar",
          value: flip.activationLockClear ? "Ja" : "Nei",
        },
        {
          label: "Find My av",
          value: flip.findMyOff ? "Ja" : "Nei",
        },
      ],
      paragraphs: flip.notes ? [`Notater: ${flip.notes}`] : undefined,
    },
    {
      title: "Tilstand",
      rows: [
        {
          label: "Karakter",
          value: flip.conditionGrade
            ? labelForOption(CONDITION_GRADES, flip.conditionGrade)
            : "—",
        },
      ],
      paragraphs: [
        flip.conditionSummary
          ? `Sammendrag: ${flip.conditionSummary}`
          : null,
        flip.conditionComment
          ? `Kommentar: ${flip.conditionComment}`
          : null,
      ].filter(Boolean) as string[],
      bullets: cosmetic,
      emptyText: "Ingen tilstand registrert.",
    },
    {
      title: "Feil / hva må fikses",
      paragraphs: [
        flip.faultSummary ? `Sammendrag: ${flip.faultSummary}` : null,
        flip.faultComment ? `Kommentar: ${flip.faultComment}` : null,
      ].filter(Boolean) as string[],
      bullets: repairFaults,
      emptyText: "Ingen reparasjonsfeil registrert.",
    },
    ...intakeSections(intake, FLIP_INTAKE_CHECKLIST),
    ...diagnosticsSections(diag),
    partsSection(flipParts),
    {
      title: "Kostnader",
      bullets: costs.map((c) => {
        const cat =
          COST_CATEGORY_LABELS[c.category] ?? c.category;
        return `${cat}: ${c.label} · ${moneyLabel(c.amountOre)}`;
      }),
      emptyText: "Ingen kostnadslinjer.",
    },
    {
      title: "Økonomi",
      rows: [
        {
          label: "Kjøp",
          value: moneyLabel(
            flip.actualPurchaseOre ?? flip.estimatedPurchaseOre,
          ),
        },
        {
          label: "Reparasjon",
          value: moneyLabel(
            flip.actualRepairOre ?? flip.estimatedRepairOre,
          ),
        },
        {
          label: "Salg",
          value: moneyLabel(flip.actualSaleOre ?? flip.estimatedSaleOre),
        },
        {
          label: "Profit",
          value: moneyLabel(
            flip.actualProfitOre ?? flip.estimatedProfitOre,
          ),
        },
      ],
    },
    {
      title: "Annonser",
      bullets: listings.map((l) => {
        const url = l.listingUrl ? ` · ${l.listingUrl}` : "";
        return `${l.platform}: ${l.title} · ${moneyLabel(l.salePriceOre)} · ${l.status}${url}`;
      }),
      emptyText: "Ingen annonser.",
    },
    {
      title: "Salg",
      bullets: sales.map((s) => {
        const buyer = s.buyerName ? ` · ${s.buyerName}` : "";
        return `${dateLabel(s.soldAt)} · ${s.platform || "—"} · ${moneyLabel(s.salePriceOre)}${buyer}`;
      }),
      emptyText: "Ingen salg registrert.",
    },
    photosSection(photos),
  ];

  return {
    kind: "flip",
    title: `Sammendrag · ${flip.flipNumber}`,
    subtitle: deviceLabel || "Flip",
    statusLabel:
      FLIP_STATUS_LABELS[
        flip.status as keyof typeof FLIP_STATUS_LABELS
      ] ?? flip.status,
    generatedAt: new Date(),
    sections,
  };
}
