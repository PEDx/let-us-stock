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
import { X } from "lucide-react";
import { ConfirmPopover } from "./confirm-popover";

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

interface QuoteTableProps {
  quotes: Quote[];
  onRemoveSymbol?: (symbol: string) => void;
}

export function QuoteTable({ quotes, onRemoveSymbol }: QuoteTableProps) {
  const { t } = useI18n();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="">{t.table.symbol}</TableHead>
          <TableHead>{t.table.name}</TableHead>
          <TableHead>{t.table.price}</TableHead>
          <TableHead>{t.table.change}</TableHead>
          <TableHead className="">{t.table.percentChange}</TableHead>
          <TableHead>{t.table.trailingPE}</TableHead>
          <TableHead>{t.table.forwardPE}</TableHead>
          <TableHead>{t.table.priceToBook}</TableHead>
          <TableHead>{t.table.marketCap}</TableHead>
          {onRemoveSymbol && <TableHead className="w-10"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((quote) => (
          <TableRow key={quote.symbol} className="group">
            <TableCell className="">
              <span className="rounded-xs border border-blue-500 px-1 text-blue-600">
                {quote.symbol}
              </span>
            </TableCell>
            <TableCell>{quote.longName}</TableCell>
            <TableCell>{quote.regularMarketPrice}</TableCell>
            <TableCell
              className={cn(
                quote.regularMarketChange > 0
                  ? "text-green-600"
                  : "text-red-600",
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
        ))}
      </TableBody>
    </Table>
  );
}
