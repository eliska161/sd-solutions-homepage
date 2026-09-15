export function repairPortalUrl(path = "") {
  const base = (
    process.env.NEXT_PUBLIC_REPAIR_PORTAL_URL ||
    "https://repair.sd-solutions.org"
  ).replace(/\/$/, "");
  return `${base}${path}`;
}

export const SERVICE_ORDER_URL = repairPortalUrl("/s/ny");
