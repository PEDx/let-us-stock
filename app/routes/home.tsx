import { useLoaderData } from "react-router";
import YahooFinance from "yahoo-finance2";
import { QuoteTable } from "~/components/quote-table";

export function meta() {
  return [
    { title: "Let Us Stock" },
    { name: "description", content: "Let Us Stock" },
  ];
}

export async function loader() {
  const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  return {
    quotes: await yahooFinance.quote([
      "AAPL",
      "TSLA",
      "GOOG",
      "MSFT",
      "NVDA",
      "META",
      "AMZN",
      "NFLX",
      "GOOGL",
      "INTC",
      "CSCO",
      "IBM",
      "ORCL",
      "SAP",
      "QQQ",
      "BTC-USD",
      "SGOV",
      "BOXX",
    ]),
  };
}

export default function Home() {
  const { quotes } = useLoaderData<typeof loader>();

  return (
    <main className='page-area my-2'>
      <QuoteTable quotes={quotes} />
    </main>
  );
}
