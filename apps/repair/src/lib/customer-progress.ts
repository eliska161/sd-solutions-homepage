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

  return CUSTOMER_PROGRESS_STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    state:
      index < currentIndex
        ? ("done" as const)
        : index === currentIndex
          ? ("current" as const)
          : ("todo" as const),
  }));
}

export function customerStatusLabel(status: string): string {
  if (status === "CANCELLED") return "Kansellert";
  if (status === "RETURNED") return "Returnert";
  return (
    REPAIR_STATUS_LABELS[status as keyof typeof REPAIR_STATUS_LABELS] ?? status
  );
}

export function customerStatusEmoji(status: string): string {
  switch (status) {
    case "NEW":
      return "📥";
    case "DIAGNOSTICS":
      return "🔍";
    case "WAITING_FOR_PART":
    case "WAITING_FOR_CUSTOMER":
    case "APPROVED":
      return "⏳";
    case "IN_REPAIR":
      return "🔧";
    case "TESTING":
      return "🧪";
    case "READY_FOR_PICKUP":
      return "✅";
    case "COMPLETED":
      return "🎉";
    case "CANCELLED":
    case "RETURNED":
      return "⛔";
    default:
      return "•";
  }
}
