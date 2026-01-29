import { useMemo, useState, useEffect, useCallback, memo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Inbox } from "lucide-react";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from "~/components/ui/table";
import { useI18n } from "~/lib/i18n";

import type { QuoteTableProps } from "./types";
import { COLUMN_VISIBILITY_KEY } from "./constants";
import { restrictToVerticalAxisAndParent } from "./utils";
import { createColumns } from "./columns";
import { SortableRow } from "./sortable-row";
import { SortableHeader } from "./sortable-header";
import { ColumnVisibilityMenu } from "./column-visibility-menu";

export type { QuoteTableProps };

// Hoist static empty state
function createEmptyState(message: string) {
  return (
    <div className='text-muted-foreground flex h-40 flex-col items-center justify-center border border-dashed'>
      <Inbox className='mb-2 size-6 opacity-50' />
      <p className='text-sm'>{message}</p>
    </div>
  );
}

/**
 * 股票行情表格
 *
 * 功能：
 * - 列排序（点击表头）
 * - 列显示/隐藏配置
 * - 行拖拽排序
 * - 股票详情弹窗
 * - 删除确认
 */
export function QuoteTable({
  quotes,
  onRemoveSymbol,
  onReorder,
  onSymbolClick,
}: QuoteTableProps) {
  const { t, language } = useI18n();

  // 排序状态
  const [sorting, setSorting] = useState<SortingState>([]);

  // 列可见性状态 - 使用懒初始化从 localStorage 读取
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 保存列可见性配置到本地存储
  useEffect(() => {
    try {
      localStorage.setItem(
        COLUMN_VISIBILITY_KEY,
        JSON.stringify(columnVisibility),
      );
    } catch {
      // ignore
    }
  }, [columnVisibility]);

  // 列定义
  const columns = useMemo(
    () => createColumns({ labels: t.table, language }),
    [t.table, language],
  );

  // 创建表格实例
  const table = useReactTable({
    data: quotes,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.symbol,
  });

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 拖拽结束处理
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = quotes.findIndex((q) => q.symbol === active.id);
      const newIndex = quotes.findIndex((q) => q.symbol === over.id);
      const newQuotes = arrayMove(quotes, oldIndex, newIndex);
      onReorder?.(newQuotes.map((q) => q.symbol));
    }
  }, [quotes, onReorder]);

  // 空状态
  if (quotes.length === 0) {
    return createEmptyState(t.table.empty);
  }

  const { rows } = table.getRowModel();

  // Memoize row IDs for SortableContext
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxisAndParent]}
      onDragEnd={handleDragEnd}>
      <Table className='border'>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {/* 拖拽手柄列 */}
              <TableHead className='w-6'></TableHead>

              {/* 数据列 */}
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    header.id === "marketCap" ? "text-right" : undefined
                  }>
                  <SortableHeader column={header.column}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </SortableHeader>
                </TableHead>
              ))}

              {/* 操作列 */}
              {onRemoveSymbol && (
                <TableHead className='w-10'>
                  <ColumnVisibilityMenu
                    table={table}
                    labels={{
                      columns: t.table.columns,
                      showAll: t.table.showAll,
                      hideAll: t.table.hideAll,
                    }}
                  />
                </TableHead>
              )}
            </TableRow>
          ))}
        </TableHeader>

        <SortableContext
          items={rowIds}
          strategy={verticalListSortingStrategy}>
          <TableBody>
            {rows.map((row) => (
              <SortableRow
                key={row.id}
                quote={row.original}
                onRemoveSymbol={onRemoveSymbol}
                onSymbolClick={onSymbolClick}
                visibleCells={row.getVisibleCells}
              />
            ))}
          </TableBody>
        </SortableContext>
      </Table>
    </DndContext>
  );
}
