import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender } from "@tanstack/react-table";
import { GripVertical, X } from "lucide-react";
import { TableRow, TableCell } from "~/components/ui/table";
import { ConfirmPopover } from "~/components/confirm-popover";
import { cn } from "~/lib/utils";
import type { SortableRowProps } from "./types";
import { memo, useCallback } from "react";

// Memoized cell renderers to avoid re-renders
const SymbolCell = memo(function SymbolCell({
  symbol,
  onClick,
}: {
  symbol: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <TableCell>
      <button
        onClick={onClick}
        className='cursor-pointer rounded-xs border border-blue-500 px-1 text-blue-600 hover:bg-blue-500/10'>
        {symbol}
      </button>
    </TableCell>
  );
});

const ChangeCell = memo(function ChangeCell({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  return (
    <TableCell
      className={cn(
        value > 0 ? "text-green-600" : "text-red-600",
      )}>
      {children}
    </TableCell>
  );
});

const MarketCapCell = memo(function MarketCapCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TableCell className='text-right'>{children}</TableCell>;
});

const DefaultCell = memo(function DefaultCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TableCell>{children}</TableCell>;
});

/**
 * 可拖拽排序的表格行
 */
export const SortableRow = memo(function SortableRow({
  quote,
  onRemoveSymbol,
  onSymbolClick,
  visibleCells,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quote.symbol });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const cells = visibleCells();

  const handleSymbolClick = useCallback((e: React.MouseEvent) => {
    onSymbolClick?.(quote.symbol, e);
  }, [onSymbolClick, quote.symbol]);

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("group", isDragging && "bg-muted opacity-50")}>
      {/* 拖拽手柄 */}
      <TableCell className='w-6'>
        <span
          {...attributes}
          {...listeners}
          className='text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing'>
          <GripVertical className='size-3' />
        </span>
      </TableCell>

      {/* 数据单元格 */}
      {cells.map((cell) => {
        // 股票代码列 - 特殊样式
        if (cell.column.id === "symbol") {
          return (
            <SymbolCell
              key={cell.id}
              symbol={quote.symbol}
              onClick={handleSymbolClick}
            />
          );
        }

        // 涨跌额列 - 红绿色
        if (cell.column.id === "regularMarketChange") {
          return (
            <ChangeCell
              key={cell.id}
              value={quote.regularMarketChange ?? 0}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </ChangeCell>
          );
        }

        // 市值列 - 右对齐
        if (cell.column.id === "marketCap") {
          return (
            <MarketCapCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </MarketCapCell>
          );
        }

        // 默认列
        return (
          <DefaultCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </DefaultCell>
        );
      })}

      {/* 删除按钮 */}
      {onRemoveSymbol && (
        <TableCell>
          <ConfirmPopover onConfirm={() => onRemoveSymbol(quote.symbol)}>
            <button className='text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500'>
              <X className='size-3' />
            </button>
          </ConfirmPopover>
        </TableCell>
      )}
    </TableRow>
  );
});
