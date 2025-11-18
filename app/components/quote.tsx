import type { Quote } from "yahoo-finance2/modules/quote";

export function Quote({ quote }: { quote: Quote }) {
  return (
    <div className='grid grid-cols-5 gap-2 border border-b-0 p-1 px-2 rounded-xs text-xs text-muted-foreground'>
      <p className='font-medium text-blue-500'>{quote?.symbol}</p>
      <p className=''>{quote?.longName}</p>
      <p className=''>{quote?.regularMarketPrice}</p>
      <p className=''>{quote?.regularMarketChange}</p>
      <p className=''>{quote?.regularMarketChangePercent}</p>
    </div>
  );
}
