/**
 * 查询工具
 */

import type {
  LedgerData,
  JournalEntryData,
  AccountData,
  EntryQuery,
  DateRange,
  AccountType,
} from "./types";

/**
 * 按条件查询分录
 */
export function queryEntries(
  ledger: LedgerData,
  query: EntryQuery,
): JournalEntryData[] {
  let entries = [...ledger.entries];

  // 日期范围筛选
  if (query.dateRange) {
    entries = entries.filter(
      (e) => e.date >= query.dateRange!.start && e.date <= query.dateRange!.end,
    );
  }

  // 账户筛选
  if (query.accountIds && query.accountIds.length > 0) {
    entries = entries.filter((e) =>
      e.lines.some((line) => query.accountIds!.includes(line.accountId)),
    );
  }

  // 标签筛选
  if (query.tags && query.tags.length > 0) {
    entries = entries.filter((e) =>
      query.tags!.some((tag) => e.tags?.includes(tag)),
    );
  }

  // 收款人筛选
  if (query.payee) {
    const payeeLower = query.payee.toLowerCase();
    entries = entries.filter((e) =>
      e.payee?.toLowerCase().includes(payeeLower),
    );
  }

  // 金额范围筛选
  if (query.amountRange) {
    entries = entries.filter((e) => {
      const totalAmount = e.lines.reduce(
        (sum, line) => sum + line.amount,
        0,
      ) / 2; // 借贷各计一次，除以2
      if (query.amountRange!.min !== undefined && totalAmount < query.amountRange!.min) {
        return false;
      }
      if (query.amountRange!.max !== undefined && totalAmount > query.amountRange!.max) {
        return false;
      }
      return true;
    });
  }

  // 关键词搜索
  if (query.keyword) {
    const keywordLower = query.keyword.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.description.toLowerCase().includes(keywordLower) ||
        e.note?.toLowerCase().includes(keywordLower) ||
        e.payee?.toLowerCase().includes(keywordLower),
    );
  }

  // 按日期排序（降序）
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 获取日期范围内的分录
 */
export function getEntriesByDateRange(
  ledger: LedgerData,
  dateRange: DateRange,
): JournalEntryData[] {
  return queryEntries(ledger, { dateRange });
}

/**
 * 获取某账户相关的分录
 */
export function getEntriesByAccount(
  ledger: LedgerData,
  accountId: string,
  dateRange?: DateRange,
): JournalEntryData[] {
  return queryEntries(ledger, { accountIds: [accountId], dateRange });
}

/**
 * 获取某标签的分录
 */
export function getEntriesByTag(
  ledger: LedgerData,
  tag: string,
  dateRange?: DateRange,
): JournalEntryData[] {
  return queryEntries(ledger, { tags: [tag], dateRange });
}

/**
 * 获取今日分录
 */
export function getTodayEntries(ledger: LedgerData): JournalEntryData[] {
  const today = new Date().toISOString().split("T")[0];
  return queryEntries(ledger, { dateRange: { start: today, end: today } });
}

/**
 * 获取本月分录
 */
export function getThisMonthEntries(ledger: LedgerData): JournalEntryData[] {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = now.toISOString().split("T")[0];
  return queryEntries(ledger, { dateRange: { start, end } });
}

/**
 * 获取本年分录
 */
export function getThisYearEntries(ledger: LedgerData): JournalEntryData[] {
  const now = new Date();
  const start = `${now.getFullYear()}-01-01`;
  const end = now.toISOString().split("T")[0];
  return queryEntries(ledger, { dateRange: { start, end } });
}

// ============================================================================
// 账户查询
// ============================================================================

/**
 * 获取账户的完整层级路径名称
 */
export function getAccountFullName(
  ledger: LedgerData,
  accountId: string,
): string {
  const account = ledger.accounts.find((a) => a.id === accountId);
  if (!account) return "";

  const names: string[] = [];
  let current: AccountData | undefined = account;

  while (current) {
    names.unshift(current.name);
    current = current.parentId
      ? ledger.accounts.find((a) => a.id === current!.parentId)
      : undefined;
  }

  return names.join(" > ");
}

/**
 * 获取账户及其所有子账户
 */
export function getAccountWithDescendants(
  ledger: LedgerData,
  accountId: string,
): AccountData[] {
  const account = ledger.accounts.find((a) => a.id === accountId);
  if (!account) return [];

  return ledger.accounts.filter(
    (a) => a.id === accountId || a.path.startsWith(account.path + ":"),
  );
}

/**
 * 获取活跃账户（未归档且有余额或近期有交易）
 */
export function getActiveAccounts(
  ledger: LedgerData,
  days: number = 90,
): AccountData[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split("T")[0];

  // 近期有交易的账户
  const recentAccountIds = new Set<string>();
  for (const entry of ledger.entries) {
    if (entry.date >= cutoff) {
      for (const line of entry.lines) {
        recentAccountIds.add(line.accountId);
      }
    }
  }

  return ledger.accounts.filter(
    (a) => !a.archived && (a.balance !== 0 || recentAccountIds.has(a.id)),
  );
}

/**
 * 按类型获取账户树
 */
export function getAccountTree(
  ledger: LedgerData,
  type: AccountType,
): (AccountData & { children: AccountData[] })[] {
  const accounts = ledger.accounts.filter((a) => a.type === type);
  const rootAccounts = accounts.filter((a) => a.parentId === null);

  function buildTree(
    parent: AccountData,
  ): AccountData & { children: AccountData[] } {
    const children = accounts
      .filter((a) => a.parentId === parent.id)
      .map(buildTree);
    return { ...parent, children };
  }

  return rootAccounts.map(buildTree);
}
