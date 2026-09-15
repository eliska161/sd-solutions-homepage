import { CUSTOMER_PROGRESS_STEPS } from "@/lib/intake-catalog";
import { REPAIR_STATUS_LABELS } from "@/lib/labels";

export type ProgressStepState = "done" | "current" | "todo";

export type CustomerProgressStep = {
  key: string;
  label: string;
  state: ProgressStepState;
};

/** Map internal repair status to customer-facing progress steps. */
export function buildCustomerProgress(
  status: keyof typeof REPAIR_STATUS_LABELS | string,
  options?: { received?: boolean; outboundPost?: boolean },
): CustomerProgressStep[] {
  if (status === "CANCELLED" || status === "RETURNED") {
    return CUSTOMER_PROGRESS_STEPS.map((step) => ({
      key: step.key,
      label: step.label,
      state: "todo" as const,
    }));
  }

  let currentIndex = CUSTOMER_PROGRESS_STEPS.findIndex((step) =>
    (step.statuses as readonly string[]).includes(status),
  );
  if (currentIndex < 0) currentIndex = 0;
  if (status === "COMPLETED") {
    currentIndex = CUSTOMER_PROGRESS_STEPS.length - 1;
  }
  const received = options?.received !== false;
  if (!received) currentIndex = 0;

  const outboundPost = Boolean(options?.outboundPost);

  return CUSTOMER_PROGRESS_STEPS.map((step, index) => {
    let label: string = step.label;
    if (step.key === "RECEIVED" && !received) {
      label = "Bestilt — venter innlevering";
    }
    if (step.key === "READY" && outboundPost) {
      label = "Klar for utsending";
    }
    return {
      key: step.key,
      label,
      state:
        index < currentIndex
          ? ("done" as const)
          : index === currentIndex
            ? ("current" as const)
            : ("todo" as const),
    };
  });
}

export function customerStatusLabel(status: string): string {
  if (status === "CANCELLED") return "Kansellert";
  if (status === "RETURNED") return "Returnert";
  return (
    REPAIR_STATUS_LABELS[status as keyof typeof REPAIR_STATUS_LABELS] ?? status
  );
}

/** Soft badge tones for the public status pill — inspired by carrier/repair trackers. */
export function customerStatusTone(
  status: string,
): "progress" | "waiting" | "ready" | "done" | "alert" {
  switch (status) {
    case "CANCELLED":
    case "RETURNED":
      return "alert";
    case "WAITING_FOR_CUSTOMER":
    case "WAITING_FOR_PART":
      return "waiting";
    case "READY_FOR_PICKUP":
      return "ready";
    case "COMPLETED":
      return "done";
    default:
      return "progress";
  }
}
