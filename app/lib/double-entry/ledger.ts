/**
 * 账本管理
 */

import type {
  LedgerData,
  LedgerType,
  AccountData,
  JournalEntryData,
  CurrencyCode,
  AccountType,
} from "./types";
import { createAccount, findAccountById, generateAccountId } from "./account";
import { postEntry, unpostEntry, isBalanced } from "./entry";
import { AccountType as AT, LedgerType as LT } from "./types";

/**
 * 生成账本 ID
 */
export function generateLedgerId(): string {
  return crypto.randomUUID();
}

/**
 * 创建账本
 */
export function createLedger(params: {
  name: string;
  type?: LedgerType;
  description?: string;
  defaultCurrency?: CurrencyCode;
  icon?: string;
}): LedgerData {
  const now = new Date().toISOString();
  const currency = params.defaultCurrency ?? "CNY";

  // 创建五大类根账户
  const rootAccounts = createRootAccounts(currency, now);

  return {
    id: generateLedgerId(),
    name: params.name,
    type: params.type ?? LT.MAIN,
    description: params.description,
    accounts: rootAccounts,
    entries: [],
    defaultCurrency: currency,
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
 * 更新账本信息
 */
export function updateLedger(
  ledger: LedgerData,
  updates: Partial<
    Pick<LedgerData, "name" | "description" | "icon" | "archived">
  >,
): LedgerData {
  return { ...ledger, ...updates, updatedAt: new Date().toISOString() };
}

/**
 * 添加子账户
 */
export function addAccount(
  ledger: LedgerData,
  params: {
    name: string;
    parentId: string;
    currency?: CurrencyCode;
    icon?: string;
    note?: string;
  },
): LedgerData {
  const parent = findAccountById(ledger.accounts, params.parentId);
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
    ...ledger,
    accounts: [...ledger.accounts, account],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新账户
 */
export function updateAccount(
  ledger: LedgerData,
  accountId: string,
  updates: Partial<Pick<AccountData, "name" | "icon" | "note" | "archived">>,
): LedgerData {
  const accounts = ledger.accounts.map((a) =>
    a.id === accountId
      ? { ...a, ...updates, updatedAt: new Date().toISOString() }
      : a,
  );

  return { ...ledger, accounts, updatedAt: new Date().toISOString() };
}

/**
 * 添加分录并过账
 */
export function addEntry(
  ledger: LedgerData,
  entry: JournalEntryData,
): LedgerData {
  if (!isBalanced(entry)) {
    throw new Error(`Entry "${entry.description}" is not balanced`);
  }

  // 过账更新账户余额
  const updatedAccounts = postEntry(entry, ledger.accounts);

  return {
    ...ledger,
    accounts: updatedAccounts,
    entries: [...ledger.entries, entry],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 删除分录（撤销过账）
 */
export function removeEntry(ledger: LedgerData, entryId: string): LedgerData {
  const entry = ledger.entries.find((e) => e.id === entryId);
  if (!entry) {
    throw new Error(`Entry ${entryId} not found`);
  }

  // 撤销过账
  const updatedAccounts = unpostEntry(entry, ledger.accounts);

  return {
    ...ledger,
    accounts: updatedAccounts,
    entries: ledger.entries.filter((e) => e.id !== entryId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新分录（先撤销再重新过账）
 */
export function updateEntry(
  ledger: LedgerData,
  updatedEntry: JournalEntryData,
): LedgerData {
  const oldEntry = ledger.entries.find((e) => e.id === updatedEntry.id);
  if (!oldEntry) {
    throw new Error(`Entry ${updatedEntry.id} not found`);
  }

  if (!isBalanced(updatedEntry)) {
    throw new Error(`Entry "${updatedEntry.description}" is not balanced`);
  }

  // 先撤销旧分录
  let accounts = unpostEntry(oldEntry, ledger.accounts);
  // 再过账新分录
  accounts = postEntry(updatedEntry, accounts);

  return {
    ...ledger,
    accounts,
    entries: ledger.entries.map((e) =>
      e.id === updatedEntry.id ? updatedEntry : e,
    ),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 获取账户余额
 */
export function getAccountBalance(
  ledger: LedgerData,
  accountId: string,
): number {
  const account = findAccountById(ledger.accounts, accountId);
  return account?.balance ?? 0;
}

/**
 * 获取账户（包括子账户）汇总余额
 */
export function getAccountTotalBalance(
  ledger: LedgerData,
  accountId: string,
): number {
  const account = findAccountById(ledger.accounts, accountId);
  if (!account) return 0;

  // 获取所有子账户
  const descendants = ledger.accounts.filter((a) =>
    a.path.startsWith(account.path + ":"),
  );

  // 汇总余额
  return descendants.reduce((sum, a) => sum + a.balance, account.balance);
}

/**
 * 按类型获取账户汇总余额
 */
export function getTypeBalance(ledger: LedgerData, type: AccountType): number {
  return ledger.accounts
    .filter((a) => a.type === type)
    .reduce((sum, a) => sum + a.balance, 0);
}

/**
 * 计算净资产（资产 - 负债）
 */
export function getNetWorth(ledger: LedgerData): number {
  const assets = getTypeBalance(ledger, AT.ASSETS);
  const liabilities = getTypeBalance(ledger, AT.LIABILITIES);
  return assets - liabilities;
}

/**
 * 计算利润（收入 - 支出）
 */
export function getProfit(ledger: LedgerData): number {
  const income = getTypeBalance(ledger, AT.INCOME);
  const expenses = getTypeBalance(ledger, AT.EXPENSES);
  return income - expenses;
}

/**
 * 验证会计恒等式：资产 + 支出 = 负债 + 权益 + 收入
 */
export function verifyAccountingEquation(ledger: LedgerData): boolean {
  const assets = getTypeBalance(ledger, AT.ASSETS);
  const expenses = getTypeBalance(ledger, AT.EXPENSES);
  const liabilities = getTypeBalance(ledger, AT.LIABILITIES);
  const equity = getTypeBalance(ledger, AT.EQUITY);
  const income = getTypeBalance(ledger, AT.INCOME);

  return assets + expenses === liabilities + equity + income;
}

/**
 * 获取根账户
 */
export function getRootAccount(
  ledger: LedgerData,
  type: AccountType,
): AccountData | undefined {
  return ledger.accounts.find((a) => a.type === type && a.parentId === null);
}

/**
 * 获取所有标签
 */
export function getAllTags(ledger: LedgerData): string[] {
  const tags = new Set<string>();
  for (const entry of ledger.entries) {
    for (const tag of entry.tags ?? []) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}
