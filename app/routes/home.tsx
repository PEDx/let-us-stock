'use client'

import { useEffect, useState, useCallback } from 'react'
import { QuoteTable } from '~/components/quote-table'
import { StockSearch } from '~/components/stock-search'
import { StockDetail } from '~/components/stock-detail'
import { GroupTabs } from '~/components/group-tabs'
import { useGroupsData, type GroupsData } from '~/lib/stock-store'
import { useAuth } from '~/lib/firebase/auth-context'
import type { Quote } from 'yahoo-finance2/modules/quote'
import { Loader2 } from 'lucide-react'

export function meta() {
  return [
    { title: 'Market' },
    {
      name: 'description',
      content:
        'Free stock tracking tool with real-time quotes for US stocks and crypto.',
    },
  ]
}

interface OpenWindow {
  symbol: string
  position: { x: number; y: number }
}

export default function Home() {
  const { isAuthenticated: authLoading } = useAuth()
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
  } = useGroupsData()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([])

  // 获取当前激活的分组
  const activeGroup = groupsData.groups.find(
    (g) => g.id === groupsData.activeGroupId,
  )
  const currentSymbols = activeGroup?.symbols || []

  // 获取行情数据
  const fetchQuotes = useCallback(async (symbolList: string[]) => {
    if (symbolList.length === 0) {
      setQuotes([])
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/quote?symbols=${symbolList.join(',')}`)
      const data = await response.json()
      // 按照 symbolList 的顺序排序 quotes
      const quotesMap = new Map(
        (data.quotes || []).map((q: Quote) => [q.symbol, q]),
      )
      const sortedQuotes = symbolList
        .map((s) => quotesMap.get(s))
        .filter(Boolean) as Quote[]
      setQuotes(sortedQuotes)
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始化加载 - 等待登录态检查完成
  useEffect(() => {
    // 等待登录态检查完成
    if (groupsLoading) {
      return
    }

    if (!authLoading) {
      const group = groupsData.groups.find(
        (g) => g.id === groupsData.activeGroupId,
      )
      if (group) {
        fetchQuotes(group.symbols)
      } else {
        setIsLoading(false)
      }
    }
  }, [authLoading, groupsLoading, groupsData, fetchQuotes])

  // 切换分组时重新获取行情
  const handleSelectGroup = async (groupId: string) => {
    await setActiveGroup(groupId)
    const group = groupsData.groups.find((g) => g.id === groupId)
    if (group) {
      setIsLoading(true)
      await fetchQuotes(group.symbols)
    }
  }

  // 添加分组
  const handleAddGroup = async (name: string) => {
    await addGroup(name)
    setQuotes([])
  }

  // 删除分组
  const handleRemoveGroup = async (groupId: string) => {
    await removeGroup(groupId)
    // 如果删除的是当前分组，需要重新获取行情
    if (groupId === groupsData.activeGroupId) {
      const activeGroup = groupsData.groups.find(
        (g) => g.id === groupsData.activeGroupId,
      )
      if (activeGroup) {
        setIsLoading(true)
        await fetchQuotes(activeGroup.symbols)
      }
    }
  }

  // 重命名分组
  const handleRenameGroup = async (groupId: string, newName: string) => {
    await renameGroup(groupId, newName)
  }

  // 重新排序分组
  const handleReorderGroups = async (newOrder: string[]) => {
    await reorderGroups(newOrder)
  }

  // 添加股票
  const handleAddSymbol = async (symbol: string) => {
    await addSymbolToGroup(groupsData.activeGroupId, symbol)
    const group = groupsData.groups.find(
      (g) => g.id === groupsData.activeGroupId,
    )
    if (group) {
      setIsLoading(true)
      await fetchQuotes(group.symbols)
    }
  }

  // 删除股票
  const handleRemoveSymbol = async (symbol: string) => {
    await removeSymbolFromGroup(groupsData.activeGroupId, symbol)
    setQuotes((prev) => prev.filter((q) => q.symbol !== symbol))
  }

  // 重新排序股票
  const handleReorder = async (newOrder: string[]) => {
    // 先更新 UI
    const quotesMap = new Map(quotes.map((q) => [q.symbol, q]))
    const sortedQuotes = newOrder
      .map((s) => quotesMap.get(s))
      .filter(Boolean) as Quote[]
    setQuotes(sortedQuotes)
    // 保存到存储
    await reorderSymbolsInGroup(groupsData.activeGroupId, newOrder)
  }

  // 点击股票代码打开详情窗口
  const handleSymbolClick = (symbol: string, event: React.MouseEvent) => {
    // 检查是否已经打开
    if (openWindows.some((w) => w.symbol === symbol)) {
      return
    }

    // 计算新窗口位置（基于点击位置，稍微偏移）
    const offset = openWindows.length * 30
    const position = {
      x: Math.min(event.clientX + 20 + offset, window.innerWidth - 400),
      y: Math.min(event.clientY - 50 + offset, window.innerHeight - 450),
    }

    setOpenWindows((prev) => [...prev, { symbol, position }])
  }

  // 关闭详情窗口
  const handleCloseWindow = (symbol: string) => {
    setOpenWindows((prev) => prev.filter((w) => w.symbol !== symbol))
  }

  return (
    <main className='page-area my-2'>
      {/* 分组标签 */}

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

      {isLoading ? (
        <div className='flex items-center justify-center h-40 border border-dashed'>
          <Loader2 className='size-8 animate-spin text-muted-foreground' />
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
  )
}
