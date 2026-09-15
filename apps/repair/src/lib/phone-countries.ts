export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

function flagEmoji(iso: string) {
  return iso
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0)),
    );
}

function country(iso: string, name: string, dial: string): PhoneCountry {
  return { iso, name, dial, flag: flagEmoji(iso) };
}

const PINNED = ["NO", "SE", "DK"] as const;

const ALL: PhoneCountry[] = [
  country("NO", "Norge", "47"),
  country("SE", "Sverige", "46"),
  country("DK", "Danmark", "45"),
  country("FI", "Finland", "358"),
  country("IS", "Island", "354"),
  country("DE", "Tyskland", "49"),
  country("NL", "Nederland", "31"),
  country("BE", "Belgia", "32"),
  country("FR", "Frankrike", "33"),
  country("GB", "Storbritannia", "44"),
  country("IE", "Irland", "353"),
  country("ES", "Spania", "34"),
  country("PT", "Portugal", "351"),
  country("IT", "Italia", "39"),
  country("AT", "Østerrike", "43"),
  country("CH", "Sveits", "41"),
  country("PL", "Polen", "48"),
  country("CZ", "Tsjekkia", "420"),
  country("LT", "Litauen", "370"),
  country("LV", "Latvia", "371"),
  country("EE", "Estland", "372"),
  country("US", "USA", "1"),
];

const BY_ISO = new Map(ALL.map((c) => [c.iso, c]));

export const PHONE_COUNTRIES: PhoneCountry[] = [
  ...PINNED.map((iso) => BY_ISO.get(iso)!),
  ...ALL.filter((c) => !PINNED.includes(c.iso as (typeof PINNED)[number])).sort(
    (a, b) => a.name.localeCompare(b.name, "nb"),
  ),
];

export function getPhoneCountry(iso?: string | null): PhoneCountry {
  const key = iso?.trim().toUpperCase() || "NO";
  return BY_ISO.get(key) ?? BY_ISO.get("NO")!;
}
