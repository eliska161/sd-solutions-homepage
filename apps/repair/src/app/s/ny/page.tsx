import { listIphoneModels } from "@/lib/apple-models";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ServiceOrderForm } from "./ServiceOrderForm";

export const dynamic = "force-dynamic";

export default function NewServiceOrderPage() {
  const models = listIphoneModels();

  return (
    <div>
      <PageHeader
        title="Opprett serviceordre"
        description="Fyll inn kontaktinfo, IMEI eller serienummer, og hva som er galt. Vi tar saken inn når enheten er levert."
      />
      <Card>
        <CardHeader title="Ordre" />
        <CardBody>
          <ServiceOrderForm models={models} />
        </CardBody>
      </Card>
      <p className="mt-4 text-[12px] text-muted">
        SD Solutions · Slåttmyrvegen 49, 2406 Elverum
      </p>
    </div>
  );
}
