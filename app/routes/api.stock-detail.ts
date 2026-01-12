import YahooFinance from "yahoo-finance2";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
    const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

    // 获取股票摘要信息
    const [summary, chartData] = await Promise.all([
      yahooFinance.quoteSummary(symbol, {
        modules: ["price", "summaryDetail", "summaryProfile"],
      }),
      yahooFinance.chart(symbol, {
        period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90天前
        interval: "1d",
      }),
    ]);

    return Response.json({
      summary: {
        symbol: summary.price?.symbol,
        name: summary.price?.longName || summary.price?.shortName,
        currency: summary.price?.currency,
        exchange: summary.price?.exchangeName,
        price: summary.price?.regularMarketPrice,
        change: summary.price?.regularMarketChange,
        changePercent: summary.price?.regularMarketChangePercent,
        previousClose: summary.summaryDetail?.previousClose,
        open: summary.summaryDetail?.open,
        dayHigh: summary.summaryDetail?.dayHigh,
        dayLow: summary.summaryDetail?.dayLow,
        fiftyTwoWeekHigh: summary.summaryDetail?.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: summary.summaryDetail?.fiftyTwoWeekLow,
        volume: summary.summaryDetail?.volume,
        avgVolume: summary.summaryDetail?.averageVolume,
        marketCap: summary.summaryDetail?.marketCap,
        pe: summary.summaryDetail?.trailingPE,
        eps: summary.summaryDetail?.trailingEps,
        dividend: summary.summaryDetail?.dividendYield,
        beta: summary.summaryDetail?.beta,
        sector: summary.summaryProfile?.sector,
        industry: summary.summaryProfile?.industry,
        description: summary.summaryProfile?.longBusinessSummary,
      },
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
    console.error("Stock detail error:", error);
    return Response.json(
      { error: "Failed to fetch stock details" },
      { status: 500 },
    );
  }
}
