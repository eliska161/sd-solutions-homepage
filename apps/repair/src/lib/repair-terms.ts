import {
  LEGAL_VERSION,
  fysiskReparasjonsvilkar,
  type LegalSection,
} from "@/lib/legal";
import { workshopAddressOneLine, WORKSHOP } from "@/lib/workshop";

export const REPAIR_TERMS_VERSION = LEGAL_VERSION;

export type RepairTermsSection = LegalSection;

export function repairTermsMeta() {
  return {
    version: REPAIR_TERMS_VERSION,
    legalName: "Skaug-Danielsen Solutions",
    brandName: WORKSHOP.name,
    address: workshopAddressOneLine(),
  };
}

export function repairTermsSections(): RepairTermsSection[] {
  return fysiskReparasjonsvilkar.sections;
}
