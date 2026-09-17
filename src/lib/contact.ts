export const INQUIRY_TYPES = [
  {
    id: "general",
    label: "Generell henvendelse",
    description: "Spørsmål eller annet",
  },
  {
    id: "custom",
    label: "Skreddersydd løsning",
    description: "Egen programvare eller digital plattform",
  },
] as const;

export type InquiryTypeId = (typeof INQUIRY_TYPES)[number]["id"];

export type RepairRequestDetails = {
  modelId: string;
  modelLabel: string;
  serviceIds: string[];
  serviceLabels: string[];
  estimatedTotal: number;
  comment?: string;
};

export type ContactPayload = {
  inquiryType: InquiryTypeId;
  name: string;
  email: string;
  organization?: string;
  message: string;
  timeline?: string;
  budget?: string;
  phone?: string;
  repair?: RepairRequestDetails;
};

export const CONTACT_TO = "kontakt@sd-solutions.org";
export const CONTACT_FROM = "Kontaktskjema <kontaktskjema@kartarkiv.co>";

export function inquiryLabel(id: InquiryTypeId): string {
  return INQUIRY_TYPES.find((t) => t.id === id)?.label ?? id;
}
