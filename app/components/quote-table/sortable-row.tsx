import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender } from "@tanstack/react-table";
import { GripVertical, X } from "lucide-react";
import { TableRow, TableCell } from "~/components/ui/table";
import { ConfirmPopover } from "~/components/confirm-popover";
import { cn } from "~/lib/utils";
import type { SortableRowProps } from "./types";

/**
 * 可拖拽排序的表格行
 */
export function SortableRow({
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
            <TableCell key={cell.id}>
              <button
                onClick={(e) => onSymbolClick?.(quote.symbol, e)}
                className='cursor-pointer rounded-xs border border-blue-500 px-1 text-blue-600 hover:bg-blue-500/10'>
                {quote.symbol}
              </button>
            </TableCell>
          );
        }

        // 涨跌额列 - 红绿色
        if (cell.column.id === "regularMarketChange") {
          return (
            <TableCell
              key={cell.id}
              className={cn(
                quote.regularMarketChange > 0
                  ? "text-green-600"
                  : "text-red-600",
              )}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        }

        // 市值列 - 右对齐
        if (cell.column.id === "marketCap") {
          return (
            <TableCell key={cell.id} className='text-right'>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        }

        // 默认列
        return (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
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
}
