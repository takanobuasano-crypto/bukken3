"use client";

import { useState, useEffect } from "react";
import type { PropertyData } from "@/lib/bukken/types";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/bukken/favorites";

interface Props {
  property: PropertyData;
  onToggle?: () => void;
}

export default function FavoriteButton({ property, onToggle }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isFavorite(property.url));
  }, [property.url]);

  const toggle = () => {
    if (saved) {
      removeFavorite(property.url);
      setSaved(false);
    } else {
      addFavorite(property);
      setSaved(true);
    }
    onToggle?.();
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        saved
          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <span className="text-lg">{saved ? "★" : "☆"}</span>
      {saved ? "お気に入り済み" : "お気に入りに追加"}
    </button>
  );
}
