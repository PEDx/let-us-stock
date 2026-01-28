import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { QuoteColumn } from "./types";

interface SortableHeaderProps {
  column: QuoteColumn;
  children: React.ReactNode;
}

/**
 * 可排序表头组件
 */
export function SortableHeader({ column, children }: SortableHeaderProps) {
  const canSort = column.getCanSort();

  if (!canSort) {
    return <>{children}</>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className='hover:text-foreground inline-flex cursor-pointer items-center gap-1'>
      {children}
      {sorted === "asc" ? (
        <ArrowUp className='size-3' />
      ) : sorted === "desc" ? (
        <ArrowDown className='size-3' />
      ) : (
        <ArrowUpDown className='size-3 opacity-30' />
      )}
    </button>
  );
}
