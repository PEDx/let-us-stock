/**
 * 账户管理
 */

import type { AccountData, CurrencyCode } from "./types";
import { AccountType } from "./types";

/**
 * 生成账户 ID
 */
export function generateAccountId(): string {
  return crypto.randomUUID();
}

/**
 * 创建账户路径
 * @param parentPath 父账户路径
 * @param name 账户名称
 */
export function createAccountPath(
  parentPath: string | null,
  name: string,
): string {
  const safeName = name.toLowerCase().replace(/\s+/g, "-");
  return parentPath ? `${parentPath}:${safeName}` : safeName;
}

/**
 * 创建账户
 */
export function createAccount(params: {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  parentId?: string | null;
  parentPath?: string | null;
}): AccountData {
  const now = new Date().toISOString();
  const path = createAccountPath(params.parentPath ?? null, params.name);

  return {
    id: generateAccountId(),
    name: params.name,
    type: params.type,
    currency: params.currency,
    parentId: params.parentId ?? null,
    path,
    balance: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 创建根账户（五大类）
 */
export function createRootAccounts(currency: CurrencyCode): AccountData[] {
  const now = new Date().toISOString();

  const roots: Array<{ name: string; type: AccountType }> = [
    { name: "资产", type: AccountType.ASSETS },
    { name: "负债", type: AccountType.LIABILITIES },
    { name: "权益", type: AccountType.EQUITY },
    { name: "收入", type: AccountType.INCOME },
    { name: "支出", type: AccountType.EXPENSES },
  ];

  return roots.map((root) => ({
    id: generateAccountId(),
    name: root.name,
    type: root.type,
    currency,
    parentId: null,
    path: root.type,
    balance: 0,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * 查找账户
 */
export function findAccount(
  accounts: AccountData[],
  predicate: (account: AccountData) => boolean,
): AccountData | undefined {
  return accounts.find(predicate);
}

/**
 * 按 ID 查找账户
 */
export function findAccountById(
  accounts: AccountData[],
  id: string,
): AccountData | undefined {
  return accounts.find((a) => a.id === id);
}

/**
 * 按路径查找账户
 */
export function findAccountByPath(
  accounts: AccountData[],
  path: string,
): AccountData | undefined {
  return accounts.find((a) => a.path === path);
}

/**
 * 按类型查找账户
 */
export function findAccountsByType(
  accounts: AccountData[],
  type: AccountType,
): AccountData[] {
  return accounts.filter((a) => a.type === type);
}

/**
 * 查找子账户
 */
export function findChildAccounts(
  accounts: AccountData[],
  parentId: string,
): AccountData[] {
  return accounts.filter((a) => a.parentId === parentId);
}

/**
 * 获取账户的所有后代（包括子账户的子账户）
 */
export function findDescendantAccounts(
  accounts: AccountData[],
  parentId: string,
): AccountData[] {
  const children = findChildAccounts(accounts, parentId);
  const descendants: AccountData[] = [...children];

  for (const child of children) {
    descendants.push(...findDescendantAccounts(accounts, child.id));
  }

  return descendants;
}

/**
 * 更新账户余额
 */
export function updateAccountBalance(
  account: AccountData,
  delta: number,
): AccountData {
  return {
    ...account,
    balance: account.balance + delta,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 判断是否为借方增加账户（资产、支出）
 */
export function isDebitIncreaseAccount(type: AccountType): boolean {
  return type === AccountType.ASSETS || type === AccountType.EXPENSES;
}
