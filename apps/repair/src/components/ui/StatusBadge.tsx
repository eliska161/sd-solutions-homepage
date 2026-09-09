import { Badge } from "@/components/ui/Badge";
import {
  FLIP_STATUS_LABELS,
  REPAIR_STATUS_LABELS,
  repairStatusTone,
  flipStatusTone,
} from "@/lib/labels";

export function RepairStatusBadge({ status }: { status: string }) {
  const label =
    REPAIR_STATUS_LABELS[status as keyof typeof REPAIR_STATUS_LABELS] ?? status;
  return <Badge tone={repairStatusTone(status)}>{label}</Badge>;
}

export function FlipStatusBadge({ status }: { status: string }) {
  const label =
    FLIP_STATUS_LABELS[status as keyof typeof FLIP_STATUS_LABELS] ?? status;
  return <Badge tone={flipStatusTone(status)}>{label}</Badge>;
}

export function StatusBadge({
  kind,
  status,
}: {
  kind: "repair" | "flip";
  status: string;
}) {
  return kind === "repair" ? (
    <RepairStatusBadge status={status} />
  ) : (
    <FlipStatusBadge status={status} />
  );
}
