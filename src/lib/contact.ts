export const INQUIRY_TYPES = [
  {
    id: "kartarkiv",
    label: "Kartarkiv",
    description: "Spørsmål om Kartarkiv for klubben din",
  },
  {
    id: "eok-kiosk",
    label: "EOK Kiosk",
    description: "Kiosk og tidtaking på løpsdag",
  },
  {
    id: "custom",
    label: "Skreddersydd løsning",
    description: "Egen programvare eller digital plattform",
  },
  {
    id: "general",
    label: "Generell henvendelse",
    description: "Annet eller usikker på hva du trenger",
  },
] as const;

export type InquiryTypeId = (typeof INQUIRY_TYPES)[number]["id"];

export type ContactPayload = {
  inquiryType: InquiryTypeId;
  name: string;
  email: string;
  organization?: string;
  message: string;
  // Kartarkiv
  clubName?: string;
  mapVolume?: string;
  currentStorage?: string;
  desiredStart?: string;
  // EOK Kiosk
  timingComputers?: string;
  usesEventor?: string;
  nextEvent?: string;
  // Custom
  timeline?: string;
  budget?: string;
};

export const CONTACT_TO = "eliasskaugdanielsen10@gmail.com";
export const CONTACT_FROM = "Kontaktskjema <kontaktskjema@kartarkiv.co>";

export function inquiryLabel(id: InquiryTypeId): string {
  return INQUIRY_TYPES.find((t) => t.id === id)?.label ?? id;
}
