"use client";

import PhoneInput from "react-phone-number-input";
import nb from "react-phone-number-input/locale/nb";
import "react-phone-number-input/style.css";
import { Label } from "@/components/ui/Label";

export function PhoneCountryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="phone-field">
      <Label htmlFor="phone">Telefon</Label>
      <PhoneInput
        id="phone"
        international
        defaultCountry="NO"
        countryCallingCodeEditable={false}
        countryOptionsOrder={["NO", "SE", "DK", "|", "..."]}
        addInternationalOption={false}
        labels={nb}
        value={value || undefined}
        onChange={(next) => onChange(next ?? "")}
        numberInputProps={{
          id: "phone",
          name: "phone",
          required: true,
          autoComplete: "tel",
          inputMode: "tel",
        }}
      />
    </div>
  );
}
