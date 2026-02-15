"use client";

import { useState, useEffect } from "react";
import type { FavoriteProperty } from "@/lib/bukken/favorites";
import { getFavorites } from "@/lib/bukken/favorites";
import { calculateInitialCosts } from "@/lib/bukken/cost-calculator";
import {
  buildYahooTransitUrl,
  buildGoogleMapsUrl,
  buildNavitimeUrl,
} from "@/lib/bukken/transit-links";

function formatYen(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    return `${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}万円`;
  }
  return `${amount.toLocaleString()}円`;
}

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
    return `築${years}年`;
  }
  if (age.includes("築")) return age;
  return age;
}

interface Props {
  onClose: () => void;
}

export default function CompareView({ onClose }: Props) {
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [transitDest, setTransitDest] = useState("");
  const [transitSearched, setTransitSearched] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const toggleSelect = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else if (next.size < 4) {
        next.add(url);
      }
      return next;
    });
  };

  const selectedProperties = favorites
    .filter((f) => selected.has(f.property.url))
    .map((f) => f.property);

  // ハイライト用: 各項目の最良値を計算
  const rents = selectedProperties.map((p) => p.rent).filter((r) => r > 0);
  const areas = selectedProperties.map((p) => p.area).filter((a) => a > 0);
  const unitPrices = selectedProperties
    .map((p) => (p.area > 0 ? Math.round(p.rent / p.area) : 0))
    .filter((u) => u > 0);
  const initialCosts = selectedProperties.map((p) => calculateInitialCosts(p).suumoTotal);

  const minRent = rents.length > 0 ? Math.min(...rents) : 0;
  const maxArea = areas.length > 0 ? Math.max(...areas) : 0;
  const minUnitPrice = unitPrices.length > 0 ? Math.min(...unitPrices) : 0;
  const minInitialCost = initialCosts.length > 0 ? Math.min(...initialCosts) : 0;

  const highlight = (isMin: boolean) =>
    isMin ? "text-green-700 font-bold bg-green-50 rounded px-1" : "";

  if (!comparing) {
    // 物件選択画面
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">比較する物件を選択（2〜4件）</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        {favorites.length < 2 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            比較するにはお気に入りに2件以上登録してください
          </p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {favorites.map((fav) => {
                const p = fav.property;
                const isSelected = selected.has(p.url);
                return (
                  <label
                    key={p.url}
                    className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                      isSelected ? "border-blue-400 bg-blue-50" : "hover:bg-gray-50"
                    } ${!isSelected && selected.size >= 4 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.url)}
                      disabled={!isSelected && selected.size >= 4}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{p.name || "物件名不明"}</p>
                      <p className="text-xs text-gray-500">
                        {formatYen(p.rent)} / {p.layout || "-"} / {p.area > 0 ? `${p.area}m²` : "-"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <button
              onClick={() => setComparing(true)}
              disabled={selected.size < 2}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {selected.size < 2
                ? `あと${2 - selected.size}件選択してください`
                : `${selected.size}件を比較する`}
            </button>
          </>
        )}
      </div>
    );
  }

  // 比較テーブル
  const rows: { label: string; values: { text: string; isHighlight: boolean }[] }[] = [
    {
      label: "家賃",
      values: selectedProperties.map((p) => ({
        text: formatYen(p.rent),
        isHighlight: p.rent === minRent && rents.length > 1,
      })),
    },
    {
      label: "管理費",
      values: selectedProperties.map((p) => ({
        text: p.managementFee > 0 ? formatYen(p.managementFee) : "なし",
        isHighlight: false,
      })),
    },
    {
      label: "敷金",
      values: selectedProperties.map((p) => ({
        text: p.deposit > 0 ? formatYen(p.deposit) : "なし",
        isHighlight: false,
      })),
    },
    {
      label: "礼金",
      values: selectedProperties.map((p) => ({
        text: p.keyMoney > 0 ? formatYen(p.keyMoney) : "なし",
        isHighlight: false,
      })),
    },
    {
      label: "間取り",
      values: selectedProperties.map((p) => ({
        text: p.layout || "-",
        isHighlight: false,
      })),
    },
    {
      label: "面積",
      values: selectedProperties.map((p) => ({
        text: p.area > 0 ? `${p.area}m²` : "-",
        isHighlight: p.area === maxArea && areas.length > 1,
      })),
    },
    {
      label: "面積単価",
      values: selectedProperties.map((p) => {
        const unit = p.area > 0 ? Math.round(p.rent / p.area) : 0;
        return {
          text: unit > 0 ? `${unit.toLocaleString()}円/m²` : "-",
          isHighlight: unit === minUnitPrice && unitPrices.length > 1,
        };
      }),
    },
    {
      label: "築年数",
      values: selectedProperties.map((p) => ({
        text: p.age ? formatAge(p.age) : "-",
        isHighlight: false,
      })),
    },
    {
      label: "階数",
      values: selectedProperties.map((p) => ({
        text: p.floor || "-",
        isHighlight: false,
      })),
    },
    {
      label: "建物種別",
      values: selectedProperties.map((p) => ({
        text: p.buildingType || "-",
        isHighlight: false,
      })),
    },
    {
      label: "向き",
      values: selectedProperties.map((p) => ({
        text: p.direction || "-",
        isHighlight: false,
      })),
    },
    {
      label: "最寄り駅",
      values: selectedProperties.map((p) => ({
        text: p.stations.length > 0
          ? p.stations.map((s) => `${s.station}駅 徒歩${s.walkMinutes}分`).join("\n")
          : "-",
        isHighlight: false,
      })),
    },
    {
      label: "初期費用\n(SUUMO掲載分)",
      values: selectedProperties.map((p, i) => ({
        text: formatYen(initialCosts[i]),
        isHighlight: initialCosts[i] === minInitialCost && initialCosts.length > 1,
      })),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">物件比較</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setComparing(false)}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded border"
          >
            選び直す
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-2">
            ✕
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        <span className="text-green-600">■</span> 緑 = 比較対象中の最良値
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 px-2 text-gray-500 text-xs w-28 shrink-0">項目</th>
              {selectedProperties.map((p) => (
                <th key={p.url} className="text-left py-2 px-2 min-w-[140px]">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs font-bold block truncate max-w-[180px]"
                  >
                    {p.name || "物件名不明"}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-2 text-xs text-gray-500 whitespace-pre-line">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className={`py-2 px-2 whitespace-pre-line ${highlight(val.isHighlight)}`}>
                    {val.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 通勤先アクセス比較 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-bold text-gray-500 mb-3">通勤先アクセス比較</h4>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (transitDest.trim()) setTransitSearched(true);
          }}
          className="mb-4"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={transitDest}
              onChange={(e) => { setTransitDest(e.target.value); setTransitSearched(false); }}
              placeholder="目的地を入力（例: 東京駅、渋谷、新宿）"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!transitDest.trim()}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              検索
            </button>
          </div>
        </form>

        {transitSearched && transitDest.trim() && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-500 text-xs w-28 shrink-0">物件</th>
                  <th className="text-left py-2 px-2 text-gray-500 text-xs">最寄り駅</th>
                  <th className="text-left py-2 px-2 text-gray-500 text-xs">乗換検索</th>
                </tr>
              </thead>
              <tbody>
                {selectedProperties.map((p) => {
                  const station = p.stations[0];
                  if (!station) return (
                    <tr key={p.url} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-xs font-bold truncate max-w-[140px]">{p.name || "物件名不明"}</td>
                      <td className="py-2 px-2 text-xs text-gray-400" colSpan={2}>駅情報なし</td>
                    </tr>
                  );
                  const fromStation = `${station.station}駅`;
                  const toStation = transitDest.trim();
                  return (
                    <tr key={p.url} className="border-b border-gray-100">
                      <td className="py-3 px-2">
                        <p className="text-xs font-bold truncate max-w-[140px]">{p.name || "物件名不明"}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm font-bold">{fromStation}</p>
                        <p className="text-xs text-gray-400">徒歩{station.walkMinutes}分 + 電車</p>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1.5">
                          <a
                            href={buildYahooTransitUrl(fromStation, toStation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium whitespace-nowrap"
                          >
                            Yahoo!乗換
                          </a>
                          <a
                            href={buildGoogleMapsUrl(fromStation, toStation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-medium whitespace-nowrap"
                          >
                            Google Maps
                          </a>
                          <a
                            href={buildNavitimeUrl(fromStation, toStation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors font-medium whitespace-nowrap"
                          >
                            NAVITIME
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
