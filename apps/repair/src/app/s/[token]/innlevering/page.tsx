import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { WORKSHOP, workshopAddressLines, workshopAddressOneLine } from "@/lib/workshop";
import { getPublicDropoffContext } from "@/server/public-service-order";
import { DropoffForm } from "./DropoffForm";

export const dynamic = "force-dynamic";

export default async function InnleveringPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicDropoffContext(token);
  if (!data) notFound();

  if (data.inboundMethod === "POST") {
    return (
      <div>
        <PageHeader
          title="Send selv"
          description={data.ticketNumber}
        />
        <Card>
          <CardHeader title="Sending" />
          <CardBody className="space-y-4 text-sm">
            <p>
              Send enheten til {workshopAddressOneLine()}.
            </p>
            <p>
              Merk pakken med referansenummer{" "}
              <span className="font-medium">{data.ticketNumber}</span>.
            </p>
            <Link
              href={`/s/${token}?ny=1`}
              className="inline-flex h-9 items-center justify-center rounded bg-accent px-3.5 text-sm font-medium text-white hover:bg-[#245a96]"
            >
              Gå til saken
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const [street, cityLine] = workshopAddressLines();

  return (
    <div>
      <PageHeader
        title="Lever inn"
        description={data.ticketNumber}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Hvor" />
          <CardBody className="space-y-1 text-sm">
            <p className="font-medium">{WORKSHOP.name}</p>
            <p>{street}</p>
            <p>{cityLine}</p>
            <p className="pt-2 text-muted">{WORKSHOP.hoursLabel}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Når" />
          <CardBody>
            {data.received ? (
              <p className="text-sm">Enheten er allerede mottatt.</p>
            ) : data.dropoffLabel ? (
              <div className="space-y-4 text-sm">
                <p>
                  Avtalt innlevering:{" "}
                  <span className="font-medium">{data.dropoffLabel}</span>
                </p>
                <p className="text-muted">
                  Du kan velge et nytt tidspunkt under hvis du må endre.
                </p>
                <DropoffForm token={token} />
                <p>
                  <Link
                    href={`/s/${token}`}
                    className="text-sm text-accent underline"
                  >
                    Gå til saken
                  </Link>
                </p>
              </div>
            ) : (
              <DropoffForm token={token} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
