/**
 * 账簿管理（顶层）
 */

import type {
  BookData,
  AccountData,
  JournalEntryData,
  CurrencyCode,
  AccountType,
} from "./types";
import { createAccount, findAccountById, generateAccountId } from "./account";
import { postEntry, unpostEntry, isBalanced } from "./entry";
import { AccountType as AT } from "./types";

/**
 * 生成账簿 ID
 */
export function generateBookId(): string {
  return crypto.randomUUID();
}

/**
 * 创建账簿
 */
export function createBook(params: {
  name: string;
  description?: string;
  defaultCurrency?: CurrencyCode;
  icon?: string;
}): BookData {
  const now = new Date().toISOString();
  const currency = params.defaultCurrency ?? "CNY";

  // 创建五大类根账户
  const rootAccounts = createRootAccounts(currency, now);

  return {
    id: generateBookId(),
    name: params.name,
    description: params.description,
    accounts: rootAccounts,
    entries: [],
    defaultCurrency: currency,
    exchangeRates: [],
    commonTags: [],
    icon: params.icon,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 创建根账户
 */
function createRootAccounts(
  currency: CurrencyCode,
  timestamp: string,
): AccountData[] {
  const roots: Array<{ name: string; type: AccountType; path: string }> = [
    { name: "资产", type: AT.ASSETS, path: "assets" },
    { name: "负债", type: AT.LIABILITIES, path: "liabilities" },
    { name: "权益", type: AT.EQUITY, path: "equity" },
    { name: "收入", type: AT.INCOME, path: "income" },
    { name: "支出", type: AT.EXPENSES, path: "expenses" },
  ];

  return roots.map((root) => ({
    id: generateAccountId(),
    name: root.name,
    type: root.type,
    currency,
    parentId: null,
    path: root.path,
    balance: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

/**
 * 更新账簿信息
 */
export function updateBook(
  book: BookData,
  updates: Partial<Pick<BookData, "name" | "description" | "icon" | "archived">>,
): BookData {
  return { ...book, ...updates, updatedAt: new Date().toISOString() };
}

/**
 * 添加子账户
 */
export function addAccount(
  book: BookData,
  params: {
    name: string;
    parentId: string;
    currency?: CurrencyCode;
    icon?: string;
    note?: string;
  },
): BookData {
  const parent = findAccountById(book.accounts, params.parentId);
  if (!parent) {
    throw new Error(`Parent account ${params.parentId} not found`);
  }

  const account = createAccount({
    name: params.name,
    type: parent.type,
    currency: params.currency ?? parent.currency,
    parentId: params.parentId,
    parentPath: parent.path,
  });

  // 添加可选字段
  if (params.icon) account.icon = params.icon;
  if (params.note) account.note = params.note;

  return {
    ...book,
    accounts: [...book.accounts, account],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新账户
 */
export function updateAccount(
  book: BookData,
  accountId: string,
  updates: Partial<Pick<AccountData, "name" | "icon" | "note" | "archived">>,
): BookData {
  const accounts = book.accounts.map((a) =>
    a.id === accountId
      ? { ...a, ...updates, updatedAt: new Date().toISOString() }
      : a,
  );

  return { ...book, accounts, updatedAt: new Date().toISOString() };
}

/**
 * 添加分录并过账
 */
export function addEntry(book: BookData, entry: JournalEntryData): BookData {
  if (!isBalanced(entry)) {
    throw new Error(`Entry "${entry.description}" is not balanced`);
  }

  // 过账更新账户余额
  const updatedAccounts = postEntry(entry, book.accounts);

  return {
    ...book,
    accounts: updatedAccounts,
    entries: [...book.entries, entry],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 删除分录（撤销过账）
 */
export function removeEntry(book: BookData, entryId: string): BookData {
  const entry = book.entries.find((e) => e.id === entryId);
  if (!entry) {
    throw new Error(`Entry ${entryId} not found`);
  }

  // 撤销过账
  const updatedAccounts = unpostEntry(entry, book.accounts);

  return {
    ...book,
    accounts: updatedAccounts,
    entries: book.entries.filter((e) => e.id !== entryId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新分录（先撤销再重新过账）
 */
export function updateEntry(
  book: BookData,
  updatedEntry: JournalEntryData,
): BookData {
  const oldEntry = book.entries.find((e) => e.id === updatedEntry.id);
  if (!oldEntry) {
    throw new Error(`Entry ${updatedEntry.id} not found`);
  }

  if (!isBalanced(updatedEntry)) {
    throw new Error(`Entry "${updatedEntry.description}" is not balanced`);
  }

  // 先撤销旧分录
  let accounts = unpostEntry(oldEntry, book.accounts);
  // 再过账新分录
  accounts = postEntry(updatedEntry, accounts);

  return {
    ...book,
    accounts,
    entries: book.entries.map((e) =>
      e.id === updatedEntry.id ? updatedEntry : e,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 获取账户余额
 */
export function getAccountBalance(book: BookData, accountId: string): number {
  const account = findAccountById(book.accounts, accountId);
  return account?.balance ?? 0;
}

/**
 * 获取账户（包括子账户）汇总余额
 */
export function getAccountTotalBalance(
  book: BookData,
  accountId: string,
): number {
  const account = findAccountById(book.accounts, accountId);
  if (!account) return 0;

  // 获取所有子账户
  const descendants = book.accounts.filter((a) =>
    a.path.startsWith(account.path + ":"),
  );

  // 汇总余额
  return descendants.reduce((sum, a) => sum + a.balance, account.balance);
}

/**
 * 按类型获取账户汇总余额
 */
export function getTypeBalance(book: BookData, type: AccountType): number {
  return book.accounts
    .filter((a) => a.type === type)
    .reduce((sum, a) => sum + a.balance, 0);
}

/**
 * 计算净资产（资产 - 负债）
 */
export function getNetWorth(book: BookData): number {
  const assets = getTypeBalance(book, AT.ASSETS);
  const liabilities = getTypeBalance(book, AT.LIABILITIES);
  return assets - liabilities;
}

/**
 * 计算利润（收入 - 支出）
 */
export function getProfit(book: BookData): number {
  const income = getTypeBalance(book, AT.INCOME);
  const expenses = getTypeBalance(book, AT.EXPENSES);
  return income - expenses;
}

/**
 * 验证会计恒等式：资产 + 支出 = 负债 + 权益 + 收入
 */
export function verifyAccountingEquation(book: BookData): boolean {
  const assets = getTypeBalance(book, AT.ASSETS);
  const expenses = getTypeBalance(book, AT.EXPENSES);
  const liabilities = getTypeBalance(book, AT.LIABILITIES);
  const equity = getTypeBalance(book, AT.EQUITY);
  const income = getTypeBalance(book, AT.INCOME);

  return assets + expenses === liabilities + equity + income;
}

/**
 * 获取根账户
 */
export function getRootAccount(
  book: BookData,
  type: AccountType,
): AccountData | undefined {
  return book.accounts.find((a) => a.type === type && a.parentId === null);
}

/**
 * 获取所有标签
 */
export function getAllTags(book: BookData): string[] {
  const tags = new Set<string>();
  for (const entry of book.entries) {
    for (const tag of entry.tags ?? []) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}
