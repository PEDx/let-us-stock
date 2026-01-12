import YahooFinance from "yahoo-finance2";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return Response.json({ quotes: [] });
  }

  try {
    const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
    const result = await yahooFinance.search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    // 只返回 Yahoo Finance 的结果
    const quotes = result.quotes
      .filter((q) => q.isYahooFinance)
      .map((q) => ({
        symbol: q.symbol,
        name: "shortname" in q ? q.shortname : q.symbol,
        type: "quoteType" in q ? q.quoteType : "UNKNOWN",
        exchange: "exchange" in q ? q.exchange : "",
      }));

    return Response.json({ quotes });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json({ quotes: [], error: "Search failed" });
  }
}
