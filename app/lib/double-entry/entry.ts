/**
 * 日记账分录管理
 */

import type {
  JournalEntryData,
  EntryLineData,
  AccountData,
  CurrencyCode,
} from "./types";
import { EntryLineType, EntryLineType as ELT, AccountType } from "./types";
import { isDebitIncreaseAccount } from "./account";

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
  return { ...entry, ...updates, updatedAt: new Date().toISOString() };
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

// ============================================================================
// 分录编辑功能
// ============================================================================

/**
 * 克隆分录（用于编辑时保留原始数据）
 */
export function cloneEntry(entry: JournalEntryData): JournalEntryData {
  return JSON.parse(JSON.stringify(entry));
}

/**
 * 替换分录中的一行
 */
export function replaceLine(
  entry: JournalEntryData,
  lineIndex: number,
  newLine: EntryLineData,
): JournalEntryData {
  if (lineIndex < 0 || lineIndex >= entry.lines.length) {
    throw new Error(`Line index ${lineIndex} out of bounds`);
  }

  const newLines = [...entry.lines];
  newLines[lineIndex] = newLine;

  return {
    ...entry,
    lines: newLines,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 删除分录中的一行
 */
export function removeLine(
  entry: JournalEntryData,
  lineIndex: number,
): JournalEntryData {
  if (entry.lines.length <= 2) {
    throw new Error("Cannot remove line: entry must have at least 2 lines");
  }

  return {
    ...entry,
    lines: entry.lines.filter((_, i) => i !== lineIndex),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 批量修改分录行
 */
export function updateLines(
  entry: JournalEntryData,
  updates: Array<{
    lineIndex: number;
    amount?: number;
    accountId?: string;
  }>,
): JournalEntryData {
  let newEntry = cloneEntry(entry);

  for (const update of updates) {
    const line = newEntry.lines[update.lineIndex];
    if (!line) {
      throw new Error(`Line index ${update.lineIndex} not found`);
    }

    const newLine: EntryLineData = { ...line };
    if (update.amount !== undefined) {
      if (update.amount <= 0) {
        throw new Error(`Amount must be greater than 0, got ${update.amount}`);
      }
      newLine.amount = update.amount;
    }
    if (update.accountId !== undefined) {
      newLine.accountId = update.accountId;
    }

    newEntry = replaceLine(newEntry, update.lineIndex, newLine);
  }

  return newEntry;
}

/**
 * 获取分录总额（用于显示）
 */
export function getEntryAmount(entry: JournalEntryData): number {
  // 借方总额应该等于贷方总额，取其中之一
  return getTotalDebit(entry);
}

/**
 * 判断分录类型（支出、收入、转账）
 */
export function getEntryCategory(
  entry: JournalEntryData,
  accounts: Map<string, AccountData>,
): "expense" | "income" | "transfer" | "unknown" {
  const debitAccounts = new Set(
    entry.lines
      .filter((l) => l.type === EntryLineType.DEBIT)
      .map((l) => l.accountId)
  );
  const creditAccounts = new Set(
    entry.lines
      .filter((l) => l.type === EntryLineType.CREDIT)
      .map((l) => l.accountId)
  );

  // 检查是否有支出账户
  for (const accountId of debitAccounts) {
    const account = accounts.get(accountId);
    if (account?.type === AccountType.EXPENSES) {
      return "expense";
    }
  }

  // 检查是否有收入账户
  for (const accountId of creditAccounts) {
    const account = accounts.get(accountId);
    if (account?.type === AccountType.INCOME) {
      return "income";
    }
  }

  // 检查是否是转账
  const hasAsset =
    [...debitAccounts, ...creditAccounts].some(
      (id) => accounts.get(id)?.type === AccountType.ASSETS
    );
  const hasLiability =
    [...debitAccounts, ...creditAccounts].some(
      (id) => accounts.get(id)?.type === AccountType.LIABILITIES
    );

  if (hasAsset || hasLiability) {
    return "transfer";
  }

  return "unknown";
}

/**
 * 获取分录的主要货币（第一个涉及的账户的货币）
 */
export function getEntryCurrency(
  entry: JournalEntryData,
  accounts: Map<string, AccountData>,
): CurrencyCode {
  if (entry.lines.length === 0) {
    return "CNY";
  }

  const account = accounts.get(entry.lines[0].accountId);
  return account?.currency ?? "CNY";
}
