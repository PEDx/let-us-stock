import YahooFinance from "yahoo-finance2";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const symbolsParam = url.searchParams.get("symbols");

  if (!symbolsParam) {
    return Response.json({ quotes: [] });
  }

  const symbols = symbolsParam.split(",").filter(Boolean);
  
  if (symbols.length === 0) {
    return Response.json({ quotes: [] });
  }

  try {
    const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
    const quotes = await yahooFinance.quote(symbols);
    return Response.json({ quotes });
  } catch (error) {
    console.error("Quote error:", error);
    return Response.json({ quotes: [], error: "Quote fetch failed" });
  }
}
