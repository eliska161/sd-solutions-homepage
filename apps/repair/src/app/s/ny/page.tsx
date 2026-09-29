import { listIphoneModels } from "@/lib/apple-models";
import { PageHeader } from "@/components/layout/PageHeader";
import { NextDayTimer } from "@/components/NextDayTimer";
import { isCustomerVatCharged } from "@/server/settings";
import { ServiceOrderForm } from "./ServiceOrderForm";

export const dynamic = "force-dynamic";

export default async function NewServiceOrderPage() {
  const models = listIphoneModels();
  const chargeVat = await isCustomerVatCharged();

  return (
    <div>
      <div className="mb-4">
        <NextDayTimer />
      </div>
      <PageHeader
        title="Opprett serviceordre"
        description="Ett kort om gangen: kontakt, enhet, reparasjon, levering og signatur. Vi tar saken inn når enheten er levert."
      />
      <ServiceOrderForm models={models} chargeVat={chargeVat} />
      <p className="mt-4 text-[12px] text-muted">
        SD Solutions · Slåttmyrvegen 49, 2406 Elverum
      </p>
    </div>
  );
}
