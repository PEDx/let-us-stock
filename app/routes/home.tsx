"use client";

import { useEffect, useState, useCallback } from "react";
import { QuoteTable } from "~/components/quote-table";
import { StockSearch } from "~/components/stock-search";
import { getSymbols, addSymbol, removeSymbol } from "~/lib/stock-store";
import type { Quote } from "yahoo-finance2/modules/quote";
import { Loader2 } from "lucide-react";

export function meta() {
  return [
    { title: "Let Us Stock" },
    { name: "description", content: "Let Us Stock" },
  ];
}

export default function Home() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取行情数据
  const fetchQuotes = useCallback(async (symbolList: string[]) => {
    if (symbolList.length === 0) {
      setQuotes([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/quote?symbols=${symbolList.join(",")}`);
      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    async function init() {
      const savedSymbols = await getSymbols();
      setSymbols(savedSymbols);
      await fetchQuotes(savedSymbols);
    }
    init();
  }, [fetchQuotes]);

  // 添加股票
  const handleAddSymbol = async (symbol: string) => {
    const newSymbols = await addSymbol(symbol);
    setSymbols(newSymbols);
    setIsLoading(true);
    await fetchQuotes(newSymbols);
  };

  // 删除股票
  const handleRemoveSymbol = async (symbol: string) => {
    const newSymbols = await removeSymbol(symbol);
    setSymbols(newSymbols);
    setQuotes((prev) => prev.filter((q) => q.symbol !== symbol));
  };

  return (
    <main className="page-area my-2">
      <div className="mb-4">
        <StockSearch existingSymbols={symbols} onAddSymbol={handleAddSymbol} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <QuoteTable quotes={quotes} onRemoveSymbol={handleRemoveSymbol} />
      )}
    </main>
  );
}
