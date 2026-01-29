/**
 * 数据验证工具
 *
 * 提供分录、账户等数据的验证功能
 */

import type {
  JournalEntryData,
  AccountData,
  BookData,
  EntryLineData,
  EntryLineType,
} from "./types";
import { AccountType } from "./types";
import { verifyAccountingEquation } from "./book";

// ============================================================================
// 验证结果类型
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export type Validator<T> = (data: T) => ValidationResult;

// ============================================================================
// 分录验证
// ============================================================================

/**
 * 验证分录数据
 */
export function validateEntry(entry: JournalEntryData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基本字段验证
  if (!entry.id || entry.id.trim() === "") {
    errors.push("分录 ID 不能为空");
  }

  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.push("日期格式无效，应为 YYYY-MM-DD");
  }

  if (!entry.description || entry.description.trim() === "") {
    errors.push("分录描述不能为空");
  }

  // 分录行验证
  if (!entry.lines || entry.lines.length === 0) {
    errors.push("分录必须包含至少一行");
  } else if (entry.lines.length < 2) {
    errors.push("分录至少需要两行（借方和贷方）");
  } else {
    // 检查是否借贷平衡（多行也需平衡）
    const totalDebit = entry.lines
      .filter((l) => l.type === "debit")
      .reduce((sum, l) => sum + l.amount, 0);
    const totalCredit = entry.lines
      .filter((l) => l.type === "credit")
      .reduce((sum, l) => sum + l.amount, 0);

    if (totalDebit !== totalCredit) {
      errors.push(`借贷不平衡：借方 ${totalDebit} ≠ 贷方 ${totalCredit}`);
    }
  }

  // 检查金额是否为正数
  for (let i = 0; i < entry.lines.length; i++) {
    const line = entry.lines[i];
    if (line.amount <= 0) {
      errors.push(`第 ${i + 1} 行金额必须大于 0（当前：${line.amount}）`);
    }
  }

  // 检查标签
  if (entry.tags && entry.tags.length > 10) {
    warnings.push("标签数量过多（超过 10 个），可能影响性能");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 验证分录行数据
 */
export function validateEntryLine(line: EntryLineData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!line.accountId || line.accountId.trim() === "") {
    errors.push("账户 ID 不能为空");
  }

  if (line.amount <= 0) {
    errors.push("金额必须大于 0");
  }

  if (!["debit", "credit"].includes(line.type)) {
    errors.push("分录行类型必须是 debit 或 credit");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// 账户验证
// ============================================================================

/**
 * 检查账户是否可以删除
 * @returns 可以删除返回 true，否则返回 false 和原因
 */
export function canDeleteAccount(
  book: BookData,
  accountId: string,
): { canDelete: boolean; reason?: string } {
  const account = book.accounts.find((a) => a.id === accountId);
  if (!account) {
    return { canDelete: false, reason: "账户不存在" };
  }

  // 检查是否有子账户
  const hasChildren = book.accounts.some((a) => a.parentId === accountId);
  if (hasChildren) {
    return { canDelete: false, reason: "账户包含子账户，请先删除或移动子账户" };
  }

  // 检查是否在分录中被使用
  const isInUse = book.entries.some((e) =>
    e.lines.some((line) => line.accountId === accountId),
  );

  if (isInUse) {
    return {
      canDelete: false,
      reason: "账户正在使用中，请先删除相关分录或改为归档",
    };
  }

  return { canDelete: true };
}

/**
 * 检查账户是否可以归档
 */
export function canArchiveAccount(
  book: BookData,
  accountId: string,
): { canArchive: boolean; reason?: string } {
  const account = book.accounts.find((a) => a.id === accountId);
  if (!account) {
    return { canArchive: false, reason: "账户不存在" };
  }

  // 已归档的不能再次归档
  if (account.archived) {
    return { canArchive: false, reason: "账户已归档" };
  }

  // 根账户不能归档
  if (account.parentId === null) {
    return { canArchive: false, reason: "根账户不能归档" };
  }

  return { canArchive: true };
}

/**
 * 检查账户是否可以移动（更改父账户）
 */
export function canMoveAccount(
  book: BookData,
  accountId: string,
  newParentId: string,
): { canMove: boolean; reason?: string } {
  const account = book.accounts.find((a) => a.id === accountId);
  if (!account) {
    return { canMove: false, reason: "账户不存在" };
  }

  const newParent = book.accounts.find((a) => a.id === newParentId);
  if (!newParent) {
    return { canMove: false, reason: "目标父账户不存在" };
  }

  // 不能移动到自己或自己的后代
  if (accountId === newParentId) {
    return { canMove: false, reason: "不能移动到自己" };
  }

  // 检查是否是自己的后代
  const isDescendant = book.accounts.some(
    (a) => a.id === newParentId && a.path.startsWith(account.path + ":"),
  );
  if (isDescendant) {
    return { canMove: false, reason: "不能移动到自己的子账户下" };
  }

  // 类型必须匹配
  if (account.type !== newParent.type) {
    return {
      canMove: false,
      reason: `账户类型不匹配（${account.type} → ${newParent.type}）`,
    };
  }

  // 货币必须匹配
  if (account.currency !== newParent.currency) {
    return {
      canMove: false,
      reason: `货币不匹配（${account.currency} → ${newParent.currency}）`,
    };
  }

  return { canMove: true };
}

// ============================================================================
// 账本验证
// ============================================================================

/**
 * 验证账本数据的完整性
 */
export function validateBook(book: BookData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查必须有五大类根账户
  const requiredTypes: AccountType[] = [
    AccountType.ASSETS,
    AccountType.LIABILITIES,
    AccountType.EQUITY,
    AccountType.INCOME,
    AccountType.EXPENSES,
  ];

  const rootAccounts = book.accounts.filter((a) => a.parentId === null);
  const existingTypes = new Set(rootAccounts.map((a) => a.type));

  for (const type of requiredTypes) {
    if (!existingTypes.has(type)) {
      errors.push(`缺少根账户：${type}`);
    }
  }

  // 检查是否有重复的路径
  const paths = new Set<string>();
  for (const account of book.accounts) {
    if (paths.has(account.path)) {
      errors.push(`重复的账户路径：${account.path}`);
    }
    paths.add(account.path);
  }

  // 检查父账户是否存在
  for (const account of book.accounts) {
    if (account.parentId !== null) {
      const parent = book.accounts.find((a) => a.id === account.parentId);
      if (!parent) {
        errors.push(`账户 ${account.name} 的父账户 ${account.parentId} 不存在`);
      }
    }
  }

  // 验证所有分录
  for (const entry of book.entries) {
    const result = validateEntry(entry);
    if (!result.valid) {
      errors.push(
        `分录 "${entry.description}" (ID: ${entry.id}): ${result.errors.join(", ")}`,
      );
    }
    if (result.warnings.length > 0) {
      warnings.push(
        `分录 "${entry.description}" (ID: ${entry.id}): ${result.warnings.join(", ")}`,
      );
    }
  }

  // 验证会计恒等式
  if (!verifyAccountingEquation(book)) {
    errors.push("会计恒等式不成立：资产 + 支出 ≠ 负债 + 权益 + 收入");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 检查分录是否可以删除
 */
export function canDeleteEntry(
  book: BookData,
  entryId: string,
): { canDelete: boolean; reason?: string } {
  const entry = book.entries.find((e) => e.id === entryId);
  if (!entry) {
    return { canDelete: false, reason: "分录不存在" };
  }

  // 检查是否是期初余额分录
  if (entry.description === "期初余额") {
    return {
      canDelete: false,
      reason: "期初余额分录不能删除，请调整账户初始余额",
    };
  }

  return { canDelete: true };
}
