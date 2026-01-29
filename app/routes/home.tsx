import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useTransition,
  useRef,
} from "react";
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

// Hoist static JSX to avoid re-creation
const loadingSpinner = (
  <div className='flex h-40 items-center justify-center border border-dashed'>
    <Loader2 className='text-muted-foreground size-8 animate-spin' />
  </div>
);

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
  const [isQuotesPending, startTransition] = useTransition();
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const lastFetchKeyRef = useRef<string | null>(null);

  // 构建分组 Map 以优化查找性能 (O(1) vs O(n))
  const groupMap = useMemo(
    () => new Map(groupsData.groups.map((g) => [g.id, g])),
    [groupsData.groups],
  );

  // 获取当前激活的分组 - 使用 Map 优化查找
  const activeGroup = groupMap.get(groupsData.activeGroupId);
  const currentSymbols = activeGroup?.symbols || [];

  // 获取行情数据 - 使用功能更新避免依赖 currentSymbols
  const fetchQuotes = useCallback(async (symbolList: string[]) => {
    if (symbolList.length === 0) {
      startTransition(() => {
        setQuotes([]);
      });
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
      startTransition(() => {
        setQuotes(sortedQuotes);
      });
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
    } finally {
      setIsQuotesLoading(false);
    }
  }, [startTransition]);

  // 初始化加载 - 使用原始值作为依赖，避免整个 groupsData 对象
  useEffect(() => {
    // 等待分组数据加载
    if (groupsLoading) {
      return;
    }

    // 加载完成后获取行情数据
    const group = groupMap.get(groupsData.activeGroupId);
    if (group) {
      const fetchKey = `${group.id}:${group.symbols.join(",")}`;
      if (lastFetchKeyRef.current === fetchKey) {
        return;
      }
      lastFetchKeyRef.current = fetchKey;
      fetchQuotes(group.symbols);
    }
  }, [groupsLoading, groupsData.activeGroupId, groupMap, fetchQuotes]);

  // 切换分组时重新获取行情 - 将逻辑放在事件处理器中，避免状态+效应模式
  const handleSelectGroup = async (groupId: string) => {
    await setActiveGroup(groupId);
  };

  // 添加分组
  const handleAddGroup = async (name: string) => {
    await addGroup(name);
    setQuotes([]);
  };

  // 删除分组
  const handleRemoveGroup = async (groupId: string) => {
    const wasActive = groupId === groupsData.activeGroupId;
    await removeGroup(groupId);

    // 如果删除的是当前分组，切换到第一个可用分组并获取行情
    if (wasActive) {
      const nextGroup = groupsData.groups.find((g) => g.id !== groupId);
      if (nextGroup) {
        setQuotes([]);
        await setActiveGroup(nextGroup.id);
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

  // 添加股票 - 使用 activeGroupId 参数而非依赖状态
  const handleAddSymbol = useCallback(
    async (symbol: string) => {
      const activeGroupId = groupsData.activeGroupId;
      await addSymbolToGroup(activeGroupId, symbol);
      // 重新获取最新分组数据
      const group = groupsData.groups.find(
        (g) => g.id === activeGroupId,
      );
      if (group) {
        setIsQuotesLoading(true);
        await fetchQuotes(group.symbols);
      }
    },
    [addSymbolToGroup, groupsData.activeGroupId, groupsData.groups, fetchQuotes],
  );

  // 删除股票 - 使用功能更新避免依赖 quotes 状态
  const handleRemoveSymbol = useCallback(
    async (symbol: string) => {
      await removeSymbolFromGroup(groupsData.activeGroupId, symbol);
      setQuotes((prev) => prev.filter((q) => q.symbol !== symbol));
    },
    [removeSymbolFromGroup, groupsData.activeGroupId],
  );

  // 重新排序股票 - 使用功能更新避免依赖 quotes 状态
  const handleReorder = useCallback(
    async (newOrder: string[]) => {
      // 先更新 UI - 使用功能更新
      setQuotes((prevQuotes) => {
        const quotesMap = new Map(prevQuotes.map((q) => [q.symbol, q]));
        return newOrder
          .map((s) => quotesMap.get(s))
          .filter(Boolean) as Quote[];
      });
      // 保存到存储
      await reorderSymbolsInGroup(groupsData.activeGroupId, newOrder);
    },
    [reorderSymbolsInGroup, groupsData.activeGroupId],
  );

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
  const isQuotesBusy = isQuotesLoading || isQuotesPending;

  // 渲染加载状态
  if (isLoading) {
    return <main className='page-area my-2'>{loadingSpinner}</main>;
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
      {isQuotesBusy ? loadingSpinner : (
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
