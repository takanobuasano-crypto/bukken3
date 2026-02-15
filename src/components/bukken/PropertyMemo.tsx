"use client";

import { useState, useEffect, useCallback } from "react";
import { getMemo, saveMemo } from "@/lib/bukken/favorites";

interface Props {
  propertyUrl: string;
}

export default function PropertyMemo({ propertyUrl }: Props) {
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMemo(getMemo(propertyUrl));
    setSaved(false);
  }, [propertyUrl]);

  const handleSave = useCallback(() => {
    saveMemo(propertyUrl, memo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [propertyUrl, memo]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-2">メモ</h3>
      <p className="text-xs text-gray-400 mb-3">
        この物件について気になったことを残せます
      </p>
      <textarea
        value={memo}
        onChange={(e) => { setMemo(e.target.value); setSaved(false); }}
        placeholder="気になった点、内見の感想、質問事項などを入力..."
        rows={4}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
      />
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs transition-opacity ${saved ? "text-green-600 opacity-100" : "opacity-0"}`}>
          保存しました
        </span>
        <button
          onClick={handleSave}
          className="bg-gray-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  );
}
