export interface StationAccess {
  line: string;
  station: string;
  walkMinutes: number;
  lat?: number;
  lng?: number;
  elevation?: number;
}

export interface PropertyData {
  name: string;
  rent: number; // 月額家賃（円）
  managementFee: number; // 管理費・共益費（円）
  deposit: number; // 敷金（円）
  keyMoney: number; // 礼金（円）
  layout: string; // 間取り（例: "1LDK"）
  area: number; // 専有面積（m²）
  floor: string; // 階数（例: "3階/5階建"）
  buildingType: string; // 建物種別（例: "マンション"）
  age: string; // 築年数（例: "築5年"）
  address: string; // 住所
  stations: StationAccess[];
  features: string[]; // 設備・特徴
  direction: string; // 向き
  contractType: string; // 契約期間
  images: string[]; // 物件画像URL
  url: string;
  // 初期費用関連（SUUMOから取得、0は未掲載）
  brokerageFee: number; // 仲介手数料（円）
  brokerageFeeText: string; // 仲介手数料の原文（例: "家賃1ヶ月分+税"）
  guaranteeFee: number; // 保証会社利用料（円）
  guaranteeFeeText: string; // 保証会社の原文
  fireInsurance: number; // 火災保険料（円）
  fireInsuranceText: string; // 火災保険の原文（例: "要 2万円 2年"）
  keyExchange: number; // 鍵交換費用（円）
  keyExchangeText: string; // 鍵交換の原文
  otherCosts: { label: string; amount: number; text: string }[]; // その他費用（クリーニング代等）
  parking: string; // 敷地内駐車場情報（例: "付無料/平置駐"）
  point: string; // SUUMOのPOINT（おすすめポイント）
  nearbyFacilities: NearbyFacility[]; // 周辺情報
}

export interface NearbyFacility {
  name: string; // 施設名（例: "オーケー港北店"）
  category: string; // カテゴリ（例: "スーパー"）
  distanceM: number; // 距離（m）
}

export interface InitialCostItem {
  label: string;
  amount: number;
  isEstimate: boolean;
  note?: string;
}

export interface InitialCostBreakdown {
  suumoItems: InitialCostItem[]; // SUUMOに掲載されている費用
  referenceItems: InitialCostItem[]; // 一般的に必要な費用（参考）
  suumoTotal: number;
  referenceTotal: number;
  grandTotal: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ElevationData {
  label: string;
  elevation: number;
  lat: number;
  lng: number;
}

export interface ElevationComparison {
  property: ElevationData;
  stations: ElevationData[];
}

export type SlopeCategory = "flat" | "gentle" | "steep";

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  price: string;
  lat: number;
  lng: number;
  url: string;
  distanceM: number; // 物件からの距離（m）
  is24h: boolean;
  isIndoor: boolean;
  isOutdoor: boolean;
}

export interface ElevationProfilePoint {
  label: string;
  elevation: number;
}

export interface StationElevationProfile {
  stationName: string;
  points: ElevationProfilePoint[];
}

export interface StationElevationInfo extends StationAccess {
  elevation: number;
  propertyElevation: number;
  elevationDiff: number;
  slopeCategory: SlopeCategory;
  slopeGradient: number; // 勾配（%）: 高低差 / 徒歩距離(概算80m/分)
}
