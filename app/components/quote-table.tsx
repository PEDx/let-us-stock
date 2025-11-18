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

const safeToFixed = (value: number) => {
  return Number(value.toString().match(/^\d+(?:\.\d{0,2})?/));
};

const formatMarketCap = (marketCap: number) => {
  if (marketCap >= 1000000000) {
    return safeToFixed(marketCap / 1000000000) + "B";
  } else if (marketCap >= 1000000) {
    return safeToFixed(marketCap / 1000000) + "M";
  } else if (marketCap >= 1000) {
    return safeToFixed(marketCap / 1000) + "K";
  }
  return safeToFixed(marketCap);
};

export function QuoteTable({ quotes }: { quotes: Quote[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className=''>Symbol</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Change</TableHead>
          <TableHead className=''>% Change</TableHead>
          <TableHead>Trailing PE</TableHead>
          <TableHead>Forward PE</TableHead>
          <TableHead>Price to Book</TableHead>
          <TableHead>Market Cap</TableHead>
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
              {quote.regularMarketChange}
            </TableCell>
            <TableCell
              className={cn(
                quote.regularMarketChangePercent > 0
                  ? "text-green-600"
                  : "text-red-600",
              )}>
              {quote.regularMarketChangePercent}
            </TableCell>
            <TableCell>{quote.trailingPE}</TableCell>
            <TableCell>{quote.forwardPE}</TableCell>
            <TableCell>{quote.priceToBook}</TableCell>
            <TableCell>{formatMarketCap(quote.marketCap)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
