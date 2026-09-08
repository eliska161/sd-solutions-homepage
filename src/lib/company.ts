export const company = {
  brandName: "SD Solutions",
  legalName: "Skaug-Danielsen Solutions",
  repairName: "SD Solutions Repair",
  repairDescription:
    "SD Solutions tilbyr reparasjon og refurbishing av mobiltelefoner, med hovedfokus på iPhone. Vi utfører blant annet skjerm- og batteribytter, reparasjon av ladeporter, kamera/lyd og diagnostikk.",
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
