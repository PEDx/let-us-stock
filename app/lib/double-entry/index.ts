/**
 * 复式记账模块
 *
 * 支持：
 * - 多币种资产管理
 * - 标签与时间维度分类
 * - 分录标签分类
 * - 时间维度查询和统计
 * - 收支报表和资产负债表
 *
 * @example
 * ```typescript
 * import {
 *   createBook,
 *   updateBook,
 *   addAccount,
 *   addEntry,
 *   createSimpleEntry,
 *   fromMainUnit,
 *   getNetWorth,
 *   queryEntries,
 *   generateTimeSeries,
 * } from "~/lib/double-entry";
 *
 * // 创建账簿
 * let book = createBook({ name: "我的账本" });
 *
 * // 添加账户
 * const assetsRoot = book.accounts.find(a => a.path === "assets")!;
 * book = addAccount(book, { name: "招商银行", parentId: assetsRoot.id });
 *
 * // 记账
 * const entry = createSimpleEntry({
 *   date: new Date(),
 *   description: "午餐",
 *   debitAccountId: foodAccount.id,
 *   creditAccountId: cashAccount.id,
 *   amount: fromMainUnit(50, "CNY").amount,
 *   tags: ["餐饮", "午餐"],
 * });
 *
 * book = addEntry(book, entry);
 *
 * // 查询本月分录
 * const thisMonthEntries = getThisMonthEntries(book);
 *
 * // 生成月度报表
 * const monthlyReport = generateTimeSeries(book, dateRange, "month");
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  CurrencyCode,
  CurrencyConfig,
  ExchangeRate,
  AccountData,
  EntryLineData,
  JournalEntryData,
  BookData,
  DateRange,
  TimeGranularity,
  EntryQuery,
  SummaryPoint,
  CategorySummary,
  BalanceSnapshot,
} from "./types";

export { AccountType, EntryLineType } from "./types";

// ============================================================================
// Currency
// ============================================================================

export {
  CURRENCIES,
  getCurrency,
  getCurrencyMultiplier,
  createExchangeRate,
  getExchangeRate,
  convertCurrency,
  upsertExchangeRate,
  getAvailableCurrencyPairs,
} from "./currency";

// ============================================================================
// Money
// ============================================================================

export {
  type Money,
  createMoney,
  fromMainUnit,
  toMainUnit,
  formatMoney,
  addMoney,
  subtractMoney,
  negateMoney,
  isZero,
  isEqual,
  zero,
} from "./money";

// ============================================================================
// Account
// ============================================================================

export {
  generateAccountId,
  createAccountPath,
  createAccount,
  findAccount,
  findAccountById,
  findAccountByPath,
  findAccountsByType,
  findChildAccounts,
  findDescendantAccounts,
  updateAccountBalance,
  isDebitIncreaseAccount,
} from "./account";

// ============================================================================
// Entry (Journal Entry)
// ============================================================================

export {
  generateEntryId,
  createEntry,
  updateEntry as updateEntryData,
  addTags,
  removeTags,
  addDebitLine,
  addCreditLine,
  addLine,
  getTotalDebit,
  getTotalCredit,
  isBalanced,
  postEntry,
  unpostEntry,
  createSimpleEntry,
  getEntryAccountIds,
  getEntryTags,
  cloneEntry,
  replaceLine,
  removeLine,
  updateLines,
  getEntryAmount,
  getEntryCategory,
  getEntryCurrency,
} from "./entry";

// ============================================================================
// Book
// ============================================================================

export {
  generateBookId,
  createBook,
  updateBook,
  addAccount,
  updateAccount,
  addEntry,
  removeEntry,
  updateEntry,
  getAccountBalance,
  getAccountTotalBalance,
  getTypeBalance,
  getNetWorth,
  getProfit,
  verifyAccountingEquation,
  getRootAccount,
  getAllTags,
} from "./book";

// ============================================================================
// Query
// ============================================================================

export {
  queryEntries,
  getEntriesByDateRange,
  getEntriesByAccount,
  getEntriesByTag,
  getTodayEntries,
  getThisMonthEntries,
  getThisYearEntries,
  getAccountFullName,
  getAccountWithDescendants,
  getActiveAccounts,
  getAccountTree,
} from "./query";

// ============================================================================
// Report
// ============================================================================

export {
  getPeriodRange,
  getPeriodLabel,
  calculatePeriodSummary,
  generateTimeSeries,
  generateCategorySummary,
  generateTagSummary,
  generateBalanceSnapshot,
  generateBalanceSnapshotInCurrency,
  generateNetWorthTrend,
} from "./report";

// ============================================================================
// Validation
// ============================================================================

export {
  validateEntry,
  validateEntryLine,
  canDeleteAccount,
  canArchiveAccount,
  canMoveAccount,
  validateBook,
  canDeleteEntry,
  type ValidationResult,
} from "./validation";
