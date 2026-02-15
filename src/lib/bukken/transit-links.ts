export function buildYahooTransitUrl(from: string, to: string): string {
  return `https://transit.yahoo.co.jp/search/result?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&type=1&ticket=ic`;
}

export function buildGoogleMapsUrl(from: string, to: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=transit`;
}

export function buildNavitimeUrl(from: string, to: string): string {
  return `https://www.navitime.co.jp/transfer/searchlist?orvStationName=${encodeURIComponent(from)}&dnvStationName=${encodeURIComponent(to)}`;
}
