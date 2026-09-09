import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Authenticated address suggestions (Photon/OSM) — avoids browser CORS. */
export async function GET(request: Request) {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", "6");
  url.searchParams.set("lat", "60.47");
  url.searchParams.set("lon", "8.47");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  const data = (await res.json()) as {
    features?: Array<{
      properties?: {
        name?: string;
        street?: string;
        housenumber?: string;
        postcode?: string;
        city?: string;
        town?: string;
        village?: string;
        country?: string;
      };
    }>;
  };

  const suggestions = (data.features ?? [])
    .map((f) => {
      const p = f.properties ?? {};
      const street = [p.street || p.name, p.housenumber].filter(Boolean).join(" ");
      const cityName = p.city || p.town || p.village || "";
      if (!street && !cityName) return null;
      return {
        streetAddress: street || p.name || "",
        postalCode: p.postcode || "",
        city: cityName,
        country: p.country === "Norway" ? "Norge" : p.country || "Norge",
        label: [street || p.name, p.postcode, cityName].filter(Boolean).join(", "),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ suggestions });
}
