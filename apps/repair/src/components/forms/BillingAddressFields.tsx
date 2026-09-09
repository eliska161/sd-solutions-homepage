"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type Suggestion = {
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  label: string;
};

type Props = {
  defaults?: {
    streetAddress?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
};

/** Norwegian-focused address autocomplete via Photon (Komoot/OSM). */
export function BillingAddressFields({ defaults }: Props) {
  const [streetAddress, setStreetAddress] = useState(defaults?.streetAddress ?? "");
  const [postalCode, setPostalCode] = useState(defaults?.postalCode ?? "");
  const [city, setCity] = useState(defaults?.city ?? "");
  const [country, setCountry] = useState(defaults?.country ?? "Norge");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/address-suggest?q=${encodeURIComponent(query)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        const mapped = data.suggestions ?? [];
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  function apply(s: Suggestion) {
    setStreetAddress(s.streetAddress);
    setPostalCode(s.postalCode);
    setCity(s.city);
    setCountry(s.country || "Norge");
    setQuery(s.label);
    setOpen(false);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="relative sm:col-span-2">
        <Label htmlFor="addressSearch">Søk adresse (autofyll)</Label>
        <Input
          id="addressSearch"
          className="mt-1.5"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          placeholder="Begynn å skrive gateadresse…"
          autoComplete="off"
        />
        {open ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-surface-elevated shadow-lg">
            {suggestions.map((s) => (
              <li key={s.label}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                  onClick={() => apply(s)}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="streetAddress">Gateadresse *</Label>
        <Input
          id="streetAddress"
          name="streetAddress"
          required
          className="mt-1.5"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="postalCode">Postnummer *</Label>
        <Input
          id="postalCode"
          name="postalCode"
          required
          className="mt-1.5"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="city">Sted *</Label>
        <Input
          id="city"
          name="city"
          required
          className="mt-1.5"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="country">Land *</Label>
        <Input
          id="country"
          name="country"
          required
          className="mt-1.5"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
      </div>
    </div>
  );
}
