import Link from "next/link";

export const REPAIR_TABS = [
  { id: "oversikt", label: "Oversikt" },
  { id: "mottak", label: "Mottak" },
  { id: "diagnose", label: "Diagnose" },
  { id: "jobb", label: "Jobb" },
  { id: "oppdateringer", label: "Oppdateringer" },
  { id: "bilder", label: "Bilder" },
  { id: "notater", label: "Notater" },
  { id: "mer", label: "Mer" },
] as const;

export type RepairTabId = (typeof REPAIR_TABS)[number]["id"];

export function repairHref(ticketId: string, tab: RepairTabId) {
  if (tab === "oversikt") return `/repairs/${ticketId}`;
  return `/repairs/${ticketId}?tab=${tab}`;
}

export function parseRepairTab(raw: string | undefined): RepairTabId {
  return REPAIR_TABS.some((t) => t.id === raw)
    ? (raw as RepairTabId)
    : "oversikt";
}

export function TicketTabNav({
  ticketId,
  tab,
}: {
  ticketId: string;
  tab: RepairTabId;
}) {
  return (
    <nav
      className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
      aria-label="Ticket-faner"
    >
      {REPAIR_TABS.map((item) => {
        const active = item.id === tab;
        return (
          <Link
            key={item.id}
            href={repairHref(ticketId, item.id)}
            className={[
              "shrink-0 px-3 py-2 text-[13px]",
              active
                ? "border-b-2 border-accent font-medium text-foreground"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
