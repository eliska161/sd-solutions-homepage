export async function lookupPostalPlace(raw: string): Promise<
  | { ok: true; postalCode: string; city: string }
  | { ok: false; error: string }
> {
  const postalCode = raw.replace(/\D/g, "").slice(0, 4);
  if (postalCode.length !== 4) {
    return { ok: false, error: "Skriv fire siffer postnummer." };
  }

  try {
    const res = await fetch(
      `https://api.bring.com/pickuppoint/api/postalCode/NO/${postalCode}.json`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as { postalCode?: { city?: string }; city?: string };
      const city = (data.postalCode?.city || data.city || "").trim();
      if (city) {
        return { ok: true, postalCode, city: city.toLocaleUpperCase("nb-NO") };
      }
    }
  } catch {
    /* Photon under */
  }

  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", `${postalCode} Norge`);
    url.searchParams.set("lang", "en");
    url.searchParams.set("limit", "5");
    url.searchParams.set("lat", "60.47");
    url.searchParams.set("lon", "8.47");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: "Fant ikke stedet." };
    const data = (await res.json()) as {
      features?: Array<{
        properties?: { postcode?: string; city?: string; town?: string; village?: string };
      }>;
    };
    const match = (data.features ?? []).find((f) => f.properties?.postcode === postalCode);
    const props = match?.properties ?? data.features?.[0]?.properties;
    const city = (props?.city || props?.town || props?.village || "").trim();
    if (!city) return { ok: false, error: "Fant ikke stedet." };
    return { ok: true, postalCode, city: city.toLocaleUpperCase("nb-NO") };
  } catch {
    return { ok: false, error: "Kunne ikke hente sted." };
  }
}
