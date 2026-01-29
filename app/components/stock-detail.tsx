import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import {
  cn,
  formatNumber,
  formatLargeNumber,
  formatLargeNumberZh,
} from "~/lib/utils";
import { FloatingWindow } from "./floating-window";
import { MiniChart, type ChartPoint } from "./mini-chart";

interface StockSummary {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  pe: number;
  eps: number;
  dividend: number;
  beta: number;
  sector: string;
  industry: string;
  description: string;
}

interface StockDetailProps {
  symbol: string;
  onClose: () => void;
  position: { x: number; y: number };
}

// Hoist static loading spinner
const loadingSpinner = (
  <div className='flex h-full min-h-100 items-center justify-center'>
    <Loader2 className='text-muted-foreground size-6 animate-spin' />
  </div>
);

// Memoized data row component
const DataRow = memo(function DataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className='flex justify-between'>
      <span className='text-muted-foreground'>{label}</span>
      <span>{value}</span>
    </div>
  );
});

// Memoized price header component
const PriceHeader = memo(function PriceHeader({
  price,
  change,
  changePercent,
  exchange,
  currency,
  isUp,
  formatFn,
}: {
  price: number;
  change: number;
  changePercent: number;
  exchange: string;
  currency: string;
  isUp: boolean;
  formatFn: (n: number, decimals?: number) => string;
}) {
  return (
    <div className='flex items-center justify-between'>
      <div>
        <div className='flex items-center gap-2'>
          <span className='text-xl font-bold'>
            ${formatFn(price)}
          </span>
          <span
            className={cn(
              "flex items-center gap-0.5 text-sm",
              isUp ? "text-green-500" : "text-red-500",
            )}>
            {isUp ? (
              <TrendingUp className='size-3' />
            ) : (
              <TrendingDown className='size-3' />
            )}
            {formatFn(change)} ({formatFn(changePercent)}%)
          </span>
        </div>
        <div className='text-muted-foreground'>
          {exchange} · {currency}
        </div>
      </div>
    </div>
  );
});

export const StockDetail = memo(function StockDetail({
  symbol,
  onClose,
  position,
}: StockDetailProps) {
  const { t, language } = useI18n();
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stock-detail?symbol=${symbol}`);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSummary(data.summary);
        setChart(data.chart);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isUp = summary && summary.change >= 0;

  const formatLargeNumberFn = useMemo(
    () => (language === "zh" ? formatLargeNumberZh : formatLargeNumber),
    [language],
  );

  const windowTitle = useMemo(
    () => `${symbol} - ${summary?.name || t.stockDetail.loading}`,
    [symbol, summary?.name, t.stockDetail.loading],
  );

  if (!summary && !isLoading) {
    return null;
  }

  return (
    <FloatingWindow
      id={`stock-${symbol}`}
      title={windowTitle}
      onClose={onClose}
      onRefresh={fetchData}
      isLoading={isLoading}
      defaultPosition={position}
      defaultSize={{ width: 400, height: 520 }}
      minWidth={300}
      minHeight={250}>
      {isLoading && !summary ? loadingSpinner : error ? (
        <div className='flex h-full items-center justify-center text-red-500'>
          {error}
        </div>
      ) : summary ? (
        <div className='space-y-3'>
          {/* 价格头部 */}
          <PriceHeader
            price={summary.price}
            change={summary.change}
            changePercent={summary.changePercent}
            exchange={summary.exchange}
            currency={summary.currency}
            isUp={isUp ?? false}
            formatFn={formatNumber}
          />

          {/* 迷你图 */}
          <div className='rounded border p-2'>
            <MiniChart symbol={symbol} initialData={chart} />
          </div>

          {/* 关键数据 */}
          <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
            <DataRow label={t.stockDetail.open} value={formatNumber(summary.open)} />
            <DataRow label={t.stockDetail.prevClose} value={formatNumber(summary.previousClose)} />
            <DataRow
              label={t.stockDetail.dayRange}
              value={`${formatNumber(summary.dayLow)} - ${formatNumber(summary.dayHigh)}`}
            />
            <DataRow
              label={t.stockDetail.weekRange52}
              value={`${formatNumber(summary.fiftyTwoWeekLow)} - ${formatNumber(summary.fiftyTwoWeekHigh)}`}
            />
            <DataRow label={t.stockDetail.volume} value={formatLargeNumberFn(summary.volume)} />
            <DataRow label={t.stockDetail.avgVolume} value={formatLargeNumberFn(summary.avgVolume)} />
            <DataRow label={t.stockDetail.marketCap} value={formatLargeNumberFn(summary.marketCap)} />
            <DataRow label={t.stockDetail.pe} value={formatNumber(summary.pe)} />
            <DataRow label={t.stockDetail.eps} value={formatNumber(summary.eps)} />
            <DataRow label={t.stockDetail.beta} value={formatNumber(summary.beta)} />
          </div>

          {/* 行业信息 */}
          {(summary.sector || summary.industry) && (
            <div className='border-t pt-2'>
              <div className='text-muted-foreground'>
                {summary.sector}
                {summary.sector && summary.industry && " · "}
                {summary.industry}
              </div>
            </div>
          )}

          {/* 公司简介 */}
          {summary.description && (
            <div className='border-t pt-2'>
              <div className='text-muted-foreground mb-1'>
                {t.stockDetail.about}
              </div>
              <p className='text-muted-foreground/80 line-clamp-3'>
                {summary.description}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </FloatingWindow>
  );
});
