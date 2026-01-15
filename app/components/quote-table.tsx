"use client";

import { useMemo, useState, useEffect } from "react";
import type { Quote } from "yahoo-finance2/modules/quote";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from "./ui/table";
import { cn, formatNumber, formatLargeNumber } from "~/lib/utils";
import { useI18n } from "~/lib/i18n";
import {
  X,
  GripVertical,
  Inbox,
  Settings2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { ConfirmPopover } from "./confirm-popover";
import { Popover } from "@base-ui/react/popover";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type VisibilityState,
  type ColumnDef,
} from "@tanstack/react-table";

// 列配置存储 key
const COLUMN_VISIBILITY_KEY = "quote-table-column-visibility";

// 限制拖拽只能在垂直方向且不超出容器边界
const restrictToVerticalAxisAndParent: Modifier = ({
  transform,
  draggingNodeRect,
  containerNodeRect,
}) => {
  if (!draggingNodeRect || !containerNodeRect) {
    return { ...transform, x: 0 };
  }

  const minY = containerNodeRect.top - draggingNodeRect.top;
  const maxY = containerNodeRect.bottom - draggingNodeRect.bottom;

  return {
    ...transform,
    x: 0,
    y: Math.min(Math.max(transform.y, minY), maxY),
  };
};



interface SortableRowProps {
  quote: Quote;
  onRemoveSymbol?: (symbol: string) => void;
  onSymbolClick?: (symbol: string, event: React.MouseEvent) => void;
  visibleCells: ReturnType<
    ReturnType<typeof useReactTable<Quote>>["getRowModel"]
  >["rows"][number]["getVisibleCells"];
}

function SortableRow({
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cells = visibleCells();

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("group", isDragging && "opacity-50 bg-muted")}>
      <TableCell className='w-6'>
        <span
          {...attributes}
          {...listeners}
          className='cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing'>
          <GripVertical className='size-3' />
        </span>
      </TableCell>
      {cells.map((cell) => {
        // 处理特殊列
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
        return (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
      {onRemoveSymbol && (
        <TableCell>
          <ConfirmPopover onConfirm={() => onRemoveSymbol(quote.symbol)}>
            <span className='text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100'>
              <X className='size-3' />
            </span>
          </ConfirmPopover>
        </TableCell>
      )}
    </TableRow>
  );
}

// 列可见性配置组件
function ColumnVisibilityMenu({
  table,
  t,
}: {
  table: ReturnType<typeof useReactTable<Quote>>;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const allColumns = table.getAllLeafColumns().filter((col) => col.getCanHide());

  const handleShowAll = () => {
    allColumns.forEach((col) => col.toggleVisibility(true));
  };

  const handleHideAll = () => {
    allColumns.forEach((col) => col.toggleVisibility(false));
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        className='cursor-pointer text-muted-foreground hover:text-foreground'
        title={t.table.columns}>
        <Settings2 className='size-3.5' />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4}>
          <Popover.Popup className='min-w-36 rounded-xs border bg-background p-1 shadow-lg'>
            <div className='flex gap-1 border-b px-2 pb-1 text-xs'>
              <button
                onClick={handleShowAll}
                className='text-blue-600 hover:underline'>
                {t.table.showAll}
              </button>
              <span className='text-muted-foreground'>/</span>
              <button
                onClick={handleHideAll}
                className='text-blue-600 hover:underline'>
                {t.table.hideAll}
              </button>
            </div>
            {allColumns.map((column) => (
              <label
                key={column.id}
                className='flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1 text-xs hover:bg-muted'>
                <span
                  className={cn(
                    "flex size-3.5 items-center justify-center rounded-xs border",
                    column.getIsVisible()
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-muted-foreground",
                  )}>
                  {column.getIsVisible() && <Check className='size-2.5' />}
                </span>
                <input
                  type='checkbox'
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  className='sr-only'
                />
                <span>{column.columnDef.header as string}</span>
              </label>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// 可排序表头组件
function SortableHeader({
  column,
  children,
}: {
  column: ReturnType<ReturnType<typeof useReactTable<Quote>>["getAllColumns"]>[number];
  children: React.ReactNode;
}) {
  const canSort = column.getCanSort();

  if (!canSort) {
    return <>{children}</>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className='flex cursor-pointer items-center gap-1 hover:text-foreground'>
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

interface QuoteTableProps {
  quotes: Quote[];
  onRemoveSymbol?: (symbol: string) => void;
  onReorder?: (newOrder: string[]) => void;
  onSymbolClick?: (symbol: string, event: React.MouseEvent) => void;
}

export function QuoteTable({
  quotes,
  onRemoveSymbol,
  onReorder,
  onSymbolClick,
}: QuoteTableProps) {
  const { t } = useI18n();

  // 排序状态
  const [sorting, setSorting] = useState<SortingState>([]);

  // 列可见性状态
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [isVisibilityLoaded, setIsVisibilityLoaded] = useState(false);

  // 从本地存储加载列可见性配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
      if (saved) {
        setColumnVisibility(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setIsVisibilityLoaded(true);
  }, []);

  // 保存列可见性配置到本地存储（只有加载完成后才保存）
  useEffect(() => {
    if (!isVisibilityLoaded) return;
    try {
      localStorage.setItem(
        COLUMN_VISIBILITY_KEY,
        JSON.stringify(columnVisibility),
      );
    } catch {
      // ignore
    }
  }, [columnVisibility, isVisibilityLoaded]);

  const columnHelper = createColumnHelper<Quote>();

  // 定义列
  const columns = useMemo<ColumnDef<Quote, unknown>[]>(
    () => [
      columnHelper.accessor("symbol", {
        header: t.table.symbol,
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor("longName", {
        header: t.table.name,
        enableSorting: false,
        enableHiding: true,
        cell: (info) => info.getValue() ?? "-",
      }),
      columnHelper.accessor("regularMarketPrice", {
        header: t.table.price,
        enableSorting: true,
        enableHiding: true,
        cell: (info) => {
          const value = info.getValue();
          return value != null ? formatNumber(value as number) : "-";
        },
      }),
      columnHelper.accessor("regularMarketChange", {
        header: t.table.change,
        enableSorting: true,
        enableHiding: true,
        cell: (info) => {
          const value = info.getValue();
          return value != null ? formatNumber(value as number) : "-";
        },
      }),
      columnHelper.accessor("regularMarketChangePercent", {
        header: t.table.percentChange,
        enableSorting: true,
        enableHiding: true,
        cell: (info) => {
          const value = info.getValue();
          return value != null
            ? formatNumber(value as number, 3)
            : "-";
        },
      }),
      columnHelper.accessor("trailingPE", {
        header: t.table.trailingPE,
        enableSorting: true,
        enableHiding: true,
        cell: (info) => {
          const value = info.getValue();
          return value != null ? formatNumber(value as number) : "-";
        },
      }),
      columnHelper.accessor("forwardPE", {
        header: t.table.forwardPE,
        enableSorting: true,
        enableHiding: true,
        cell: (info) => {
          const value = info.getValue();
          return value != null ? formatNumber(value as number) : "-";
        },
      }),
      columnHelper.accessor("priceToBook", {
        header: t.table.priceToBook,
        enableSorting: true,
        enableHiding: true,
        cell: (info) => {
          const value = info.getValue();
          return value != null ? formatNumber(value as number) : "-";
        },
      }),
      columnHelper.accessor("marketCap", {
        header: t.table.marketCap,
        enableSorting: true,
        enableHiding: true,
        cell: (info) => {
          const value = info.getValue();
          return value != null ? formatLargeNumber(value as number) : "-";
        },
      }),
    ],
    [t, columnHelper],
  );

  const table = useReactTable({
    data: quotes,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.symbol,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = quotes.findIndex((q) => q.symbol === active.id);
      const newIndex = quotes.findIndex((q) => q.symbol === over.id);
      const newQuotes = arrayMove(quotes, oldIndex, newIndex);
      onReorder?.(newQuotes.map((q) => q.symbol));
    }
  };

  if (quotes.length === 0) {
    return (
      <div className='flex h-40 flex-col items-center justify-center border border-dashed text-muted-foreground'>
        <Inbox className='mb-2 size-6 opacity-50' />
        <p className='text-sm'>{t.table.empty}</p>
      </div>
    );
  }

  const { rows } = table.getRowModel();

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
              <TableHead className='w-6'></TableHead>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  <SortableHeader column={header.column}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </SortableHeader>
                </TableHead>
              ))}
              {onRemoveSymbol && (
                <TableHead className='w-10'>
                  <ColumnVisibilityMenu table={table} t={t} />
                </TableHead>
              )}
            </TableRow>
          ))}
        </TableHeader>
        <SortableContext
          items={rows.map((row) => row.id)}
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
