export const PRIMARY_TABS = [
  { label: "Oversikt", href: "/dashboard" },
  { label: "Reparasjoner", href: "/repairs" },
  { label: "Kunder", href: "/customers" },
  { label: "Enheter", href: "/devices" },
  { label: "Lager", href: "/inventory" },
  { label: "Flipping", href: "/refurbishment" },
  { label: "Salg", href: "/sales" },
  { label: "Garanti", href: "/warranty" },
  { label: "Rapporter", href: "/reports" },
  { label: "Innstillinger", href: "/settings" },
] as const;

export const SECONDARY_TABS: Record<
  string,
  readonly { label: string; href: string }[]
> = {
  "/repairs": [
    { label: "Alle", href: "/repairs" },
    { label: "Ny ticket", href: "/repairs/new" },
    { label: "Nye", href: "/repairs?status=NEW" },
    { label: "Diagnostikk", href: "/repairs?status=DIAGNOSTICS" },
    { label: "Venter kunde", href: "/repairs?status=WAITING_FOR_CUSTOMER" },
    { label: "Venter deler", href: "/repairs?status=WAITING_FOR_PART" },
    { label: "Under reparasjon", href: "/repairs?status=IN_REPAIR" },
    { label: "Testing", href: "/repairs?status=TESTING" },
    { label: "Klar", href: "/repairs?status=READY_FOR_PICKUP" },
    { label: "Fullført", href: "/repairs?status=COMPLETED" },
  ],
  "/inventory": [
    { label: "Oversikt", href: "/inventory" },
    { label: "Deler", href: "/inventory/parts" },
    { label: "Bevegelser", href: "/inventory/movements" },
    { label: "Leverandører", href: "/suppliers" },
    { label: "Tjenester", href: "/services" },
  ],
  "/refurbishment": [
    { label: "Oversikt", href: "/refurbishment" },
    { label: "Kandidater", href: "/refurbishment/candidates" },
    { label: "Aktive", href: "/refurbishment/active" },
    { label: "Klar for salg", href: "/refurbishment/ready" },
    { label: "Listet", href: "/refurbishment/listed" },
    { label: "Solgt", href: "/refurbishment/sold" },
    { label: "Arkiv", href: "/refurbishment/archive" },
  ],
  "/customers": [
    { label: "Alle kunder", href: "/customers" },
    { label: "Ny kunde", href: "/customers?new=1" },
  ],
  "/devices": [
    { label: "Alle enheter", href: "/devices" },
    { label: "Ny enhet", href: "/devices?new=1" },
  ],
  "/settings": [
    { label: "System", href: "/settings" },
    { label: "Min profil", href: "/profile" },
  ],
  "/profile": [
    { label: "System", href: "/settings" },
    { label: "Min profil", href: "/profile" },
  ],
};

/** Which secondary tab group applies for the current pathname. */
export function secondaryTabsForPath(pathname: string) {
  if (pathname.startsWith("/repairs")) return SECONDARY_TABS["/repairs"];
  if (pathname.startsWith("/inventory") || pathname.startsWith("/suppliers") || pathname.startsWith("/services")) {
    return SECONDARY_TABS["/inventory"];
  }
  if (pathname.startsWith("/refurbishment")) return SECONDARY_TABS["/refurbishment"];
  if (pathname.startsWith("/customers")) return SECONDARY_TABS["/customers"];
  if (pathname.startsWith("/devices")) return SECONDARY_TABS["/devices"];
  if (pathname.startsWith("/settings") || pathname.startsWith("/profile")) {
    return SECONDARY_TABS["/settings"];
  }
  return null;
}

export function primaryTabActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/inventory") {
    return (
      pathname.startsWith("/inventory") ||
      pathname.startsWith("/suppliers") ||
      pathname.startsWith("/services")
    );
  }
  if (href === "/settings") {
    return pathname.startsWith("/settings") || pathname.startsWith("/profile");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
