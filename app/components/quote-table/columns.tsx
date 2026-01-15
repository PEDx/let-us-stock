import type { Quote } from "yahoo-finance2/modules/quote";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import {
  formatNumber,
  formatLargeNumber,
  formatLargeNumberZh,
} from "~/lib/utils";

const columnHelper = createColumnHelper<Quote>();

interface ColumnLabels {
  symbol: string;
  name: string;
  price: string;
  change: string;
  percentChange: string;
  trailingPE: string;
  forwardPE: string;
  priceToBook: string;
  marketCap: string;
}

interface CreateColumnsOptions {
  labels: ColumnLabels;
  language: string;
}

/**
 * 创建表格列定义
 */
export function createColumns({
  labels: t,
  language,
}: CreateColumnsOptions): ColumnDef<Quote, unknown>[] {
  // 根据语言选择格式化函数
  const formatMarketCap = language === "zh" ? formatLargeNumberZh : formatLargeNumber;
  return [
    columnHelper.accessor("symbol", {
      header: t.symbol,
      enableSorting: false,
      enableHiding: false,
    }),
    columnHelper.accessor("longName", {
      header: t.name,
      enableSorting: false,
      enableHiding: true,
      cell: (info) => info.getValue() ?? "-",
    }),
    columnHelper.accessor("regularMarketPrice", {
      header: t.price,
      enableSorting: true,
      enableHiding: true,
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatNumber(value as number) : "-";
      },
    }),
    columnHelper.accessor("regularMarketChange", {
      header: t.change,
      enableSorting: true,
      enableHiding: true,
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatNumber(value as number) : "-";
      },
    }),
    columnHelper.accessor("regularMarketChangePercent", {
      header: t.percentChange,
      enableSorting: true,
      enableHiding: true,
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatNumber(value as number, 3) : "-";
      },
    }),
    columnHelper.accessor("trailingPE", {
      header: t.trailingPE,
      enableSorting: true,
      enableHiding: true,
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatNumber(value as number) : "-";
      },
    }),
    columnHelper.accessor("forwardPE", {
      header: t.forwardPE,
      enableSorting: true,
      enableHiding: true,
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatNumber(value as number) : "-";
      },
    }),
    columnHelper.accessor("priceToBook", {
      header: t.priceToBook,
      enableSorting: true,
      enableHiding: true,
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatNumber(value as number) : "-";
      },
    }),
    columnHelper.accessor("marketCap", {
      header: t.marketCap,
      enableSorting: true,
      enableHiding: true,
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatMarketCap(value as number) : "-";
      },
    }),
  ];
}
