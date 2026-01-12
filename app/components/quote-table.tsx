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

function truncateToTwoDecimals(value: number | string, decimalPlaces: number = 2): string {
    const num = Number(value);

    if (isNaN(num)) {
        return '-';
    }

    const str = String(num);

    const decimalIndex = str.indexOf('.');

    if (decimalIndex === -1) {
        return str + '.'.padEnd(decimalPlaces + 1, '0');
    }

    let integerPart = str.substring(0, decimalIndex);
    let decimalPart = str.substring(decimalIndex + 1);

    let truncatedDecimal = decimalPart.substring(0, decimalPlaces);

    if (truncatedDecimal.length < decimalPlaces) {
        truncatedDecimal = truncatedDecimal.padEnd(decimalPlaces, '0');
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

export function QuoteTable({ quotes }: { quotes: Quote[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className=''>Symbol</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>$ Price</TableHead>
          <TableHead>$ Change</TableHead>
          <TableHead className=''>% Change</TableHead>
          <TableHead>Trailing PE</TableHead>
          <TableHead>Forward PE</TableHead>
          <TableHead>Price to Book</TableHead>
          <TableHead>$ Market Cap</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((quote) => (
          <TableRow key={quote.symbol}>
            <TableCell className=''>
              <span className='text-blue-600 rounded-xs border border-blue-500 px-1'>
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
            <TableCell>{truncateToTwoDecimals(quote.regularMarketChangePercent, 3)}</TableCell>
            <TableCell>{truncateToTwoDecimals(quote.trailingPE)}</TableCell>
            <TableCell>{truncateToTwoDecimals(quote.forwardPE)}</TableCell>
            <TableCell>{truncateToTwoDecimals(quote.priceToBook)}</TableCell>
            <TableCell>{formatMarketCap(quote.marketCap)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
