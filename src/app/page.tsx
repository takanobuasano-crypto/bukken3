"use client";

import { useState, useCallback } from "react";
import type {
  PropertyData,
  InitialCostBreakdown,
  ElevationData,
  StationElevationInfo,
  ParkingLot,
  StationElevationProfile,
} from "@/lib/bukken/types";
import { calculateInitialCosts } from "@/lib/bukken/cost-calculator";
import { classifySlope } from "@/lib/bukken/elevation";
import PropertySummary from "@/components/bukken/PropertySummary";
import PhotoGallery from "@/components/bukken/PhotoGallery";
import CostBreakdown from "@/components/bukken/CostBreakdown";
import StationInfo from "@/components/bukken/StationInfo";
import ElevationChart from "@/components/bukken/ElevationChart";
import PropertyMap from "@/components/bukken/PropertyMap";
import ParkingList from "@/components/bukken/ParkingList";
import FavoriteButton from "@/components/bukken/FavoriteButton";
import FavoriteList from "@/components/bukken/FavoriteList";
import CompareView from "@/components/bukken/CompareView";
import TransitSearch from "@/components/bukken/TransitSearch";
import PropertyMemo from "@/components/bukken/PropertyMemo";

type LoadingStep = "idle" | "scraping" | "geocoding" | "elevation" | "parking" | "done" | "error";

const STEP_LABELS: Record<LoadingStep, string> = {
  idle: "",
  scraping: "物件情報を取得中...",
  geocoding: "位置情報を計算中...",
  elevation: "標高データを取得中...",
  parking: "周辺の駐車場を検索中...",
  done: "",
  error: "",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<LoadingStep>("idle");
  const [error, setError] = useState("");

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [costs, setCosts] = useState<InitialCostBreakdown | null>(null);
  const [stationElevations, setStationElevations] = useState<StationElevationInfo[]>([]);
  const [propertyElevation, setPropertyElevation] = useState<ElevationData | null>(null);
  const [stationElevationData, setStationElevationData] = useState<ElevationData[]>([]);
  const [hasGeoData, setHasGeoData] = useState(false);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [elevationProfiles, setElevationProfiles] = useState<StationElevationProfile[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [favKey, setFavKey] = useState(0); // FavoriteListの再レンダリング用

  const analyzeUrl = useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setStep("scraping");
    setError("");
    setProperty(null);
    setCosts(null);
    setStationElevations([]);
    setPropertyElevation(null);
    setStationElevationData([]);
    setHasGeoData(false);
    setParkingLots([]);
    setElevationProfiles([]);

    try {
      // Step 1: Scrape
      const scrapeRes = await fetch("/api/bukken/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });
      const scrapeData = await scrapeRes.json();
      if (!scrapeRes.ok) {
        throw new Error(scrapeData.error || "スクレイピングに失敗しました");
      }
      const prop: PropertyData = scrapeData;
      setProperty(prop);
      setCosts(calculateInitialCosts(prop));

      // Step 2: Geocode
      if (!prop.address && prop.stations.length === 0) {
        setStep("done");
        return;
      }

      setStep("geocoding");
      const stationNames = prop.stations.map((s) => s.station);
      const geoRes = await fetch("/api/bukken/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: prop.address, stations: stationNames }),
      });
      const geoData = await geoRes.json();

      if (!geoRes.ok || !geoData.property) {
        setStep("done");
        return;
      }

      // Step 3: Elevation
      setStep("elevation");
      const elevationPoints = [
        { label: "物件", lat: geoData.property.lat, lng: geoData.property.lng },
        ...geoData.stations.map((s: { name: string; lat: number; lng: number }) => ({
          label: `${s.name}駅`,
          lat: s.lat,
          lng: s.lng,
        })),
      ];

      const elevRes = await fetch("/api/bukken/elevation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: elevationPoints }),
      });
      const elevData = await elevRes.json();

      if (elevRes.ok && elevData.elevations) {
        const elev: ElevationData[] = elevData.elevations;
        const propElev = elev[0];
        const stElev = elev.slice(1);

        setPropertyElevation(propElev);
        setStationElevationData(stElev);

        // Build station elevation info
        const stInfos: StationElevationInfo[] = prop.stations.map((st) => {
          const stGeo = geoData.stations.find(
            (g: { name: string }) => g.name === st.station
          );
          const stElevData = stElev.find(
            (e: ElevationData) => e.label === `${st.station}駅`
          );
          const elevation = stElevData?.elevation ?? 0;
          const diff = propElev.elevation - elevation;
          // 勾配: 高低差 / 水平距離(概算: 徒歩1分 ≈ 80m)
          const walkDistance = st.walkMinutes * 80;
          const slopeGradient = walkDistance > 0 ? (Math.abs(diff) / walkDistance) * 100 : 0;
          return {
            ...st,
            lat: stGeo?.lat ?? 0,
            lng: stGeo?.lng ?? 0,
            elevation,
            propertyElevation: propElev.elevation,
            elevationDiff: diff,
            slopeCategory: classifySlope(slopeGradient),
            slopeGradient,
          };
        });
        setStationElevations(stInfos);
        setHasGeoData(true);

        // 各駅→物件の標高断面図を取得（並列）
        const profilePromises = geoData.stations.map(
          async (stGeo: { name: string; lat: number; lng: number }) => {
            try {
              const res = await fetch("/api/bukken/elevation-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  stationLat: stGeo.lat,
                  stationLng: stGeo.lng,
                  propertyLat: geoData.property.lat,
                  propertyLng: geoData.property.lng,
                  stationName: stGeo.name,
                }),
              });
              const data = await res.json();
              if (res.ok && data.profile) {
                return { stationName: stGeo.name, points: data.profile } as StationElevationProfile;
              }
            } catch {
              // ignore
            }
            return null;
          },
        );
        const profiles = (await Promise.all(profilePromises)).filter(
          (p): p is StationElevationProfile => p !== null,
        );
        setElevationProfiles(profiles);
      }

      // Step 4: Parking
      setStep("parking");
      try {
        const parkRes = await fetch("/api/bukken/parking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: prop.address,
            lat: geoData.property.lat,
            lng: geoData.property.lng,
          }),
        });
        const parkData = await parkRes.json();
        if (parkRes.ok && parkData.parkingLots) {
          setParkingLots(parkData.parkingLots);
        }
      } catch {
        // 駐車場検索の失敗は無視して続行
        console.warn("Parking search failed");
      }

      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setStep("error");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeUrl(url);
  };

  const isLoading = step !== "idle" && step !== "done" && step !== "error";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              賃貸物件分析ツール
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              SUUMOのURLを入力して、物件の詳細・初期費用・高低差を分析
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCompare((v) => !v); setShowFavorites(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showCompare
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              比較
            </button>
            <button
              onClick={() => { setShowFavorites((v) => !v); setShowCompare(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFavorites
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="text-lg">★</span>
              お気に入り
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 比較ビュー */}
        {showCompare && (
          <div className="mb-8">
            <CompareView onClose={() => setShowCompare(false)} />
          </div>
        )}

        {/* お気に入り一覧 */}
        {showFavorites && (
          <div className="mb-8">
            <FavoriteList
              key={favKey}
              onSelect={(selectedUrl) => {
                setUrl(selectedUrl);
                setShowFavorites(false);
                analyzeUrl(selectedUrl);
              }}
            />
          </div>
        )}

        {/* URL入力フォーム */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://suumo.jp/chintai/jnc_..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "分析中..." : "分析する"}
            </button>
          </div>
        </form>

        {/* ローディング表示 */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mb-4" />
            <p className="text-gray-600">{STEP_LABELS[step]}</p>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* 結果表示 */}
        {property && step === "done" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => { setProperty(null); setCosts(null); setStep("idle"); setUrl(""); }}
                className="text-gray-400 hover:text-gray-600 text-xl px-2"
                title="閉じる"
              >
                ✕
              </button>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <PropertySummary property={property} />
              </div>
            </div>
            <div className="flex justify-end">
              <FavoriteButton
                property={property}
                onToggle={() => setFavKey((k) => k + 1)}
              />
            </div>

            {property.images && property.images.length > 0 && (
              <PhotoGallery images={property.images} propertyName={property.name} />
            )}

            {costs && <CostBreakdown costs={costs} />}

            {property.stations.length > 0 && (
              <StationInfo
                stations={property.stations}
                stationElevations={stationElevations.length > 0 ? stationElevations : undefined}
              />
            )}

            {property.stations.length > 0 && (
              <TransitSearch stations={property.stations} />
            )}

            {hasGeoData && propertyElevation && stationElevationData.length > 0 && (
              <>
                {elevationProfiles.length > 0 && (
                  <ElevationChart profiles={elevationProfiles} />
                )}
                <PropertyMap
                  property={propertyElevation}
                  stations={stationElevationData}
                  parkingLots={parkingLots}
                />
              </>
            )}

            {parkingLots.length > 0 && (
              <ParkingList parkingLots={parkingLots} />
            )}

            <PropertyMemo propertyUrl={property.url} />

            <div className="text-center pt-4 pb-8">
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                SUUMOで物件を見る →
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
