"use client";

import type { InitialCostBreakdown, InitialCostItem } from "@/lib/bukken/types";

function CostTable({ items, total, label }: { items: InitialCostItem[]; total: number; label: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <table className="w-full">
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2.5">
                <span className="text-sm">{item.label}</span>
                {item.note && (
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {item.note}
                  </span>
                )}
              </td>
              <td className="py-2.5 text-right font-mono text-sm whitespace-nowrap">
                {item.amount > 0
                  ? `¥${item.amount.toLocaleString()}`
                  : item.note === "なし"
                  ? "¥0"
                  : `¥${item.amount.toLocaleString()}`}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300">
            <td className="py-2 font-bold text-sm">{label}</td>
            <td className="py-2 text-right font-bold font-mono text-sm">
              ¥{total.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function CostBreakdown({
  costs,
}: {
  costs: InitialCostBreakdown;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">初期費用</h3>

      {/* SUUMOに掲載されている費用 */}
      <div className="mb-4">
        <h4 className="text-sm font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">
          SUUMOに掲載されている費用
        </h4>
        <CostTable items={costs.suumoItems} total={costs.suumoTotal} label="小計" />
      </div>

      {/* 一般的に必要な費用 */}
      {costs.referenceItems.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">
            一般的に必要な費用（参考）
          </h4>
          <p className="text-xs text-red-500 mb-2">
            ※ SUUMOに掲載されていない費用です。実際の金額は契約時にご確認ください。
          </p>
          <CostTable items={costs.referenceItems} total={costs.referenceTotal} label="小計" />
        </div>
      )}

      {/* 合計 */}
      <div className="border-t-2 border-gray-300 pt-3 flex items-center justify-between">
        <span className="font-bold">合計（税込目安）</span>
        <span className="font-bold font-mono text-lg text-blue-700">
          ¥{costs.grandTotal.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
