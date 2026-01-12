"use client";

import type { Quote } from "yahoo-finance2/modules/quote";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
} from "./ui/table";
import { cn } from "~/lib/utils";
import { useI18n } from "~/lib/i18n";
import { X, GripVertical } from "lucide-react";
import { ConfirmPopover } from "./confirm-popover";
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

function truncateToTwoDecimals(
  value: number | string,
  decimalPlaces: number = 2,
): string {
  const num = Number(value);

  if (isNaN(num)) {
    return "-";
  }

  const str = String(num);
  const decimalIndex = str.indexOf(".");

  if (decimalIndex === -1) {
    return str + ".".padEnd(decimalPlaces + 1, "0");
  }

  let integerPart = str.substring(0, decimalIndex);
  let decimalPart = str.substring(decimalIndex + 1);
  let truncatedDecimal = decimalPart.substring(0, decimalPlaces);

  if (truncatedDecimal.length < decimalPlaces) {
    truncatedDecimal = truncatedDecimal.padEnd(decimalPlaces, "0");
  }

  return `${integerPart}.${truncatedDecimal}`;
}

const formatMarketCap = (marketCap: number) => {
  if (marketCap >= 1000000000) {
    return truncateToTwoDecimals(marketCap / 1000000000) + "B";
  } else if (marketCap >= 1000000) {
    return truncateToTwoDecimals(marketCap / 1000000) + "M";
  } else if (marketCap >= 1000) {
    return truncateToTwoDecimals(marketCap / 1000) + "K";
  }
  return truncateToTwoDecimals(marketCap);
};

interface SortableRowProps {
  quote: Quote;
  onRemoveSymbol?: (symbol: string) => void;
  onSymbolClick?: (symbol: string, event: React.MouseEvent) => void;
  t: ReturnType<typeof useI18n>["t"];
}

function SortableRow({ quote, onRemoveSymbol, onSymbolClick, t }: SortableRowProps) {
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

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("group", isDragging && "opacity-50 bg-muted")}>
      <TableCell className="w-6">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing">
          <GripVertical className="size-3" />
        </span>
      </TableCell>
      <TableCell>
        <button
          onClick={(e) => onSymbolClick?.(quote.symbol, e)}
          className="rounded-xs border border-blue-500 px-1 text-blue-600 hover:bg-blue-500/10 cursor-pointer">
          {quote.symbol}
        </button>
      </TableCell>
      <TableCell>{quote.longName}</TableCell>
      <TableCell>{quote.regularMarketPrice}</TableCell>
      <TableCell
        className={cn(
          quote.regularMarketChange > 0 ? "text-green-600" : "text-red-600",
        )}>
        {truncateToTwoDecimals(quote.regularMarketChange)}
      </TableCell>
      <TableCell>
        {truncateToTwoDecimals(quote.regularMarketChangePercent, 3)}
      </TableCell>
      <TableCell>{truncateToTwoDecimals(quote.trailingPE)}</TableCell>
      <TableCell>{truncateToTwoDecimals(quote.forwardPE)}</TableCell>
      <TableCell>{truncateToTwoDecimals(quote.priceToBook)}</TableCell>
      <TableCell>{formatMarketCap(quote.marketCap)}</TableCell>
      {onRemoveSymbol && (
        <TableCell>
          <ConfirmPopover onConfirm={() => onRemoveSymbol(quote.symbol)}>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500">
              <X className="size-3" />
            </span>
          </ConfirmPopover>
        </TableCell>
      )}
    </TableRow>
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxisAndParent]}
      onDragEnd={handleDragEnd}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6"></TableHead>
            <TableHead>{t.table.symbol}</TableHead>
            <TableHead>{t.table.name}</TableHead>
            <TableHead>{t.table.price}</TableHead>
            <TableHead>{t.table.change}</TableHead>
            <TableHead>{t.table.percentChange}</TableHead>
            <TableHead>{t.table.trailingPE}</TableHead>
            <TableHead>{t.table.forwardPE}</TableHead>
            <TableHead>{t.table.priceToBook}</TableHead>
            <TableHead>{t.table.marketCap}</TableHead>
            {onRemoveSymbol && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <SortableContext
          items={quotes.map((q) => q.symbol)}
          strategy={verticalListSortingStrategy}>
          <TableBody>
            {quotes.map((quote) => (
              <SortableRow
                key={quote.symbol}
                quote={quote}
                onRemoveSymbol={onRemoveSymbol}
                onSymbolClick={onSymbolClick}
                t={t}
              />
            ))}
          </TableBody>
        </SortableContext>
      </Table>
    </DndContext>
  );
}
