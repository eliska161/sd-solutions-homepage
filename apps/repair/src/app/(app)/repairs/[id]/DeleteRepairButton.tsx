"use client";

import { deleteRepair } from "@/server/repairs";
import { Button } from "@/components/ui/Button";

export function DeleteRepairButton({
  ticketId,
  ticketNumber,
}: {
  ticketId: string;
  ticketNumber: string;
}) {
  return (
    <form
      action={deleteRepair.bind(null, ticketId)}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Slett ${ticketNumber}? Saken og vedlegg forsvinner. Dette kan ikke angres.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="danger">
        Slett
      </Button>
    </form>
  );
}
