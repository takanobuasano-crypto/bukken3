"use client";

import { useState, useEffect } from "react";
import type { FavoriteProperty } from "@/lib/bukken/favorites";
import { getFavorites, removeFavorite, getMemo } from "@/lib/bukken/favorites";

interface Props {
  onSelect: (url: string) => void;
}

function formatYen(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    return `${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}万円`;
  }
  return `${amount.toLocaleString()}円`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function FavoriteList({ onSelect }: Props) {
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const handleRemove = (url: string) => {
    removeFavorite(url);
    setFavorites(getFavorites());
  };

  if (favorites.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-400 text-sm">お気に入りに登録された物件はありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">お気に入り物件（{favorites.length}件）</h3>
      <div className="space-y-3">
        {favorites.map((fav) => {
          const p = fav.property;
          const station = p.stations[0];
          return (
            <div
              key={p.url}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => onSelect(p.url)}
                  className="flex-1 text-left"
                >
                  <p className="font-bold text-sm mb-1">{p.name || "物件名不明"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="font-bold text-blue-700">{formatYen(p.rent)}</span>
                    {p.layout && <span>{p.layout}</span>}
                    {p.area > 0 && <span>{p.area}m²</span>}
                    {station && (
                      <span>{station.station}駅 徒歩{station.walkMinutes}分</span>
                    )}
                  </div>
                  {p.address && (
                    <p className="text-xs text-gray-400 mt-1">{p.address}</p>
                  )}
                  {getMemo(p.url) && (
                    <p className="text-xs text-yellow-600 bg-yellow-50 rounded px-2 py-1 mt-1 line-clamp-2">
                      {getMemo(p.url)}
                    </p>
                  )}
                </button>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-gray-400">{formatDate(fav.savedAt)}</span>
                  <button
                    onClick={() => handleRemove(p.url)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
