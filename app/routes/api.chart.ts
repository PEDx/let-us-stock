import YahooFinance from "yahoo-finance2";

type TimeRange = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "5Y";

interface RangeConfig {
  days: number;
  interval: "1m" | "5m" | "15m" | "1h" | "1d" | "1wk";
}

const rangeConfigs: Record<TimeRange, RangeConfig> = {
  "1D": { days: 1, interval: "5m" },
  "5D": { days: 5, interval: "15m" },
  "1M": { days: 30, interval: "1h" },
  "3M": { days: 90, interval: "1d" },
  "6M": { days: 180, interval: "1d" },
  "1Y": { days: 365, interval: "1d" },
  "5Y": { days: 365 * 5, interval: "1wk" },
};

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  const range = (url.searchParams.get("range") || "3M") as TimeRange;

  if (!symbol) {
    return Response.json({ error: "Symbol is required" }, { status: 400 });
  }

  const config = rangeConfigs[range] || rangeConfigs["3M"];

  try {
    const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

    const chartData = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - config.days * 24 * 60 * 60 * 1000),
      interval: config.interval,
    });

    return Response.json({
      chart: chartData.quotes.map((q) => ({
        date: q.date,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      })),
    });
  } catch (error) {
    console.error("Chart error:", error);
    return Response.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
