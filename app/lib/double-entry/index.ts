/**
 * 复式记账模块
 *
 * 支持：
 * - 多币种资产管理
 * - 多账本（主账本、日常账本、专题账本）
 * - 分录标签分类
 * - 时间维度查询和统计
 * - 收支报表和资产负债表
 *
 * @example
 * ```typescript
 * import {
 *   createBook,
 *   addLedger,
 *   updateLedgerInBook,
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
 * let book = createBook({ mainLedgerName: "我的账本" });
 *
 * // 在主账本中添加账户
 * const mainLedger = getMainLedger(book);
 * const assetsRoot = mainLedger.accounts.find(a => a.path === "assets")!;
 *
 * book = updateLedgerInBook(book, mainLedger.id, ledger =>
 *   addAccount(ledger, { name: "招商银行", parentId: assetsRoot.id })
 * );
 *
 * // 创建旅游账本
 * book = addLedger(book, {
 *   name: "日本旅游",
 *   type: LedgerType.TOPIC,
 *   description: "2024年日本旅游",
 * });
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
 * book = updateLedgerInBook(book, ledgerId, ledger =>
 *   addEntry(ledger, entry)
 * );
 *
 * // 查询本月分录
 * const thisMonthEntries = getThisMonthEntries(ledger);
 *
 * // 生成月度报表
 * const monthlyReport = generateTimeSeries(ledger, dateRange, "month");
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
  LedgerData,
  BookData,
  DateRange,
  TimeGranularity,
  EntryQuery,
  SummaryPoint,
  CategorySummary,
  BalanceSnapshot,
} from "./types";

export { AccountType, EntryLineType, LedgerType } from "./types";

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
} from "./entry";

// ============================================================================
// Ledger
// ============================================================================

export {
  generateLedgerId,
  createLedger,
  updateLedger,
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
} from "./ledger";

// ============================================================================
// Book (Multi-ledger)
// ============================================================================

export {
  createBook,
  addLedger,
  updateLedgerInBook,
  removeLedger,
  getLedger,
  getMainLedger,
  getLedgersByType,
  getActiveLedgers,
  setExchangeRate,
  getExchangeRateHistory,
  addCommonTags,
  removeCommonTags,
  getAllBookTags,
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
