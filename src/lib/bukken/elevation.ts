import type { SlopeCategory } from "./types";
import { SLOPE_THRESHOLDS } from "./constants";

export async function getElevation(lat: number, lng: number): Promise<number | null> {
  try {
    const url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lng}&lat=${lat}&outtype=JSON`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.elevation !== undefined && data.elevation !== "-----") {
        return typeof data.elevation === "string"
          ? parseFloat(data.elevation)
          : data.elevation;
      }
    }
  } catch (e) {
    console.warn("Elevation API failed:", e);
  }
  return null;
}

/** Haversine formula: 2点間の直線距離（km） */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 勾配（%）で坂道を分類
 * @param slopeGradient 勾配（%）= 高低差 / 水平距離 × 100
 */
export function classifySlope(slopeGradient: number): SlopeCategory {
  const absGradient = Math.abs(slopeGradient);
  if (absGradient <= SLOPE_THRESHOLDS.flat) return "flat";
  if (absGradient <= SLOPE_THRESHOLDS.gentle) return "gentle";
  return "steep";
}
