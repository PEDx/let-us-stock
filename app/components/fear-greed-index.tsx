import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

async function fetchFearGreendIndex() {
  const url = "https://fear-and-greed-index.p.rapidapi.com/v1/fgi";
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": "a6296db2bamshd608b485c322047p1b0b03jsn5e4c3b5d0c77",
      "X-RapidAPI-Host": "fear-and-greed-index.p.rapidapi.com",
    },
    next: { revalidate: 3600 },
  };
  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error("Failed to fetch fear and greed index");
  }
  return res.json();
}

export default function FearGreedIndex() {
  const [data, setData] = useState(50);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetchFearGreendIndex().then((data) => {
      setData(data.fgi.now.value);
      setLoaded(true);
    });
  }, []);

  const color =
    data > 80
      ? "text-green-500"
      : data > 60
        ? "text-green-400"
        : data > 40
          ? "text-gray-500"
          : data > 20
            ? "text-red-400"
            : "text-red-500";
  const text =
    data > 80
      ? "extremely bullish 🤩"
      : data > 60
        ? "bullish 😊"
        : data > 40
          ? "neutral 😐"
          : data > 20
            ? "bearish 😟"
            : "extremely bearish 😱";

  return (
    <div
      className={cn(
        "text-xs text-muted-foreground rounded-xs border px-1",
        loaded ? "text-inherit" : "animate-pulse text-transparent bg-gray-500/15",
      )}>
      market sentiment:{" "}
      <strong className={cn(loaded ? color : "text-transparent")}>
        {text}
      </strong>
    </div>
  );
}
