import * as cheerio from "cheerio";
import type { PropertyData, StationAccess, NearbyFacility } from "./types";

function parseJapaneseNumber(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, "").replace(/円/g, "").trim();

  // 「5.5万円」「5.5万」のようなパターン
  const manMatch = cleaned.match(/([\d.]+)\s*万/);
  if (manMatch) {
    return Math.round(parseFloat(manMatch[1]) * 10000);
  }

  // テキスト中の数値を抽出（「鍵交換費用16500円」→ 16500）
  const numMatch = cleaned.match(/(\d[\d,]*)/);
  if (numMatch) {
    const num = parseInt(numMatch[1].replace(/,/g, ""), 10);
    return isNaN(num) ? 0 : num;
  }

  return 0;
}

function parseMonths(text: string, rent: number): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (trimmed === "-" || trimmed === "なし" || trimmed === "") return 0;

  const monthMatch = trimmed.match(/([\d.]+)\s*ヶ?月/);
  if (monthMatch) {
    return Math.round(parseFloat(monthMatch[1]) * rent);
  }

  return parseJapaneseNumber(trimmed);
}

function parseArea(text: string): number {
  // 「40.07m²」「40.07ｍ²」「40.07㎡」「40.07平米」等
  const match = text.match(/([\d.]+)\s*(?:[mｍ][²2]|㎡|平米)/);
  return match ? parseFloat(match[1]) : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGapData(html: string): Record<string, any> | null {
  const match = html.match(/gapSuumoPcForFr\s*=\s*(\{[\s\S]*?\});/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debugSuumoHtml(html: string): any {
  const $ = cheerio.load(html);

  const allTableRows: { th: string; td: string }[] = [];
  $("table tr").each((_, row) => {
    const th = $(row).find("th").text().trim().substring(0, 80);
    const td = $(row).find("td").text().trim().substring(0, 120);
    if (th) allTableRows.push({ th, td });
  });

  const allDlItems: { dt: string; dd: string }[] = [];
  $("dl").each((_, dl) => {
    const dt = $(dl).find("dt").text().trim().substring(0, 80);
    const dd = $(dl).find("dd").text().trim().substring(0, 120);
    if (dt) allDlItems.push({ dt, dd });
  });

  const stationTexts: string[] = [];
  $("*").each((_, el) => {
    const text = $(el).clone().children().remove().end().text().trim();
    if (text.includes("駅") && text.length < 200 && text.length > 3) {
      stationTexts.push(text.substring(0, 150));
    }
  });

  const trafficElements: { tag: string; classes: string; text: string }[] = [];
  $("*").each((_, el) => {
    const cls = $(el).attr("class") || "";
    const text = $(el).text().trim();
    if (
      (cls.includes("traffic") || cls.includes("access") || cls.includes("station") || cls.includes("ekiten")) &&
      text.length > 3 &&
      text.length < 300
    ) {
      trafficElements.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tag: (el as any).tagName || "",
        classes: cls.substring(0, 100),
        text: text.substring(0, 200),
      });
    }
  });

  return {
    title: $("title").text().trim(),
    h1: $("h1").first().text().trim().substring(0, 100),
    imgCount: $("img").length,
    tableRowCount: allTableRows.length,
    allTableRows: allTableRows.slice(0, 40),
    dlItemCount: allDlItems.length,
    allDlItems: allDlItems.slice(0, 30),
    stationTexts: [...new Set(stationTexts)].slice(0, 20),
    trafficElements: trafficElements.slice(0, 10),
  };
}

/**
 * 駅テキストをパース: "東急田園都市線/宮崎台駅 歩9分" 等
 */
function parseStationText(text: string, stations: StationAccess[]) {
  // バス路線は除外
  if (text.includes("バス")) return;

  const patterns = [
    // 「東急田園都市線/宮崎台駅 歩9分」「ＪＲ南武線/武蔵中原駅 歩2分」
    /(.+?線)\s*[/／]\s*(.+?)駅\s*歩(\d+)分/,
    // 「東急田園都市線/宮崎台駅 徒歩9分」
    /(.+?線)\s*[/／]\s*(.+?)駅\s*徒歩(\d+)分/,
    // 「東急田園都市線 宮崎台駅 歩9分」
    /(.+?線)\s+(.+?)駅\s*歩(\d+)分/,
    // 「東急田園都市線 宮崎台駅 徒歩9分」
    /(.+?線)\s+(.+?)駅\s+徒歩(\d+)分/,
    // 「小田急線/百合ヶ丘駅 歩9分」(線がキーワード末尾)
    /(.+?)\s*[/／]\s*(.+?)駅\s*歩(\d+)分/,
    // フォールバック: 何か/駅名 徒歩N分
    /(.+?)\s*[/／]\s*(.+?)駅\s+徒歩(\d+)分/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      stations.push({
        line: match[1].trim(),
        station: match[2].trim(),
        walkMinutes: parseInt(match[3], 10),
      });
      return;
    }
  }

  // 最終フォールバック: 「〇〇駅」+「N分」
  // 駅名直前の部分のみ取得（、や学区などの無関係な文字を含めない）
  const simpleMatch = text.match(/([^\s、,（）()／/]+?)駅.*?(\d+)分/);
  if (simpleMatch) {
    const stationName = simpleMatch[1].replace(/.*[線]\s*[/／]?\s*/, "").trim();
    // 学区名など駅名でないものを除外
    if (stationName && !stationName.includes("学区") && stationName.length <= 10) {
      stations.push({
        line: "",
        station: stationName,
        walkMinutes: parseInt(simpleMatch[2], 10),
      });
    }
  }
}

export function parseSuumoHtml(html: string, url: string): PropertyData {
  const $ = cheerio.load(html);
  const gapData = extractGapData(html);

  // ── 物件名 ──
  let name = "";
  const titleEl = $(".section_h1-header-title");
  if (titleEl.length) {
    name = titleEl.text().trim();
  }
  if (!name) {
    // h1 から「- 〇〇提供」部分を除去
    const h1Text = $("h1").first().text().trim();
    name = h1Text.replace(/\s*-\s*.+提供.*$/, "").trim();
  }

  // ── テーブルから全データ抽出 ──
  // SUUMO は th に複数項目を結合（例: "間取り詳細構造"）するので、
  // 個別の th を取り出すために th ごとに処理する
  const rawTableData: { th: string; td: string }[] = [];
  $("table tr").each((_, row) => {
    // 1行に複数の th/td ペアがある場合がある
    const ths = $(row).find("th");
    const tds = $(row).find("td");
    ths.each((j, thEl) => {
      const th = $(thEl).text().trim();
      const td = tds.eq(j).text().trim();
      if (th && td) {
        rawTableData.push({ th, td });
      }
    });
    // th/td が1対1でない場合(結合セル)のフォールバック
    if (ths.length === 1 && tds.length === 1) {
      const th = ths.text().trim();
      const td = tds.text().trim();
      if (th && td && !rawTableData.find((r) => r.th === th && r.td === td)) {
        rawTableData.push({ th, td });
      }
    }
  });

  // ── dl（定義リスト）からもデータ抽出 ──
  $("dl").each((_, dl) => {
    const dts = $(dl).find("dt");
    const dds = $(dl).find("dd");
    dts.each((j, dtEl) => {
      const dt = $(dtEl).text().trim();
      const dd = dds.eq(j).text().trim();
      if (dt && dd && !rawTableData.find((r) => r.th === dt && r.td === dd)) {
        rawTableData.push({ th: dt, td: dd });
      }
    });
  });

  // ── SUUMOの property_data-title / property_data-body ペア ──
  $(".property_data-title").each((_, titleEl) => {
    const title = $(titleEl).text().trim();
    const body = $(titleEl).next(".property_data-body").text().trim();
    if (title && body && !rawTableData.find((r) => r.th === title && r.td === body)) {
      rawTableData.push({ th: title, td: body });
    }
  });

  // テーブル/dlデータを検索するヘルパー (部分一致)
  function findTableValue(...keywords: string[]): string {
    for (const kw of keywords) {
      const found = rawTableData.find((r) => r.th.includes(kw));
      if (found) return found.td;
    }
    return "";
  }

  // ── 賃料 ──
  // SUUMOの物件詳細ページでは賃料はページ上部の大きな表示にある
  let rent = 0;
  // HTMLテキスト全体から「N.N万円」パターンを探す（賃料表示部分）
  $("span, div, p").each((_, el) => {
    if (rent) return;
    const text = $(el).text().trim();
    // 「8.5万円」のような単独の賃料表示を探す
    const match = text.match(/^([\d.]+)\s*万円$/);
    if (match) {
      rent = Math.round(parseFloat(match[1]) * 10000);
    }
  });
  // gapData から補完
  if (!rent && gapData?.rent) {
    rent = parseJapaneseNumber(String(gapData.rent));
  }
  // title タグから: "...／宮崎台駅の賃貸" にはないが、ページ全体から探す
  if (!rent) {
    const htmlRentMatch = html.match(/賃料[：:]\s*([\d.]+)\s*万/);
    if (htmlRentMatch) {
      rent = Math.round(parseFloat(htmlRentMatch[1]) * 10000);
    }
  }

  // ── 管理費 ──
  let managementFee = 0;
  const mgmtText = findTableValue("管理費", "共益費");
  if (mgmtText) {
    managementFee = parseJapaneseNumber(mgmtText);
  }
  // 「管理費 N円」パターン
  if (!managementFee) {
    $("span, div").each((_, el) => {
      if (managementFee) return;
      const text = $(el).text().trim();
      const match = text.match(/管理費[・共益費]*\s*([\d,]+)\s*円/);
      if (match) {
        managementFee = parseJapaneseNumber(match[1]);
      }
    });
  }

  // ── 敷金・礼金 ──
  let deposit = 0;
  let keyMoney = 0;

  // SUUMOの「敷金/礼金」結合フィールド対応: 「- / 13.5万円」「1ヶ月 / 1ヶ月」等
  const combinedDkText = findTableValue("敷金/礼金", "敷金／礼金");
  if (combinedDkText) {
    const parts = combinedDkText.split(/\s*[/／]\s*/);
    if (parts.length >= 2) {
      const depositPart = parts[0].trim();
      const keyMoneyPart = parts[1].trim();
      if (depositPart !== "-" && depositPart !== "なし" && depositPart !== "") {
        deposit = parseMonths(depositPart, rent) || parseJapaneseNumber(depositPart);
      }
      if (keyMoneyPart !== "-" && keyMoneyPart !== "なし" && keyMoneyPart !== "") {
        keyMoney = parseMonths(keyMoneyPart, rent) || parseJapaneseNumber(keyMoneyPart);
      }
    }
  }

  // 個別フィールドから取得（結合フィールドで取れなかった場合）
  if (!deposit && !keyMoney && !combinedDkText) {
    const depositText = findTableValue("敷金");
    const keyMoneyText = findTableValue("礼金");
    if (depositText) {
      deposit = parseMonths(depositText, rent) || parseJapaneseNumber(depositText);
    }
    if (keyMoneyText) {
      keyMoney = parseMonths(keyMoneyText, rent) || parseJapaneseNumber(keyMoneyText);
    }
  }

  // span等から「敷金N万円」「礼金N万円」パターン
  if (!deposit && !keyMoney && !combinedDkText) {
    $("span, div, td").each((_, el) => {
      const text = $(el).text().trim();
      const dMatch = text.match(/敷金?\s*([\d.]+万|なし|-)/);
      if (dMatch && !deposit) {
        deposit = parseJapaneseNumber(dMatch[1]);
      }
      const kMatch = text.match(/礼金?\s*([\d.]+万|なし|-)/);
      if (kMatch && !keyMoney) {
        keyMoney = parseJapaneseNumber(kMatch[1]);
      }
    });
  }

  // ── 間取り ──
  let layout = findTableValue("間取り");
  if (layout) {
    // 結合セルから間取り部分を抽出 ("和6 洋6 洋5 LDK12.8 鉄筋コン" → "3LDK")
    const layoutMatch = layout.match(/(\d*[LDK]+\d*[\d.]*)/);
    if (layoutMatch) {
      // 部屋数を数える
      const roomCount = (layout.match(/[和洋]\d/g) || []).length;
      layout = roomCount > 0 ? `${roomCount}${layoutMatch[1].replace(/[\d.]+$/, "")}` : layoutMatch[1];
    }
  }

  // ── 面積（SUUMOの部屋情報から取得） ──
  let areaText = findTableValue("専有面積", "面積", "広さ");
  let area = parseArea(areaText);
  // 結合ヘッダーから面積を探す（例: "間取り詳細面積" のようなケース）
  if (!area) {
    for (const row of rawTableData) {
      if (area) break;
      const m = row.td.match(/([\d.]+)\s*(?:[mｍ][²2]|㎡|平米)/);
      if (m) {
        const val = parseFloat(m[1]);
        if (val >= 10 && val <= 500) {
          area = val;
          areaText = row.td;
        }
      }
    }
  }
  // SUUMOの部屋情報セクションのセレクタから取得
  if (!area) {
    $(".property_view_detail-body, .property_data, .l-property_body, .property_view_main").find("*").each((_, el) => {
      if (area) return;
      const text = $(el).clone().children().remove().end().text().trim();
      const match = text.match(/([\d.]+)\s*(?:[mｍ][²2]|㎡|平米)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val >= 10 && val <= 500) {
          area = val;
          areaText = text;
        }
      }
    });
  }
  // gapDataから補完
  if (!area && gapData?.menseki) {
    const val = parseFloat(String(gapData.menseki));
    if (val >= 10 && val <= 500) {
      area = val;
    }
  }
  // JavaScript変数 mensekiDisp から補完
  if (!area) {
    const mensekiMatch = html.match(/mensekiDisp\s*[:=]\s*"([\d.]+)"/);
    if (mensekiMatch) {
      const val = parseFloat(mensekiMatch[1]);
      if (val >= 10 && val <= 500) {
        area = val;
      }
    }
  }

  // ── 階数 ──
  let floor = "";
  const floorText = findTableValue("階建", "階");
  if (floorText) {
    const floorMatch = floorText.match(/(\d+階\s*\/\s*\d+階建|\d+階\/地下?\d+階建|\d+階建)/);
    if (floorMatch) {
      floor = floorMatch[1];
    } else {
      floor = floorText.substring(0, 20);
    }
  }

  // ── 建物種別・構造 ──
  let buildingType = findTableValue("建物種別", "種別", "構造");
  // 結合データ "和6 洋6 洋5 LDK12.8 鉄筋コン" から構造部分抽出
  if (!buildingType) {
    const structText = findTableValue("間取り詳細構造", "間取り");
    const structMatch = structText.match(/(鉄筋コン|鉄骨|木造|RC|SRC|S造|軽量鉄骨)/);
    if (structMatch) {
      buildingType = structMatch[1];
    }
  }

  // ── 築年数 ──
  let age = findTableValue("築年月", "築年数");
  if (!age) {
    const floorData = findTableValue("階建築年月", "階建");
    const ageMatch = floorData.match(/(\d{4}年\d{1,2}月)/);
    if (ageMatch) {
      age = ageMatch[1];
    }
  }
  // 「1階/5階建1997年9月」のような結合データから階数も取得
  if (!floor) {
    const combinedText = findTableValue("階建築年月", "階建");
    const floorMatch = combinedText.match(/(\d+階\s*[/／]\s*\d+階建)/);
    if (floorMatch) {
      floor = floorMatch[1];
    }
  }

  // ── 住所 ──
  let address = findTableValue("所在地", "住所");
  if (!address) {
    // title タグから: 「／神奈川県川崎市宮前区馬絹６／」
    const titleText = $("title").text();
    const addrMatch = titleText.match(/／((?:東京都|北海道|(?:大阪|京都)府|.{2,3}県).+?)／/);
    if (addrMatch) {
      address = addrMatch[1];
    }
  }

  // ── 向き ──
  const direction = findTableValue("向き", "方角");

  // ── 契約期間 ──
  const contractType = findTableValue("契約期間");

  // ── 駅情報（SUUMOのアクセス情報ベース） ──
  const stations: StationAccess[] = [];
  const seenStations = new Set<string>();

  function addStation(text: string) {
    const beforeCount = stations.length;
    parseStationText(text, stations);
    if (stations.length > beforeCount) {
      const last = stations[stations.length - 1];
      const key = `${last.station}-${last.walkMinutes}`;
      if (seenStations.has(key)) {
        stations.pop();
      } else {
        seenStations.add(key);
      }
    }
  }

  // 1. セレクタベースで試行（SUUMO物件詳細の交通セクション）
  $(".property_view_detail-station li, .property_view_traffic li").each((_, li) => {
    addStation($(li).text().trim());
  });

  // 2. テーブルの「交通」フィールド
  if (stations.length === 0) {
    const trafficText = findTableValue("交通", "アクセス");
    if (trafficText) {
      const lines = trafficText.split(/\n/).filter(Boolean);
      for (const line of lines) {
        addStation(line.trim());
      }
    }
  }

  // 3. フォールバック: メインコンテンツ領域内のみスキャン（関連物件等を除外）
  if (stations.length === 0) {
    // SUUMOの物件詳細エリアに限定（記事下部のおすすめ物件等を除外）
    const mainArea = $(".property_view_detail, .section_h1, .l-contents, #contents, main, article").first();
    const searchRoot = mainArea.length ? mainArea : $("body");
    searchRoot.find("*").each((_, el) => {
      if (stations.length >= 3) return false; // 3駅で打ち切り
      const text = $(el).clone().children().remove().end().text().trim();
      if (text.includes("駅") && text.includes("分") && text.length < 100 && text.length > 5) {
        addStation(text);
      }
    });
  }

  const propertyStations = stations.slice(0, 3);

  // ── 設備 ──
  const features: string[] = [];
  $(".property_view_detail-features li, .property_data-features li").each((_, li) => {
    const text = $(li).text().trim();
    if (text) features.push(text);
  });
  const featuresText = findTableValue("設備", "条件・設備", "条件");
  if (featuresText) {
    featuresText.split(/[、,／\n]/).forEach((f) => {
      const t = f.trim();
      if (t && !features.includes(t)) features.push(t);
    });
  }
  // 「条件取り扱い店舗物件コード」のような結合テーブルから条件を抽出
  const condText = findTableValue("条件取り扱い");
  if (condText) {
    const condPart = condText.split(/\d{5,}/)[0]; // 物件コード以前
    condPart.split(/[/／\n]/).forEach((f) => {
      const t = f.trim();
      if (t && !features.includes(t) && t.length < 30) features.push(t);
    });
  }

  // ── 画像URL取得 ──
  const images: string[] = [];
  const seenUrls = new Set<string>();

  $("img").each((_, img) => {
    const src = $(img).attr("src") || $(img).attr("data-src") || $(img).attr("data-lazy") || "";
    if (
      src &&
      !seenUrls.has(src) &&
      !src.includes("spacer") &&
      !src.includes("icon") &&
      !src.includes("logo") &&
      !src.includes("common") &&
      !src.includes("btn_") &&
      !src.includes("arrow") &&
      (src.includes("suumo") || src.includes("img0")) &&
      (src.includes("/bukken/") || src.includes("/chintai/") || src.includes("/jnc/") || src.includes("resize"))
    ) {
      const largeSrc = src
        .replace(/\/s\//g, "/l/")
        .replace(/_s\./, "_l.")
        .replace(/\/resize\/\d+x\d+/, "/resize/640x480");
      seenUrls.add(largeSrc);
      images.push(largeSrc);
    }
  });

  // og:image
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage && !seenUrls.has(ogImage)) {
    images.unshift(ogImage);
  }

  // ── 初期費用関連のスクレイピング ──

  // 仲介手数料
  const brokerageText = findTableValue("仲介手数料");
  let brokerageFee = 0;
  if (brokerageText) {
    // 「家賃1ヶ月分+税」「家賃の1.1ヶ月分」等
    const monthMatch = brokerageText.match(/([\d.]+)\s*ヶ?月/);
    if (monthMatch) {
      const months = parseFloat(monthMatch[1]);
      // 「税」「税込」が含まれていればそのまま、なければ×1.1（税込）
      if (brokerageText.includes("税")) {
        brokerageFee = Math.round(rent * months);
      } else {
        brokerageFee = Math.round(rent * months * 1.1);
      }
    } else {
      brokerageFee = parseJapaneseNumber(brokerageText);
    }
  }

  // 保証会社
  const guaranteeText = findTableValue("保証会社", "保証金", "保証料");
  let guaranteeFee = 0;
  if (guaranteeText) {
    // 「初回のみ...33000円」のパターンを優先
    const initialMatch = guaranteeText.match(/初回[^、,]*?([\d,]+)\s*円/);
    if (initialMatch) {
      guaranteeFee = parseInt(initialMatch[1].replace(/,/g, ""), 10);
    } else {
      const monthMatch = guaranteeText.match(/([\d.]+)\s*ヶ?月/);
      if (monthMatch) {
        guaranteeFee = Math.round(rent * parseFloat(monthMatch[1]));
      } else {
        // 「総賃料の50%」等（「毎月」を含む場合は月額なので初期費用としてはスキップ）
        const pctMatch = guaranteeText.match(/([\d.]+)\s*[%％]/);
        if (pctMatch && !guaranteeText.includes("毎月")) {
          guaranteeFee = Math.round((rent + managementFee) * parseFloat(pctMatch[1]) / 100);
        } else if (!pctMatch) {
          guaranteeFee = parseJapaneseNumber(guaranteeText);
        }
      }
    }
  }

  // 火災保険（損保）
  const insuranceText = findTableValue("損保", "火災保険", "保険");
  let fireInsurance = 0;
  if (insuranceText) {
    fireInsurance = parseJapaneseNumber(insuranceText);
  }

  // 鍵交換（単独フィールド）
  const keyExchangeText = findTableValue("鍵交換", "カギ交換");
  let keyExchange = 0;
  if (keyExchangeText) {
    keyExchange = parseJapaneseNumber(keyExchangeText);
  }

  // その他費用（クリーニング代、消毒費用、サポート料等）
  const otherCosts: { label: string; amount: number; text: string }[] = [];
  const otherCostKeys = [
    { key: "クリーニング", label: "クリーニング代" },
    { key: "室内清掃", label: "室内清掃費" },
    { key: "消毒", label: "消毒費用" },
    { key: "除菌", label: "除菌費用" },
    { key: "安心サポート", label: "安心サポート" },
    { key: "24時間サポート", label: "24時間サポート" },
    { key: "抗菌", label: "抗菌施工費" },
    { key: "入居安心", label: "入居安心サービス" },
  ];
  for (const { key, label } of otherCostKeys) {
    const text = findTableValue(key);
    if (text) {
      const amount = parseJapaneseNumber(text);
      if (amount > 0) {
        otherCosts.push({ label, amount, text });
      }
    }
  }

  // ── 「ほか初期費用」フィールド ──
  // SUUMOの「ほか初期費用」: 「合計2.2万円（内訳：鍵交換代2.2万円）」
  // 「合計5.5万円（内訳：鍵交換代2.2万円／クリーニング代3.3万円）」等
  const otherInitialText = findTableValue("ほか初期費用", "その他初期費用", "その他費用");
  if (otherInitialText) {
    // 内訳をパース: 「鍵交換代2.2万円」「クリーニング代3.3万円」等
    const breakdownMatch = otherInitialText.match(/内訳[：:](.+?)(?:\)|）|$)/);
    if (breakdownMatch) {
      const breakdownStr = breakdownMatch[1];
      // 「／」「/」「、」区切りで各項目を分割
      const items = breakdownStr.split(/[／/、,]/).filter(Boolean);
      for (const item of items) {
        const trimmed = item.trim();
        const amountMatch = trimmed.match(/([\d,.]+)\s*万?\s*円/);
        const amount = amountMatch ? parseJapaneseNumber(trimmed) : 0;
        if (amount <= 0) continue;

        // 鍵交換代は専用フィールドに
        if (trimmed.includes("鍵交換") || trimmed.includes("カギ交換")) {
          if (!keyExchange) {
            keyExchange = amount;
          }
        } else {
          // ラベルを抽出（金額部分を除去）
          const label = trimmed.replace(/[\d,.]+\s*万?\s*円.*$/, "").trim() || trimmed;
          // 既に同じラベルが追加済みでなければ追加
          if (!otherCosts.find((c) => c.label === label)) {
            otherCosts.push({ label, amount, text: trimmed });
          }
        }
      }
    } else {
      // 内訳がない場合、合計金額だけでも取得
      const totalAmount = parseJapaneseNumber(otherInitialText);
      if (totalAmount > 0 && !otherCosts.find((c) => c.label === "その他初期費用")) {
        otherCosts.push({ label: "その他初期費用", amount: totalAmount, text: otherInitialText });
      }
    }
  }

  // ── 敷地内駐車場 ──
  let parkingText = findTableValue("駐車場");
  // 「付無料/平置駐」→「無料 / 平置き」等に整形
  if (parkingText) {
    parkingText = parkingText
      .replace(/^付/, "")
      .replace(/平置駐$/, "平置き")
      .replace(/機械駐$/, "機械式")
      .replace(/\//g, " / ")
      .trim();
    if (parkingText === "-" || parkingText === "無") {
      parkingText = "なし";
    }
  }

  // ── 周辺情報 ──
  const nearbyFacilities: NearbyFacility[] = [];
  // SUUMOの周辺情報: <td class="data_around"><ul><li>施設名（カテゴリ）までNNNm</li>...</ul></td>
  $(".data_around li, td[class*='around'] li").each((_, li) => {
    const text = $(li).text().trim();
    // 「オーケー港北店（スーパー）まで871m」パターン
    const match = text.match(/^(.+?)（(.+?)）まで([\d,]+)m$/);
    if (match) {
      nearbyFacilities.push({
        name: match[1].trim(),
        category: match[2].trim(),
        distanceM: parseInt(match[3].replace(/,/g, ""), 10),
      });
    }
  });
  // テーブルの「周辺情報」からもフォールバック
  if (nearbyFacilities.length === 0) {
    const nearbyText = findTableValue("周辺情報");
    if (nearbyText) {
      const lines = nearbyText.split(/\n/).filter(Boolean);
      for (const line of lines) {
        const match = line.trim().match(/^(.+?)(?:（|[\(])(.+?)(?:）|[\)])まで([\d,]+)m$/);
        if (match) {
          nearbyFacilities.push({
            name: match[1].trim(),
            category: match[2].trim(),
            distanceM: parseInt(match[3].replace(/,/g, ""), 10),
          });
        }
      }
    }
  }

  // ── POINT（おすすめポイント） ──
  let point = "";
  // SUUMOの「POINT」セクション: クラス名に "point" を含む要素
  $("*").each((_, el) => {
    if (point) return;
    const cls = $(el).attr("class") || "";
    if (cls.includes("point") || cls.includes("Point") || cls.includes("POINT")) {
      const text = $(el).text().trim();
      // 「POINT」見出し部分を除去して本文だけ取得
      const cleaned = text.replace(/^POINT\s*/i, "").trim();
      if (cleaned && cleaned.length > 5 && cleaned.length < 500) {
        point = cleaned;
      }
    }
  });
  // テーブルからも探す
  if (!point) {
    const pointText = findTableValue("POINT", "ポイント", "おすすめ");
    if (pointText) {
      point = pointText;
    }
  }

  return {
    name,
    rent,
    managementFee,
    deposit,
    keyMoney,
    layout,
    area,
    floor,
    buildingType,
    age,
    address,
    stations: propertyStations,
    features,
    direction,
    contractType,
    images,
    url,
    brokerageFee,
    brokerageFeeText: brokerageText,
    guaranteeFee,
    guaranteeFeeText: guaranteeText,
    fireInsurance,
    fireInsuranceText: insuranceText,
    keyExchange,
    keyExchangeText: keyExchangeText,
    otherCosts,
    parking: parkingText,
    point,
    nearbyFacilities,
  } as PropertyData;
}
