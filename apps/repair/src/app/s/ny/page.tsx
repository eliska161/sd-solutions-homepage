import { listIphoneModels } from "@/lib/apple-models";
import { PageHeader } from "@/components/layout/PageHeader";
import { NextDayTimer } from "@/components/NextDayTimer";
import { ServiceOrderForm } from "./ServiceOrderForm";

export const dynamic = "force-dynamic";

export default function NewServiceOrderPage() {
  const models = listIphoneModels();

  return (
    <div>
      <div className="mb-4">
        <NextDayTimer />
      </div>
      <PageHeader
        title="Opprett serviceordre"
        description="Ett kort om gangen: kontakt, enhet, reparasjon, levering og signatur. Vi tar saken inn når enheten er levert."
      />
      <ServiceOrderForm models={models} />
      <p className="mt-4 text-[12px] text-muted">
        SD Solutions · Slåttmyrvegen 49, 2406 Elverum
      </p>
    </div>
  );
}
