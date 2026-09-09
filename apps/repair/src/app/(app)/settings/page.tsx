import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { getSetting, setSetting } from "@/server/settings";

type CompanyInfo = {
  name?: string;
  orgNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

async function saveCompanyAction(formData: FormData) {
  "use server";
  await setSetting("company.info", {
    name: String(formData.get("name") || ""),
    orgNumber: String(formData.get("orgNumber") || ""),
    address: String(formData.get("address") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    notes: String(formData.get("notes") || ""),
  } satisfies CompanyInfo);
  redirect("/settings");
}

export default async function SettingsPage() {
  const company =
    (await getSetting<CompanyInfo>("company.info")) ?? {
      name: "SD Solutions",
      address: "Elverum",
      email: "admin@sd-solutions.org",
    };

  return (
    <div>
      <PageHeader
        title="Innstillinger"
        description="Firmainfo og systemhint."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Firmainfo" />
          <CardBody>
            <form action={saveCompanyAction} className="grid gap-3">
              <div>
                <Label htmlFor="name">Firmanavn</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={company.name ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="orgNumber">Org.nr</Label>
                <Input
                  id="orgNumber"
                  name="orgNumber"
                  defaultValue={company.orgNumber ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={company.address ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={company.phone ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  name="email"
                  defaultValue={company.email ?? ""}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notater</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={company.notes ?? ""}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit">Lagre</Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Roller" />
            <CardBody className="space-y-2 text-sm text-muted">
              <p>
                <span className="text-foreground">ADMIN</span> — full tilgang,
                inkl. innstillinger.
              </p>
              <p>
                <span className="text-foreground">TECHNICIAN</span> — kan
                opprette og endre tickets, lager og flips.
              </p>
              <p>
                <span className="text-foreground">VIEWER</span> — kun lesing.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Demo-innlogging" />
            <CardBody className="text-sm text-muted">
              <p>
                E-post:{" "}
                <code className="text-foreground">admin@sd-solutions.org</code>
              </p>
              <p className="mt-2">
                Passord:{" "}
                <code className="text-foreground">RepairAdmin123!</code>
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
