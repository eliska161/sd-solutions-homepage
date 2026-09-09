"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { MoneyText } from "@/components/ui/MoneyText";
import { Select } from "@/components/ui/Select";
import {
  addServiceToRepair,
  removeServiceFromRepair,
} from "@/server/repairs";
import { createService } from "@/server/services-catalog";
import { parseKrToOre } from "@/lib/labels";

type ServiceOption = {
  id: string;
  code: string;
  name: string;
  customerPriceOre: number;
  active: boolean;
};

type UsedService = {
  id: string;
  serviceCode: string | null;
  serviceName: string | null;
  priceOre: number;
};

export function TicketServicesPanel({
  ticketId,
  usedServices,
  catalogServices,
}: {
  ticketId: string;
  usedServices: UsedService[];
  catalogServices: ServiceOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serviceId, setServiceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(catalogServices.length === 0);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [priceKr, setPriceKr] = useState("");

  const active = catalogServices.filter((s) => s.active);

  function removeService(repairServiceId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await removeServiceFromRepair({ ticketId, repairServiceId });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feil");
      }
    });
  }

  return (
    <div className="space-y-4">
      {usedServices.length === 0 ? (
        <p className="text-sm text-muted">Ingen tjenester lagt til.</p>
      ) : (
        usedServices.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 text-sm border-b border-border pb-2"
          >
            <span>
              {s.serviceCode} · {s.serviceName}
            </span>
            <div className="flex items-center gap-2">
              <MoneyText ore={s.priceOre} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => removeService(s.id)}
              >
                Fjern
              </Button>
            </div>
          </div>
        ))
      )}

      {active.length > 0 ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!serviceId) return;
            startTransition(async () => {
              try {
                await addServiceToRepair({ ticketId, serviceId });
                setServiceId("");
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Feil");
              }
            });
          }}
        >
          <Select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
            className="max-w-sm flex-1"
          >
            <option value="">Velg tjeneste…</option>
            {active.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({Math.round(s.customerPriceOre / 100)} kr)
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" disabled={pending}>
            Legg til
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
          >
            Ny tjeneste
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Ingen tjenester i katalogen ennå. Opprett en nedenfor.
        </p>
      )}

      {showCreate ? (
        <form
          className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              try {
                const created = await createService({
                  code:
                    code.trim() ||
                    `SVC-${Date.now().toString(36).toUpperCase()}`,
                  name: name.trim(),
                  customerPriceOre: parseKrToOre(priceKr) || 0,
                  active: true,
                });
                await addServiceToRepair({
                  ticketId,
                  serviceId: created.id,
                });
                setCode("");
                setName("");
                setPriceKr("");
                setShowCreate(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Feil");
              }
            });
          }}
        >
          <p className="sm:col-span-2 text-sm font-medium">Opprett tjeneste</p>
          <div>
            <Label htmlFor="svcCode">Kode</Label>
            <Input
              id="svcCode"
              className="mt-1.5"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SCREEN-IP15"
            />
          </div>
          <div>
            <Label htmlFor="svcPrice">Pris (kr)</Label>
            <Input
              id="svcPrice"
              className="mt-1.5"
              value={priceKr}
              onChange={(e) => setPriceKr(e.target.value)}
              placeholder="2499"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="svcName">Navn *</Label>
            <Input
              id="svcName"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Skjermbytte iPhone 15"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={pending || !name.trim()}>
              Opprett og legg til
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreate(false)}
            >
              Avbryt
            </Button>
          </div>
        </form>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
