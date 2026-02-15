import type { SlopeCategory } from "./types";

export const DEFAULT_COSTS = {
  brokerageFeeRate: 1.1, // 仲介手数料 = 家賃 × 1.1
  guaranteeFeeRate: 0.5, // 保証会社 = 家賃 × 0.5
  fireInsurance: 18000, // 火災保険（2年）
  keyExchange: 16500, // 鍵交換費用
} as const;

export const SLOPE_THRESHOLDS = {
  flat: 3, // 0-3%: 平坦
  gentle: 5, // 3-5%: ゆるやか
  // 5%+: 急坂
} as const;

export const SLOPE_LABELS: Record<SlopeCategory, string> = {
  flat: "平坦",
  gentle: "ゆるやかな坂",
  steep: "急な坂",
};

export const SLOPE_COLORS: Record<SlopeCategory, string> = {
  flat: "text-green-600",
  gentle: "text-yellow-600",
  steep: "text-red-600",
};

export const SLOPE_BG_COLORS: Record<SlopeCategory, string> = {
  flat: "bg-green-100",
  gentle: "bg-yellow-100",
  steep: "bg-red-100",
};
