/**
 * 账簿管理（多账本容器）
 */

import type {
  BookData,
  LedgerData,
  LedgerType,
  CurrencyCode,
  ExchangeRate,
} from "./types";
import { createLedger } from "./ledger";
import { LedgerType as LT } from "./types";

/**
 * 创建账簿（默认包含一个主账本）
 */
export function createBook(params?: {
  mainLedgerName?: string;
  defaultCurrency?: CurrencyCode;
}): BookData {
  const mainLedger = createLedger({
    name: params?.mainLedgerName ?? "主账本",
    type: LT.MAIN,
    defaultCurrency: params?.defaultCurrency ?? "CNY",
  });

  return {
    ledgers: [mainLedger],
    mainLedgerId: mainLedger.id,
    exchangeRates: [],
    commonTags: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 添加账本
 */
export function addLedger(
  book: BookData,
  params: {
    name: string;
    type?: LedgerType;
    description?: string;
    defaultCurrency?: CurrencyCode;
    icon?: string;
  },
): BookData {
  const ledger = createLedger(params);

  return {
    ...book,
    ledgers: [...book.ledgers, ledger],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新账本
 */
export function updateLedgerInBook(
  book: BookData,
  ledgerId: string,
  updater: (ledger: LedgerData) => LedgerData,
): BookData {
  const ledgers = book.ledgers.map((l) =>
    l.id === ledgerId ? updater(l) : l,
  );

  return {
    ...book,
    ledgers,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 删除账本（不能删除主账本）
 */
export function removeLedger(book: BookData, ledgerId: string): BookData {
  if (ledgerId === book.mainLedgerId) {
    throw new Error("Cannot remove main ledger");
  }

  return {
    ...book,
    ledgers: book.ledgers.filter((l) => l.id !== ledgerId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 获取账本
 */
export function getLedger(
  book: BookData,
  ledgerId: string,
): LedgerData | undefined {
  return book.ledgers.find((l) => l.id === ledgerId);
}

/**
 * 获取主账本
 */
export function getMainLedger(book: BookData): LedgerData {
  const main = book.ledgers.find((l) => l.id === book.mainLedgerId);
  if (!main) {
    throw new Error("Main ledger not found");
  }
  return main;
}

/**
 * 按类型获取账本列表
 */
export function getLedgersByType(
  book: BookData,
  type: LedgerType,
): LedgerData[] {
  return book.ledgers.filter((l) => l.type === type);
}

/**
 * 获取活跃账本（未归档）
 */
export function getActiveLedgers(book: BookData): LedgerData[] {
  return book.ledgers.filter((l) => !l.archived);
}

// ============================================================================
// 汇率管理
// ============================================================================

/**
 * 添加/更新汇率
 */
export function setExchangeRate(
  book: BookData,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
  date?: string,
): BookData {
  const rateDate = date ?? new Date().toISOString().split("T")[0];
  
  // 移除同一天的相同货币对
  const filtered = book.exchangeRates.filter(
    (r) => !(r.from === from && r.to === to && r.date === rateDate),
  );

  const newRate: ExchangeRate = { from, to, rate, date: rateDate };

  return {
    ...book,
    exchangeRates: [...filtered, newRate],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 获取汇率历史
 */
export function getExchangeRateHistory(
  book: BookData,
  from: CurrencyCode,
  to: CurrencyCode,
): ExchangeRate[] {
  return book.exchangeRates
    .filter((r) => r.from === from && r.to === to)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================================================
// 标签管理
// ============================================================================

/**
 * 添加常用标签
 */
export function addCommonTags(book: BookData, tags: string[]): BookData {
  const newTags = [...new Set([...book.commonTags, ...tags])];
  return {
    ...book,
    commonTags: newTags,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 移除常用标签
 */
export function removeCommonTags(book: BookData, tags: string[]): BookData {
  return {
    ...book,
    commonTags: book.commonTags.filter((t) => !tags.includes(t)),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 获取所有账本中使用的标签
 */
export function getAllBookTags(book: BookData): string[] {
  const tags = new Set<string>(book.commonTags);
  
  for (const ledger of book.ledgers) {
    for (const entry of ledger.entries) {
      for (const tag of entry.tags ?? []) {
        tags.add(tag);
      }
    }
  }
  
  return Array.from(tags).sort();
}
