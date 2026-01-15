/**
 * 日记账分录管理
 */

import type {
  JournalEntryData,
  EntryLineData,
  EntryLineType,
  AccountData,
} from "./types";
import { EntryLineType as ELT, AccountType } from "./types";
import { findAccountById, isDebitIncreaseAccount } from "./account";

/**
 * 生成分录 ID
 */
export function generateEntryId(): string {
  return crypto.randomUUID();
}

/**
 * 创建分录
 */
export function createEntry(params: {
  date: Date | string;
  description: string;
  lines?: EntryLineData[];
  tags?: string[];
  payee?: string;
  note?: string;
}): JournalEntryData {
  const now = new Date().toISOString();
  const date =
    typeof params.date === "string"
      ? params.date
      : params.date.toISOString().split("T")[0];

  return {
    id: generateEntryId(),
    date,
    description: params.description,
    lines: params.lines ?? [],
    tags: params.tags,
    payee: params.payee,
    note: params.note,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 更新分录
 */
export function updateEntry(
  entry: JournalEntryData,
  updates: Partial<
    Pick<
      JournalEntryData,
      "date" | "description" | "tags" | "payee" | "note" | "lines"
    >
  >,
): JournalEntryData {
  return {
    ...entry,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 添加标签
 */
export function addTags(
  entry: JournalEntryData,
  tags: string[],
): JournalEntryData {
  const existingTags = entry.tags ?? [];
  const newTags = [...new Set([...existingTags, ...tags])];
  return updateEntry(entry, { tags: newTags });
}

/**
 * 移除标签
 */
export function removeTags(
  entry: JournalEntryData,
  tags: string[],
): JournalEntryData {
  const existingTags = entry.tags ?? [];
  const newTags = existingTags.filter((t) => !tags.includes(t));
  return updateEntry(entry, { tags: newTags.length > 0 ? newTags : undefined });
}

/**
 * 添加借方行
 */
export function addDebitLine(
  entry: JournalEntryData,
  accountId: string,
  amount: number,
  note?: string,
): JournalEntryData {
  return addLine(entry, accountId, amount, ELT.DEBIT, note);
}

/**
 * 添加贷方行
 */
export function addCreditLine(
  entry: JournalEntryData,
  accountId: string,
  amount: number,
  note?: string,
): JournalEntryData {
  return addLine(entry, accountId, amount, ELT.CREDIT, note);
}

/**
 * 添加分录行
 */
export function addLine(
  entry: JournalEntryData,
  accountId: string,
  amount: number,
  type: EntryLineType,
  note?: string,
): JournalEntryData {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const line: EntryLineData = { accountId, amount, type };
  if (note) line.note = note;

  return {
    ...entry,
    lines: [...entry.lines, line],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 计算借方总额
 */
export function getTotalDebit(entry: JournalEntryData): number {
  return entry.lines
    .filter((line) => line.type === ELT.DEBIT)
    .reduce((sum, line) => sum + line.amount, 0);
}

/**
 * 计算贷方总额
 */
export function getTotalCredit(entry: JournalEntryData): number {
  return entry.lines
    .filter((line) => line.type === ELT.CREDIT)
    .reduce((sum, line) => sum + line.amount, 0);
}

/**
 * 验证借贷是否平衡
 */
export function isBalanced(entry: JournalEntryData): boolean {
  return getTotalDebit(entry) === getTotalCredit(entry);
}

/**
 * 过账：将分录应用到账户上
 * @returns 更新后的账户数组
 */
export function postEntry(
  entry: JournalEntryData,
  accounts: AccountData[],
): AccountData[] {
  if (!isBalanced(entry)) {
    throw new Error(
      `Entry "${entry.description}" (ID: ${entry.id}) is not balanced`,
    );
  }

  // 创建账户映射
  const accountMap = new Map(accounts.map((a) => [a.id, { ...a }]));

  for (const line of entry.lines) {
    const account = accountMap.get(line.accountId);
    if (!account) {
      throw new Error(`Account ${line.accountId} not found`);
    }

    // 根据账户类型和借贷方向计算余额变化
    const isDebitIncrease = isDebitIncreaseAccount(account.type);
    const delta =
      line.type === ELT.DEBIT
        ? isDebitIncrease
          ? line.amount
          : -line.amount
        : isDebitIncrease
          ? -line.amount
          : line.amount;

    account.balance += delta;
    account.updatedAt = new Date().toISOString();
  }

  return Array.from(accountMap.values());
}

/**
 * 撤销过账：从账户上撤销分录的影响
 * @returns 更新后的账户数组
 */
export function unpostEntry(
  entry: JournalEntryData,
  accounts: AccountData[],
): AccountData[] {
  // 创建账户映射
  const accountMap = new Map(accounts.map((a) => [a.id, { ...a }]));

  for (const line of entry.lines) {
    const account = accountMap.get(line.accountId);
    if (!account) continue;

    // 反向操作
    const isDebitIncrease = isDebitIncreaseAccount(account.type);
    const delta =
      line.type === ELT.DEBIT
        ? isDebitIncrease
          ? -line.amount
          : line.amount
        : isDebitIncrease
          ? line.amount
          : -line.amount;

    account.balance += delta;
    account.updatedAt = new Date().toISOString();
  }

  return Array.from(accountMap.values());
}

/**
 * 创建简单分录（一借一贷）
 */
export function createSimpleEntry(params: {
  date: Date | string;
  description: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  tags?: string[];
  payee?: string;
  note?: string;
}): JournalEntryData {
  let entry = createEntry({
    date: params.date,
    description: params.description,
    tags: params.tags,
    payee: params.payee,
    note: params.note,
  });
  entry = addDebitLine(entry, params.debitAccountId, params.amount);
  entry = addCreditLine(entry, params.creditAccountId, params.amount);
  return entry;
}

/**
 * 获取分录涉及的所有账户 ID
 */
export function getEntryAccountIds(entry: JournalEntryData): string[] {
  return [...new Set(entry.lines.map((line) => line.accountId))];
}

/**
 * 获取分录的所有标签
 */
export function getEntryTags(entry: JournalEntryData): string[] {
  return entry.tags ?? [];
}
