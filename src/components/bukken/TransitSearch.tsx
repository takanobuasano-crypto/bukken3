"use client";

import { useState } from "react";
import type { StationAccess } from "@/lib/bukken/types";
import {
  buildYahooTransitUrl,
  buildGoogleMapsUrl,
  buildNavitimeUrl,
} from "@/lib/bukken/transit-links";

interface Props {
  stations: StationAccess[];
}

export default function TransitSearch({ stations }: Props) {
  const [destination, setDestination] = useState("");
  const [searched, setSearched] = useState(false);

  if (stations.length === 0) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (destination.trim()) {
      setSearched(true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-2">電車アクセス検索</h3>
      <p className="text-xs text-gray-400 mb-4">
        最寄り駅から目的地までの経路・時間・乗り換えを検索
      </p>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={destination}
            onChange={(e) => { setDestination(e.target.value); setSearched(false); }}
            placeholder="目的地を入力（例: 東京駅、渋谷、新宿）"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!destination.trim()}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            検索
          </button>
        </div>
      </form>

      {searched && destination.trim() && (
        <div className="space-y-3">
          {stations.map((st, i) => {
            const fromStation = `${st.station}駅`;
            const toStation = destination.trim();
            return (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold">{fromStation}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-sm font-bold">{toStation}</span>
                  <span className="text-xs text-gray-400 ml-1">（徒歩{st.walkMinutes}分 + 電車）</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={buildYahooTransitUrl(fromStation, toStation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors font-medium"
                  >
                    Yahoo!乗換案内で検索
                  </a>
                  <a
                    href={buildGoogleMapsUrl(fromStation, toStation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                  >
                    Google Mapsで検索
                  </a>
                  <a
                    href={buildNavitimeUrl(fromStation, toStation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium"
                  >
                    NAVITIMEで検索
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
