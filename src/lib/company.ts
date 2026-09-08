export const company = {
  brandName: "SD Solutions",
  legalName: "Skaug-Danielsen Solutions",
  email: "eliasskaugdanielsen10@gmail.com",
  address: {
    line1: "Slåttmyrvegen 49",
    postalCode: "2406",
    city: "Elverum",
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
