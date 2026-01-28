import { useEffect, useState, useCallback, useRef } from "react";
import { QuoteTable } from "~/components/quote-table";
import { StockSearch } from "~/components/stock-search";
import { StockDetail } from "~/components/stock-detail";
import { GroupTabs } from "~/components/group-tabs";
import { useGroupsData } from "~/lib/stock-store";
import type { Quote } from "yahoo-finance2/modules/quote";
import { Loader2 } from "lucide-react";

export function meta() {
  return [
    { title: "Market" },
    {
      name: "description",
      content:
        "Free stock tracking tool with real-time quotes for US stocks and crypto.",
    },
  ];
}

interface OpenWindow {
  symbol: string;
  position: { x: number; y: number };
}

export default function Home() {
  const {
    groupsData,
    isLoading: groupsLoading,
    addGroup,
    removeGroup,
    renameGroup,
    reorderGroups,
    setActiveGroup,
    addSymbolToGroup,
    removeSymbolFromGroup,
    reorderSymbolsInGroup,
  } = useGroupsData();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isQuotesLoading, setIsQuotesLoading] = useState(false);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);

  // 使用 ref 存储最新的 groupsData，解决闭包中的状态过期问题
  const groupsDataRef = useRef(groupsData);
  groupsDataRef.current = groupsData;

  // 获取当前激活的分组
  const activeGroup = groupsData.groups.find(
    (g) => g.id === groupsData.activeGroupId,
  );
  const currentSymbols = activeGroup?.symbols || [];

  // 获取行情数据
  const fetchQuotes = useCallback(async (symbolList: string[]) => {
    if (symbolList.length === 0) {
      setQuotes([]);
      setIsQuotesLoading(false);
      return;
    }

    setIsQuotesLoading(true);
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
      setIsQuotesLoading(false);
    }
  }, []);

  // 初始化加载 - 等待分组数据加载完成
  useEffect(() => {
    // 等待分组数据加载
    if (groupsLoading) {
      return;
    }

    // 加载完成后获取行情数据
    const group = groupsData.groups.find(
      (g) => g.id === groupsData.activeGroupId,
    );
    if (group) {
      fetchQuotes(group.symbols);
    }
  }, [groupsLoading, groupsData, fetchQuotes]);

  // 切换分组时重新获取行情
  const handleSelectGroup = async (groupId: string) => {
    await setActiveGroup(groupId);
    const group = groupsDataRef.current.groups.find((g) => g.id === groupId);
    if (group) {
      setIsQuotesLoading(true);
      await fetchQuotes(group.symbols);
    }
  };

  // 添加分组
  const handleAddGroup = async (name: string) => {
    await addGroup(name);
    setQuotes([]);
  };

  // 删除分组
  const handleRemoveGroup = async (groupId: string) => {
    await removeGroup(groupId);
    // 如果删除的是当前分组，需要重新获取行情
    if (groupId === groupsData.activeGroupId) {
      const activeGroup = groupsData.groups.find(
        (g) => g.id === groupsData.activeGroupId,
      );
      if (activeGroup) {
        setIsQuotesLoading(true);
        await fetchQuotes(activeGroup.symbols);
      }
    }
  };

  // 重命名分组
  const handleRenameGroup = async (groupId: string, newName: string) => {
    await renameGroup(groupId, newName);
  };

  // 重新排序分组
  const handleReorderGroups = async (newOrder: string[]) => {
    await reorderGroups(newOrder);
  };

  // 添加股票
  const handleAddSymbol = async (symbol: string) => {
    await addSymbolToGroup(groupsData.activeGroupId, symbol);
    // 使用 ref 获取最新的 groupsData，避免闭包中的过期状态
    const group = groupsDataRef.current.groups.find(
      (g) => g.id === groupsDataRef.current.activeGroupId,
    );
    if (group) {
      setIsQuotesLoading(true);
      await fetchQuotes(group.symbols);
    }
  };

  // 删除股票
  const handleRemoveSymbol = async (symbol: string) => {
    await removeSymbolFromGroup(groupsData.activeGroupId, symbol);
    setQuotes((prev) => prev.filter((q) => q.symbol !== symbol));
  };

  // 重新排序股票
  const handleReorder = async (newOrder: string[]) => {
    // 先更新 UI
    const quotesMap = new Map(quotes.map((q) => [q.symbol, q]));
    const sortedQuotes = newOrder
      .map((s) => quotesMap.get(s))
      .filter(Boolean) as Quote[];
    setQuotes(sortedQuotes);
    // 保存到存储
    await reorderSymbolsInGroup(groupsData.activeGroupId, newOrder);
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

  // 整体 loading 状态：分组数据加载中
  const isLoading = groupsLoading;

  // 渲染加载状态
  if (isLoading) {
    return (
      <main className='page-area my-2'>
        <div className='flex h-40 items-center justify-center border border-dashed'>
          <Loader2 className='text-muted-foreground size-8 animate-spin' />
        </div>
      </main>
    );
  }

  return (
    <main className='page-area my-2'>
      {/* 搜索添加 */}
      <div className='mb-2 flex items-center gap-2'>
        <div className='flex-1'>
          <StockSearch
            existingSymbols={currentSymbols}
            onAddSymbol={handleAddSymbol}
          />
        </div>
        <GroupTabs
          groups={groupsData.groups}
          activeGroupId={groupsData.activeGroupId}
          onSelectGroup={handleSelectGroup}
          onAddGroup={handleAddGroup}
          onRemoveGroup={handleRemoveGroup}
          onRenameGroup={handleRenameGroup}
          onReorderGroups={handleReorderGroups}
        />
      </div>

      {/* 行情数据加载状态 */}
      {isQuotesLoading ? (
        <div className='flex h-40 items-center justify-center border border-dashed'>
          <Loader2 className='text-muted-foreground size-8 animate-spin' />
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
