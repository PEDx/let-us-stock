import type { Quote } from "yahoo-finance2/modules/quote";
import type { useReactTable } from "@tanstack/react-table";

/**
 * QuoteTable 组件属性
 */
export interface QuoteTableProps {
  quotes: Quote[];
  onRemoveSymbol?: (symbol: string) => void;
  onReorder?: (newOrder: string[]) => void;
  onSymbolClick?: (symbol: string, event: React.MouseEvent) => void;
}

/**
 * SortableRow 组件属性
 */
export interface SortableRowProps {
  quote: Quote;
  onRemoveSymbol?: (symbol: string) => void;
  onSymbolClick?: (symbol: string, event: React.MouseEvent) => void;
  visibleCells: ReturnType<
    ReturnType<typeof useReactTable<Quote>>["getRowModel"]
  >["rows"][number]["getVisibleCells"];
}

/**
 * Table 实例类型
 */
export type QuoteTableInstance = ReturnType<typeof useReactTable<Quote>>;

/**
 * Column 类型
 */
export type QuoteColumn = ReturnType<QuoteTableInstance["getAllColumns"]>[number];
