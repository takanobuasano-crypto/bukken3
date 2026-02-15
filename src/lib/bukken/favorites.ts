import type { PropertyData } from "./types";

export interface FavoriteProperty {
  property: PropertyData;
  savedAt: string; // ISO date string
}

const STORAGE_KEY = "bukken-favorites";

function readStorage(): FavoriteProperty[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(favorites: FavoriteProperty[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function getFavorites(): FavoriteProperty[] {
  return readStorage();
}

export function addFavorite(property: PropertyData): void {
  const favorites = readStorage();
  // URL重複チェック
  if (favorites.some((f) => f.property.url === property.url)) return;
  favorites.unshift({ property, savedAt: new Date().toISOString() });
  writeStorage(favorites);
}

export function removeFavorite(url: string): void {
  const favorites = readStorage().filter((f) => f.property.url !== url);
  writeStorage(favorites);
}

export function isFavorite(url: string): boolean {
  return readStorage().some((f) => f.property.url === url);
}

// ── メモ機能 ──
const MEMO_KEY = "bukken-memos";

function readMemos(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MEMO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMemo(url: string): string {
  return readMemos()[url] || "";
}

export function saveMemo(url: string, memo: string): void {
  const memos = readMemos();
  if (memo.trim()) {
    memos[url] = memo;
  } else {
    delete memos[url];
  }
  localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
}
