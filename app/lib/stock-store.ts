/**
 * 使用 IndexedDB 存储用户的股票列表
 */

const DB_NAME = "let-us-stock";
const DB_VERSION = 1;
const STORE_NAME = "symbols";

// 默认股票列表
const DEFAULT_SYMBOLS = [
  "AAPL",
  "TSLA",
  "GOOG",
  "MSFT",
  "NVDA",
  "META",
  "AMZN",
  "NFLX",
  "QQQ",
  "BTC-USD",
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function getSymbols(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get("user-symbols");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (result && result.symbols && result.symbols.length > 0) {
        resolve(result.symbols);
      } else {
        // 返回默认值并保存
        saveSymbols(DEFAULT_SYMBOLS);
        resolve(DEFAULT_SYMBOLS);
      }
    };
  });
}

export async function saveSymbols(symbols: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id: "user-symbols", symbols });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function addSymbol(symbol: string): Promise<string[]> {
  const symbols = await getSymbols();
  const upperSymbol = symbol.toUpperCase();
  if (!symbols.includes(upperSymbol)) {
    const newSymbols = [upperSymbol, ...symbols];
    await saveSymbols(newSymbols);
    return newSymbols;
  }
  return symbols;
}

export async function removeSymbol(symbol: string): Promise<string[]> {
  const symbols = await getSymbols();
  const newSymbols = symbols.filter((s) => s !== symbol.toUpperCase());
  await saveSymbols(newSymbols);
  return newSymbols;
}

export async function reorderSymbols(newOrder: string[]): Promise<void> {
  await saveSymbols(newOrder);
}
