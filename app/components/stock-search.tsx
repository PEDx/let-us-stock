;

import { useState, useEffect, useRef } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import { cn } from "~/lib/utils";

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

interface StockSearchProps {
  existingSymbols: string[];
  onAddSymbol: (symbol: string) => void;
}

export function StockSearch({
  existingSymbols,
  onAddSymbol,
}: StockSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
        );
        const data = await response.json();
        setResults(data.quotes || []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAdd = (symbol: string) => {
    onAddSymbol(symbol);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  const isAlreadyAdded = (symbol: string) =>
    existingSymbols.includes(symbol.toUpperCase());

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1 rounded-xs border px-1 text-xs text-muted-foreground">
        <Search className="size-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.stockSearch.placeholder}
          className="w-full bg-transparent py-0.5 outline-none placeholder:text-muted-foreground/60"
        />
        {isLoading && <Loader2 className="size-3 animate-spin" />}
        {!isLoading && query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="hover:text-foreground">
            <X className="size-3" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 w-full rounded-xs border bg-popover text-xs shadow-md">
          <ul className="max-h-48 overflow-auto">
            {results.map((result) => {
              const added = isAlreadyAdded(result.symbol);
              return (
                <li
                  key={result.symbol}
                  className={cn(
                    "flex items-center justify-between gap-2 border-b border-border/50 px-1.5 py-1 last:border-b-0",
                    added ? "bg-muted/30" : "hover:bg-muted/50",
                  )}>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-blue-600">
                      {result.symbol}
                    </span>
                    <span className="ml-1 text-muted-foreground/70">
                      {result.type}
                    </span>
                    <p className="truncate text-muted-foreground/60">
                      {result.name}
                    </p>
                  </div>
                  {added ? (
                    <span className="text-muted-foreground/50">✓</span>
                  ) : (
                    <button
                      onClick={() => handleAdd(result.symbol)}
                      className="flex items-center rounded-xs border px-1 text-muted-foreground hover:border-blue-500 hover:text-blue-600">
                      <Plus className="size-3" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isOpen && query && !isLoading && results.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 rounded-xs border bg-popover px-2 py-1 text-xs text-muted-foreground shadow-md">
          {t.stockSearch.noResults}
        </div>
      )}
    </div>
  );
}
