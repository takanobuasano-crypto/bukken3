import type { PropertyData, InitialCostBreakdown, InitialCostItem } from "./types";

export function calculateInitialCosts(property: PropertyData): InitialCostBreakdown {
  const { rent, managementFee, deposit, keyMoney } = property;
  const suumoItems: InitialCostItem[] = [];
  const referenceItems: InitialCostItem[] = [];

  // ── SUUMOに掲載されている費用 ──

  suumoItems.push({
    label: "敷金",
    amount: deposit,
    isEstimate: false,
    note: deposit === 0 ? "なし" : undefined,
  });

  suumoItems.push({
    label: "礼金",
    amount: keyMoney,
    isEstimate: false,
    note: keyMoney === 0 ? "なし" : undefined,
  });

  if (property.brokerageFee > 0) {
    suumoItems.push({
      label: "仲介手数料",
      amount: property.brokerageFee,
      isEstimate: false,
      note: property.brokerageFeeText,
    });
  }

  if (property.guaranteeFee > 0) {
    suumoItems.push({
      label: "保証会社利用料",
      amount: property.guaranteeFee,
      isEstimate: false,
      note: property.guaranteeFeeText,
    });
  }

  if (property.fireInsurance > 0) {
    suumoItems.push({
      label: "火災保険料",
      amount: property.fireInsurance,
      isEstimate: false,
      note: property.fireInsuranceText,
    });
  }

  if (property.keyExchange > 0) {
    suumoItems.push({
      label: "鍵交換費用",
      amount: property.keyExchange,
      isEstimate: false,
      note: property.keyExchangeText,
    });
  }

  for (const cost of property.otherCosts) {
    suumoItems.push({
      label: cost.label,
      amount: cost.amount,
      isEstimate: false,
      note: cost.text,
    });
  }

  // ── 一般的に必要な費用（参考） ──

  referenceItems.push({
    label: "前家賃（1ヶ月分）",
    amount: rent,
    isEstimate: true,
    note: "入居月の家賃（日割りの場合あり）",
  });

  if (managementFee > 0) {
    referenceItems.push({
      label: "前管理費・共益費（1ヶ月分）",
      amount: managementFee,
      isEstimate: true,
      note: "入居月の管理費（日割りの場合あり）",
    });
  }

  const suumoTotal = suumoItems.reduce((sum, item) => sum + item.amount, 0);
  const referenceTotal = referenceItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    suumoItems,
    referenceItems,
    suumoTotal,
    referenceTotal,
    grandTotal: suumoTotal + referenceTotal,
  };
}
