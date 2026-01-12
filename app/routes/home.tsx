"use client";

import { useEffect, useState, useCallback } from "react";
import { QuoteTable } from "~/components/quote-table";
import { StockSearch } from "~/components/stock-search";
import { StockDetail } from "~/components/stock-detail";
import {
  getSymbols,
  addSymbol,
  removeSymbol,
  reorderSymbols,
} from "~/lib/stock-store";
import type { Quote } from "yahoo-finance2/modules/quote";
import { Loader2 } from "lucide-react";

export function meta() {
  return [
    { title: "Let Us Stock" },
    { name: "description", content: "Let Us Stock" },
  ];
}

interface OpenWindow {
  symbol: string;
  position: { x: number; y: number };
}

export default function Home() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);

  // 获取行情数据
  const fetchQuotes = useCallback(async (symbolList: string[]) => {
    if (symbolList.length === 0) {
      setQuotes([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/quote?symbols=${symbolList.join(",")}`,
      );
      const data = await response.json();
      // 按照 symbolList 的顺序排序 quotes
      const quotesMap = new Map(
        (data.quotes || []).map((q: Quote) => [q.symbol, q]),
      );
      const sortedQuotes = symbolList
        .map((s) => quotesMap.get(s))
        .filter(Boolean) as Quote[];
      setQuotes(sortedQuotes);
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

  // 重新排序
  const handleReorder = async (newOrder: string[]) => {
    setSymbols(newOrder);
    // 根据新顺序排列 quotes
    const quotesMap = new Map(quotes.map((q) => [q.symbol, q]));
    const sortedQuotes = newOrder
      .map((s) => quotesMap.get(s))
      .filter(Boolean) as Quote[];
    setQuotes(sortedQuotes);
    // 保存新顺序
    await reorderSymbols(newOrder);
  };

  // 点击股票代码打开详情窗口
  const handleSymbolClick = (symbol: string, event: React.MouseEvent) => {
    // 检查是否已经打开
    if (openWindows.some((w) => w.symbol === symbol)) {
      return;
    }

    // 计算新窗口位置（基于点击位置，稍微偏移）
    const offset = openWindows.length * 30;
    const position = {
      x: Math.min(event.clientX + 20 + offset, window.innerWidth - 400),
      y: Math.min(event.clientY - 50 + offset, window.innerHeight - 450),
    };

    setOpenWindows((prev) => [...prev, { symbol, position }]);
  };

  // 关闭详情窗口
  const handleCloseWindow = (symbol: string) => {
    setOpenWindows((prev) => prev.filter((w) => w.symbol !== symbol));
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
        <QuoteTable
          quotes={quotes}
          onRemoveSymbol={handleRemoveSymbol}
          onReorder={handleReorder}
          onSymbolClick={handleSymbolClick}
        />
      )}

      {/* 股票详情弹窗 */}
      {openWindows.map((window) => (
        <StockDetail
          key={window.symbol}
          symbol={window.symbol}
          position={window.position}
          onClose={() => handleCloseWindow(window.symbol)}
        />
      ))}
    </main>
  );
}
