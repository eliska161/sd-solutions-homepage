export const WORKSHOP = {
  name: "SD Solutions",
  streetAddress: "Slåttmyrvegen 49",
  postalCode: "2406",
  city: "Elverum",
  hoursLabel: "Mandag-lørdag 12:00-18:00",
} as const;

export function workshopAddressLines() {
  return [
    WORKSHOP.streetAddress,
    `${WORKSHOP.postalCode} ${WORKSHOP.city}`,
  ] as const;
}

export function workshopAddressOneLine() {
  return `${WORKSHOP.streetAddress}, ${WORKSHOP.postalCode} ${WORKSHOP.city}`;
}
