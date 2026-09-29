export const BILLING_CHARGE_VAT_KEY = "billing.chargeVat";

/** Missing setting = MVA off (under the 50 000 kr registration threshold). */
export const DEFAULT_CHARGE_VAT = false;

export function customerPriceSuffix(chargeVat: boolean) {
  return chargeVat ? "inkl. mva" : "uten merverdiavgift";
}

export function customerPriceWithLabor(chargeVat: boolean) {
  return chargeVat
    ? "inkl. mva og arbeid"
    : "inkl. arbeid, uten merverdiavgift";
}

export function receiptServicesHeader(chargeVat: boolean) {
  return chargeVat ? "Tjenester (inkl. mva)" : "Tjenester";
}

export function estimateListHeader(
  chargeVat: boolean,
  modelLabel?: string | null,
) {
  const vat = chargeVat ? "inkl. mva" : "uten merverdiavgift";
  return modelLabel
    ? `Estimert prisliste · ${modelLabel} (${vat})`
    : `Estimert prisliste (${vat})`;
}

export function priceListDisclaimer(chargeVat: boolean) {
  const vat = customerPriceWithLabor(chargeVat);
  return `Fra-priser ${vat}. Diagnose 399 kr hvis vi ikke finner feil, eller hvis du takker nei etter diagnose. Utført reparasjon: diagnosen inngår.`;
}
