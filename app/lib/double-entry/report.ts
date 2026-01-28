/**
 * 报表生成
 */

import type {
  LedgerData,
  BookData,
  DateRange,
  TimeGranularity,
  SummaryPoint,
  CategorySummary,
  BalanceSnapshot,
  CurrencyCode,
  AccountType,
  JournalEntryData,
  AccountData,
} from "./types";
import { AccountType as AT, EntryLineType } from "./types";
import { getTypeBalance } from "./ledger";
import { queryEntries } from "./query";
import { convertCurrency } from "./currency";
import { postEntry } from "./entry";

// ============================================================================
// 时间工具
// ============================================================================

/**
 * 获取时间段的开始和结束日期
 */
export function getPeriodRange(
  year: number,
  granularity: TimeGranularity,
  period: number = 1,
): DateRange {
  switch (granularity) {
    case "month": {
      const start = `${year}-${String(period).padStart(2, "0")}-01`;
      const nextMonth = period === 12 ? 1 : period + 1;
      const nextYear = period === 12 ? year + 1 : year;
      const endDate = new Date(nextYear, nextMonth - 1, 0);
      const end = endDate.toISOString().split("T")[0];
      return { start, end };
    }
    case "quarter": {
      const startMonth = (period - 1) * 3 + 1;
      const endMonth = period * 3;
      const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
      const endDate = new Date(year, endMonth, 0);
      const end = endDate.toISOString().split("T")[0];
      return { start, end };
    }
    case "year": {
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    default:
      throw new Error(`Unsupported granularity: ${granularity}`);
  }
}

/**
 * 获取日期对应的时间段标签
 */
export function getPeriodLabel(
  date: string,
  granularity: TimeGranularity,
): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const quarter = Math.ceil(month / 3);

  switch (granularity) {
    case "day":
      return date;
    case "week": {
      // ISO week
      const weekNum = getISOWeek(d);
      return `${year}-W${String(weekNum).padStart(2, "0")}`;
    }
    case "month":
      return `${year}-${String(month).padStart(2, "0")}`;
    case "quarter":
      return `${year}-Q${quarter}`;
    case "year":
      return String(year);
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ============================================================================
// 收支统计
// ============================================================================

/**
 * 计算时间段内的收支汇总
 */
export function calculatePeriodSummary(
  ledger: LedgerData,
  dateRange: DateRange,
): { income: number; expenses: number; netChange: number } {
  const entries = queryEntries(ledger, { dateRange });

  let income = 0;
  let expenses = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = ledger.accounts.find((a) => a.id === line.accountId);
      if (!account) continue;

      if (account.type === AT.INCOME && line.type === EntryLineType.CREDIT) {
        income += line.amount;
      } else if (
        account.type === AT.EXPENSES &&
        line.type === EntryLineType.DEBIT
      ) {
        expenses += line.amount;
      }
    }
  }

  return { income, expenses, netChange: income - expenses };
}

/**
 * 生成时间序列收支报表
 */
export function generateTimeSeries(
  ledger: LedgerData,
  dateRange: DateRange,
  granularity: TimeGranularity,
): SummaryPoint[] {
  const entries = queryEntries(ledger, { dateRange });
  const periodMap = new Map<string, { income: number; expenses: number }>();

  // 按时间段分组统计
  for (const entry of entries) {
    const period = getPeriodLabel(entry.date, granularity);
    const current = periodMap.get(period) ?? { income: 0, expenses: 0 };

    for (const line of entry.lines) {
      const account = ledger.accounts.find((a) => a.id === line.accountId);
      if (!account) continue;

      if (account.type === AT.INCOME && line.type === EntryLineType.CREDIT) {
        current.income += line.amount;
      } else if (
        account.type === AT.EXPENSES &&
        line.type === EntryLineType.DEBIT
      ) {
        current.expenses += line.amount;
      }
    }

    periodMap.set(period, current);
  }

  // 转换为数组并排序
  return Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      income: data.income,
      expenses: data.expenses,
      netChange: data.income - data.expenses,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * 生成分类汇总（支出或收入）
 */
export function generateCategorySummary(
  ledger: LedgerData,
  dateRange: DateRange,
  type: AccountType.EXPENSES | AccountType.INCOME,
): CategorySummary[] {
  const entries = queryEntries(ledger, { dateRange });
  const categoryMap = new Map<string, { name: string; amount: number }>();

  // 按账户分组统计
  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = ledger.accounts.find((a) => a.id === line.accountId);
      if (!account || account.type !== type) continue;

      // 只统计正确方向的行
      const isCorrectDirection =
        (type === AT.EXPENSES && line.type === EntryLineType.DEBIT) ||
        (type === AT.INCOME && line.type === EntryLineType.CREDIT);

      if (!isCorrectDirection) continue;

      const current = categoryMap.get(account.id) ?? {
        name: account.name,
        amount: 0,
      };
      current.amount += line.amount;
      categoryMap.set(account.id, current);
    }
  }

  // 计算总额和占比
  const total = Array.from(categoryMap.values()).reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  return Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      amount: data.amount,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * 生成标签汇总
 */
export function generateTagSummary(
  ledger: LedgerData,
  dateRange: DateRange,
): CategorySummary[] {
  const entries = queryEntries(ledger, { dateRange });
  const tagMap = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.tags || entry.tags.length === 0) continue;

    // 计算这笔分录的金额（取借方总额）
    const amount = entry.lines
      .filter((l) => l.type === EntryLineType.DEBIT)
      .reduce((sum, l) => sum + l.amount, 0);

    for (const tag of entry.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + amount);
    }
  }

  const total = Array.from(tagMap.values()).reduce((sum, a) => sum + a, 0);

  return Array.from(tagMap.entries())
    .map(([tag, amount]) => ({
      id: tag,
      name: tag,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ============================================================================
// 资产负债
// ============================================================================

/**
 * 生成资产负债快照
 */
export function generateBalanceSnapshot(
  ledger: LedgerData,
  date?: string,
): BalanceSnapshot {
  const snapshotDate = date ?? new Date().toISOString().split("T")[0];
  const accounts = getAccountsAsOf(ledger, snapshotDate);

  // 按货币分组的资产
  const assetsByCurrency: Record<CurrencyCode, number> = {} as Record<
    CurrencyCode,
    number
  >;

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of accounts) {
    if (account.type === AT.ASSETS) {
      totalAssets += account.balance;
      assetsByCurrency[account.currency] =
        (assetsByCurrency[account.currency] ?? 0) + account.balance;
    } else if (account.type === AT.LIABILITIES) {
      totalLiabilities += account.balance;
    }
  }

  return {
    date: snapshotDate,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    assetsByCurrency,
  };
}

/**
 * 生成资产负债快照（多币种转换为统一货币）
 */
export function generateBalanceSnapshotInCurrency(
  ledger: LedgerData,
  book: BookData,
  targetCurrency: CurrencyCode,
  date?: string,
): BalanceSnapshot {
  const snapshotDate = date ?? new Date().toISOString().split("T")[0];
  const accounts = getAccountsAsOf(ledger, snapshotDate);

  const assetsByCurrency: Record<CurrencyCode, number> = {} as Record<
    CurrencyCode,
    number
  >;

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of accounts) {
    let amount = account.balance;

    // 货币转换
    if (account.currency !== targetCurrency) {
      const converted = convertCurrency(
        account.balance,
        account.currency,
        targetCurrency,
        book.exchangeRates,
        snapshotDate,
      );
      amount = converted ?? account.balance; // 无法转换则使用原值
    }

    if (account.type === AT.ASSETS) {
      totalAssets += amount;
      assetsByCurrency[account.currency] =
        (assetsByCurrency[account.currency] ?? 0) + account.balance;
    } else if (account.type === AT.LIABILITIES) {
      totalLiabilities += amount;
    }
  }

  return {
    date: snapshotDate,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    assetsByCurrency,
  };
}

/**
 * 生成净资产趋势
 */
export function generateNetWorthTrend(
  ledger: LedgerData,
  dateRange: DateRange,
  granularity: TimeGranularity,
): Array<{ period: string; netWorth: number }> {
  // 获取初始净资产
  let currentNetWorth =
    getTypeBalance(ledger, AT.ASSETS) - getTypeBalance(ledger, AT.LIABILITIES);

  // 获取时间序列数据
  const timeSeries = generateTimeSeries(ledger, dateRange, granularity);

  // 从最近向过去计算
  const result: Array<{ period: string; netWorth: number }> = [];

  for (let i = timeSeries.length - 1; i >= 0; i--) {
    result.unshift({ period: timeSeries[i].period, netWorth: currentNetWorth });
    currentNetWorth -= timeSeries[i].netChange;
  }

  return result;
}

function getAccountsAsOf(
  ledger: LedgerData,
  snapshotDate: string,
): AccountData[] {
  let accounts = ledger.accounts.map((account) => ({ ...account, balance: 0 }));

  const entries = ledger.entries
    .filter((entry) => entry.date <= snapshotDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const entry of entries) {
    accounts = postEntry(entry, accounts);
  }

  return accounts;
}
