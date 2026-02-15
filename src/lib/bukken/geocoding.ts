import type { Coordinates } from "./types";

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  // 国土地理院API
  try {
    const gsiUrl = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`;
    const res = await fetch(gsiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].geometry?.coordinates) {
        const [lng, lat] = data[0].geometry.coordinates;
        return { lat, lng };
      }
    }
  } catch (e) {
    console.warn("GSI geocoding failed:", e);
  }

  // Nominatimフォールバック
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=jp&limit=1`;
    const res = await fetch(nomUrl, {
      headers: { "User-Agent": "BukkenAnalyzer/1.0" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch (e) {
    console.warn("Nominatim geocoding failed:", e);
  }

  return null;
}

export async function geocodeStation(
  stationName: string,
  near?: Coordinates,
): Promise<Coordinates | null> {
  const query = `${stationName}駅`;

  // 物件の座標がある場合、周辺に絞って検索（Nominatim viewbox）
  if (near) {
    const delta = 0.05; // 約5km四方
    const viewbox = `${near.lng - delta},${near.lat + delta},${near.lng + delta},${near.lat - delta}`;
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=jp&limit=1&viewbox=${viewbox}&bounded=1`;
      const res = await fetch(nomUrl, {
        headers: { "User-Agent": "BukkenAnalyzer/1.0" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      }
    } catch (e) {
      console.warn("Nominatim bounded station geocoding failed:", e);
    }
  }

  // フォールバック: 通常の住所検索
  return await geocodeAddress(query);
}
