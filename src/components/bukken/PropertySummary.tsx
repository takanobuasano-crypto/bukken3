"use client";

import type { PropertyData } from "@/lib/bukken/types";

function formatAge(age: string): string {
  const match = age.match(/(\d{4})年(\d{1,2})月?/);
  if (match) {
    const builtDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1);
    const now = new Date();
    let years = now.getFullYear() - builtDate.getFullYear();
    if (
      now.getMonth() < builtDate.getMonth() ||
      (now.getMonth() === builtDate.getMonth() && now.getDate() < builtDate.getDate())
    ) {
      years--;
    }
    return `築${years}年（${match[1]}年${match[2]}月）`;
  }
  if (age.includes("築")) return age;
  return age;
}

function parseParkingCost(parking: string): number {
  if (!parking || parking.includes("無料") || parking === "-") return 0;
  // "月額5,000円" "5000円" "1.5万円" etc.
  const manMatch = parking.match(/([\d.]+)\s*万円/);
  if (manMatch) return Math.round(parseFloat(manMatch[1]) * 10000);
  const yenMatch = parking.match(/([\d,]+)\s*円/);
  if (yenMatch) return parseInt(yenMatch[1].replace(/,/g, ""), 10) || 0;
  return 0;
}

function formatYen(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    return `${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}万円`;
  }
  return `${amount.toLocaleString()}円`;
}

export default function PropertySummary({ property }: { property: PropertyData }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-5">
      <h2 className="text-xl font-bold">{property.name || "物件名不明"}</h2>

      {/* ── POINT ── */}
      {property.point && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <h3 className="text-xs font-bold text-yellow-700 mb-1">POINT</h3>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{property.point}</p>
        </div>
      )}

      {/* ── 賃料・部屋情報 ── */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-200 pb-1">
          部屋情報
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-4 col-span-2">
            <p className="text-sm text-blue-600 font-medium">家賃</p>
            <p className="text-3xl font-bold text-blue-700">
              {formatYen(property.rent)}
            </p>
            {property.managementFee > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                管理費・共益費: {formatYen(property.managementFee)}
              </p>
            )}
            {property.parking && (
              <p className="text-sm text-blue-700 font-bold mt-1">
                敷地内駐車場: {property.parking}
              </p>
            )}
            {(() => {
              const parkingCost = property.parking ? parseParkingCost(property.parking) : 0;
              const total = property.rent + property.managementFee + parkingCost;
              return (
                <p className="text-lg font-bold text-blue-800 mt-2 pt-2 border-t border-blue-200">
                  月額合計: {formatYen(total)}
                </p>
              );
            })()}
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">敷金</p>
            <p className="text-lg font-bold">
              {property.deposit > 0 ? formatYen(property.deposit) : "なし"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">礼金</p>
            <p className="text-lg font-bold">
              {property.keyMoney > 0 ? formatYen(property.keyMoney) : "なし"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">間取り</p>
            <p className="text-xl font-bold">{property.layout || "-"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">面積</p>
            <p className="text-xl font-bold">
              {property.area > 0 ? `${property.area}m²` : "-"}
            </p>
          </div>
          {property.floor && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">階数</p>
              <p className="text-lg font-semibold">{property.floor}</p>
            </div>
          )}
          {property.direction && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">向き</p>
              <p className="text-lg font-semibold">{property.direction}</p>
            </div>
          )}
          {property.buildingType && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">建物種別</p>
              <p className="text-lg font-semibold">{property.buildingType}</p>
            </div>
          )}
          {property.age && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">築年数</p>
              <p className="text-lg font-semibold">{formatAge(property.age)}</p>
            </div>
          )}
          {property.contractType && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">契約期間</p>
              <p className="text-lg font-semibold">{property.contractType}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── アクセス ── */}
      {property.stations.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-200 pb-1">
            アクセス
          </h3>
          <div className="space-y-2">
            {property.stations.map((st, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-blue-600 text-lg">🚃</span>
                <div className="flex-1">
                  {st.line && (
                    <span className="text-xs text-gray-500 mr-2">{st.line}</span>
                  )}
                  <span className="font-bold">{st.station}駅</span>
                </div>
                <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {st.walkMinutes * 80 >= 1000
                    ? `${(st.walkMinutes * 80 / 1000).toFixed(1)}km`
                    : `${st.walkMinutes * 80}m`}
                </span>
                <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                  徒歩{st.walkMinutes}分
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 所在地 ── */}
      {property.address && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-200 pb-1">
            所在地
          </h3>
          <p className="text-sm">{property.address}</p>
        </div>
      )}

      {/* ── 設備・特徴 ── */}
      {property.features.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-200 pb-1">
            設備・特徴
          </h3>
          <div className="flex flex-wrap gap-2">
            {property.features.map((f, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 周辺情報 ── */}
      {property.nearbyFacilities && property.nearbyFacilities.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-3 border-b border-gray-200 pb-1">
            周辺情報
          </h3>
          <div className="space-y-2">
            {property.nearbyFacilities.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                  {f.category}
                </span>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(f.name + " " + (property.address || ""))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex-1"
                >
                  {f.name}
                </a>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {f.distanceM >= 1000
                    ? `${(f.distanceM / 1000).toFixed(1)}km`
                    : `${f.distanceM}m`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
