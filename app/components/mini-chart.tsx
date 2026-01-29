import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

export interface ChartPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeRange = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "5Y";

const TIME_RANGES: TimeRange[] = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"];

interface MiniChartProps {
  symbol: string;
  initialData?: ChartPoint[];
  strokeWidth?: number;
  upColor?: string;
  downColor?: string;
}

// Hoist static loading spinner
const loadingSpinner = (
  <div className='flex h-24 items-center justify-center'>
    <Loader2 className='text-muted-foreground size-4 animate-spin' />
  </div>
);

// 格式化价格显示
function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(1);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

// 格式化日期显示
function formatDate(dateStr: string, range: TimeRange): string {
  const date = new Date(dateStr);
  if (range === "1D") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "5D") {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  if (range === "1M" || range === "3M") {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  if (range === "6M" || range === "1Y") {
    return date.toLocaleDateString([], { month: "short" });
  }
  // 5Y
  return date.toLocaleDateString([], { year: "2-digit" });
}

// 获取 Y 轴刻度
function getYTicks(min: number, max: number, count: number = 4): number[] {
  const range = max - min;
  const step = range / (count - 1);
  const ticks: number[] = [];
  for (let i = 0; i < count; i++) {
    ticks.push(min + step * i);
  }
  return ticks;
}

// 获取 X 轴刻度索引
function getXTickIndices(dataLength: number, maxTicks: number = 5): number[] {
  if (dataLength <= maxTicks) {
    return Array.from({ length: dataLength }, (_, i) => i);
  }
  const step = (dataLength - 1) / (maxTicks - 1);
  const indices: number[] = [];
  for (let i = 0; i < maxTicks; i++) {
    indices.push(Math.round(step * i));
  }
  return indices;
}

const ChartWithAxis = memo(function ChartWithAxis({
  data,
  range,
  strokeWidth = 1.5,
  upColor = "#22c55e",
  downColor = "#ef4444",
}: {
  data: ChartPoint[];
  range: TimeRange;
  strokeWidth?: number;
  upColor?: string;
  downColor?: string;
}) {
  if (!data || data.length === 0) return null;

  const closes = data.map((d) => d.close).filter((c) => c != null);
  if (closes.length < 2) return null;

  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);
  const priceRange = maxPrice - minPrice || 1;

  // 添加 5% 的上下边距
  const padding = priceRange * 0.05;
  const min = minPrice - padding;
  const max = maxPrice + padding;
  const adjustedRange = max - min;

  // 图表尺寸配置
  const chartWidth = 400;
  const chartHeight = 120;
  const leftMargin = 40; // Y轴标签
  const rightMargin = 8;
  const topMargin = 8;
  const bottomMargin = 20; // X轴标签
  const totalWidth = chartWidth + leftMargin + rightMargin;
  const totalHeight = chartHeight + topMargin + bottomMargin;

  // 生成折线
  const points = useMemo(
    () =>
      closes
        .map((close, i) => {
          const x = leftMargin + (i / (closes.length - 1)) * chartWidth;
          const y =
            topMargin + chartHeight - ((close - min) / adjustedRange) * chartHeight;
          return `${x},${y}`;
        })
        .join(" "),
    [closes, chartWidth, chartHeight, topMargin, min, adjustedRange, leftMargin],
  );

  const isUp = closes[closes.length - 1] >= closes[0];
  const lineColor = isUp ? upColor : downColor;

  // Y轴刻度
  const yTicks = useMemo(() => getYTicks(min, max, 4), [min, max]);

  // X轴刻度
  const xTickIndices = useMemo(() => getXTickIndices(data.length, 5), [data.length]);

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className='w-full'
      style={{ aspectRatio: `${totalWidth} / ${totalHeight}` }}>
      {/* 网格线 */}
      {yTicks.map((tick, i) => {
        const y =
          topMargin +
          chartHeight -
          ((tick - min) / adjustedRange) * chartHeight;
        return (
          <line
            key={`grid-y-${i}`}
            x1={leftMargin}
            y1={y}
            x2={leftMargin + chartWidth}
            y2={y}
            stroke='currentColor'
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        );
      })}

      {/* Y轴标签 */}
      {yTicks.map((tick, i) => {
        const y =
          topMargin +
          chartHeight -
          ((tick - min) / adjustedRange) * chartHeight;
        return (
          <text
            key={`y-label-${i}`}
            x={leftMargin - 4}
            y={y}
            textAnchor='end'
            dominantBaseline='middle'
            className='fill-muted-foreground'
            fontSize={10}>
            {formatPrice(tick)}
          </text>
        );
      })}

      {/* X轴标签 */}
      {xTickIndices.map((idx) => {
        const x = leftMargin + (idx / (closes.length - 1)) * chartWidth;
        return (
          <text
            key={`x-label-${idx}`}
            x={x}
            y={topMargin + chartHeight + 6}
            textAnchor='middle'
            dominantBaseline='hanging'
            className='fill-muted-foreground'
            fontSize={10}>
            {formatDate(data[idx].date, range)}
          </text>
        );
      })}

      {/* 价格曲线 */}
      <polyline
        fill='none'
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
        points={points}
      />
    </svg>
  );
});

export function MiniChart({
  symbol,
  initialData,
  strokeWidth = 1.5,
  upColor = "#22c55e",
  downColor = "#ef4444",
}: MiniChartProps) {
  const [range, setRange] = useState<TimeRange>("3M");
  const [data, setData] = useState<ChartPoint[]>(initialData || []);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChart = useCallback(
    async (timeRange: TimeRange) => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/chart?symbol=${symbol}&range=${timeRange}`,
        );
        const result = await response.json();
        if (result.chart) {
          setData(result.chart);
        }
      } catch (error) {
        console.error("Failed to fetch chart:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [symbol],
  );

  useEffect(() => {
    if (range !== "3M" || !initialData) {
      fetchChart(range);
    } else if (initialData) {
      setData(initialData);
    }
  }, [range, initialData, fetchChart]);

  const handleRangeChange = useCallback((r: TimeRange) => {
    setRange(r);
  }, []);

  return (
    <div className='space-y-1'>
      {/* 时间范围选择 */}
      <div className='flex gap-0.5'>
        {TIME_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => handleRangeChange(r)}
            className={cn(
              "rounded-xs px-1.5 py-0.5 text-xs transition-colors",
              range === r
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}>
            {r}
          </button>
        ))}
      </div>

      {/* 图表 */}
      <div className='relative'>
        {isLoading ? loadingSpinner : (
          <ChartWithAxis
            data={data}
            range={range}
            strokeWidth={strokeWidth}
            upColor={upColor}
            downColor={downColor}
          />
        )}
      </div>
    </div>
  );
}
