/**
 * Offentlig firmainfo brukt på nettsiden (online presence).
 * Fyll inn gateadresse før du sender lenken til iFixit Pro.
 */
export const company = {
  brandName: "SD Solutions",
  legalName: "Skaug-Danielsen Solutions",
  email: "eliasskaugdanielsen10@gmail.com",
  /** Sett inn aktiv forretningsadresse (påkrevd for iFixit Pro). */
  address: {
    line1: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS_LINE1 ?? "",
    postalCode: process.env.NEXT_PUBLIC_BUSINESS_POSTAL_CODE ?? "",
    city: process.env.NEXT_PUBLIC_BUSINESS_CITY ?? "",
    country: "Norge",
  },
  organizationType:
    "IT-firma og mobilreparasjon — programvareutvikling og iPhone-reparasjon",
  servicesFocus: "iPhone-reparasjon",
  urls: {
    kartarkiv: "https://kartarkiv.co",
  },
} as const;

export function hasBusinessAddress(): boolean {
  const { line1, postalCode, city } = company.address;
  return Boolean(line1 && postalCode && city);
}

export function formatBusinessAddress(): string {
  const { line1, postalCode, city, country } = company.address;
  const lines = [line1, [postalCode, city].filter(Boolean).join(" "), country].filter(
    Boolean,
  );
  return lines.join(", ");
}
