export const company = {
  brandName: "SD Solutions",
  legalName: "Skaug-Danielsen Solutions",
  repairName: "SD Solutions Repair",
  repairDescription:
    "Vi reparerer og refurbisher mobiltelefoner, hovedsaklig iPhone. Vanlige jobber er skjerm, batteri, ladeport, kamera, lyd og diagnostikk. Du oppretter en serviceordre, så tar vi saken inn når enheten er levert.",
  email: "eliasskaugdanielsen10@gmail.com",
  address: {
    line1: "Slåttmyrvegen 49",
    postalCode: "2406",
    city: "Elverum",
    country: "Norge",
  },
  urls: {
    kartarkiv: "https://kartarkiv.co",
  },
} as const;

export function formatBusinessAddress(): string {
  const { line1, postalCode, city, country } = company.address;
  return `${line1}, ${postalCode} ${city}, ${country}`;
}
