import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MoneyText } from "@/components/ui/MoneyText";
import { getDashboardStats } from "@/server/dashboard";
import { listFlips } from "@/server/flips";

export default async function ReportsPage() {
  const [stats, sold] = await Promise.all([
    getDashboardStats(),
    listFlips("SOLD"),
  ]);

  const flipProfitTotal = sold.reduce(
    (sum, f) => sum + (f.actualProfitOre ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Rapporter"
        description="Enkle aggregater for verksted og flipping."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Reparasjon omsetning (mnd)</p>
            <p className="mt-2 text-2xl">
              <MoneyText ore={stats.monthly.repairRevenueOre} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Reparasjon profit (mnd)</p>
            <p className="mt-2 text-2xl">
              <MoneyText ore={stats.monthly.repairProfitOre} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Flip omsetning (mnd)</p>
            <p className="mt-2 text-2xl">
              <MoneyText ore={stats.monthly.flipRevenueOre} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Flip profit (mnd)</p>
            <p className="mt-2 text-2xl">
              <MoneyText ore={stats.monthly.flipProfitOre} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Total omsetning (mnd)</p>
            <p className="mt-2 text-2xl">
              <MoneyText ore={stats.monthly.totalRevenueOre} />
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] text-muted">Total profit (mnd)</p>
            <p className="mt-2 text-2xl">
              <MoneyText ore={stats.monthly.totalProfitOre} />
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Flip-profit (alle solgte)"
          actions={
            <Link href="/sales">
              <Button type="button" size="sm" variant="secondary">
                Se salg
              </Button>
            </Link>
          }
        />
        <CardBody>
          <p className="text-3xl font-medium">
            <MoneyText ore={flipProfitTotal} />
          </p>
          <p className="mt-2 text-sm text-muted">
            {sold.length} solgte flips totalt · åpne reparasjoner:{" "}
            {stats.counts.openRepairs}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
