"use client";

import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { PHONE_COUNTRIES, getPhoneCountry } from "@/lib/phone-countries";

export function PhoneCountryField({
  countryIso,
  nationalNumber,
  onCountryChange,
  onNumberChange,
}: {
  countryIso: string;
  nationalNumber: string;
  onCountryChange: (iso: string) => void;
  onNumberChange: (value: string) => void;
}) {
  const selected = getPhoneCountry(countryIso);

  return (
    <div>
      <Label htmlFor="phone">Telefon</Label>
      <div className="mt-1 flex gap-2">
        <Select
          id="phoneCountry"
          name="phoneCountry"
          className="w-[11.5rem] shrink-0"
          value={selected.iso}
          aria-label="Landskode"
          onChange={(e) => onCountryChange(e.target.value)}
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} +{c.dial} {c.name}
            </option>
          ))}
        </Select>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          className="min-w-0 flex-1"
          autoComplete="tel-national"
          placeholder="Mobilnummer"
          value={nationalNumber}
          onChange={(e) => onNumberChange(e.target.value)}
        />
      </div>
    </div>
  );
}
