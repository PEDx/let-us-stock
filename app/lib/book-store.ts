/**
 * 账簿业务层
 *
 * 提供账簿的增删改查操作，底层使用 storage 进行持久化
 *
 * @example
 * ```typescript
 * import { getBook, addAccountToBook, addEntryToBook } from "~/lib/book-store";
 *
 * // 获取或初始化账簿
 * const book = await getBook();
 *
 * // 添加账户
 * await addAccountToBook({
 *   name: "招商银行",
 *   parentId: assetsRootId,
 * });
 *
 * // 记账
 * await addEntryToBook(ledgerId, entry);
 * ```
 */

import { storage } from "./storage";
import type { BookData, LedgerData, JournalEntryData, LedgerType, CurrencyCode } from "./double-entry/types";
import {
  createBook,
  addLedger as addLedgerToBook,
  updateLedgerInBook,
  removeLedger as removeLedgerFromBook,
  getLedger,
  getMainLedger,
  addAccount as addAccountToLedger,
  addEntry as addEntryToLedger,
  removeEntry as removeEntryFromLedger,
  updateEntry as updateEntryInLedger,
  updateLedger,
  updateAccount as updateAccountInLedger,
  setExchangeRate as setExchangeRateInBook,
  addCommonTags as addCommonTagsToBook,
  removeCommonTags as removeCommonTagsFromBook,
} from "./double-entry";

// ============================================================================
// 账簿操作
// ============================================================================

/**
 * 获取账簿数据，如果不存在则创建默认账簿
 */
export async function getBook(): Promise<BookData> {
  let book = await storage.getBookData();

  if (!book) {
    // 创建默认账簿
    book = createBook({ mainLedgerName: "主账本", defaultCurrency: "CNY" });
    await storage.saveBookData(book);
  }

  return book;
}

/**
 * 保存账簿数据（触发远端同步）
 */
export async function saveBook(book: BookData): Promise<void> {
  await storage.saveBookData(book);
}

/**
 * 保存账簿数据（仅本地，不触发远端同步）
 */
export async function saveBookLocal(book: BookData): Promise<void> {
  await storage.saveBookLocalOnly(book);
}

// ============================================================================
// 账本操作
// ============================================================================

/**
 * 添加账本
 */
export async function addLedger(params: {
  name: string;
  type?: LedgerType;
  description?: string;
  defaultCurrency?: CurrencyCode;
  icon?: string;
}): Promise<BookData> {
  const book = await getBook();
  const updatedBook = addLedgerToBook(book, params);
  await saveBook(updatedBook);
  return updatedBook;
}

/**
 * 删除账本
 */
export async function removeLedger(ledgerId: string): Promise<BookData> {
  const book = await getBook();
  const updatedBook = removeLedgerFromBook(book, ledgerId);
  await saveBook(updatedBook);
  return updatedBook;
}

/**
 * 更新账本信息
 */
export async function updateLedgerInfo(
  ledgerId: string,
  updates: Partial<Pick<LedgerData, "name" | "description" | "icon" | "archived">>,
): Promise<BookData> {
  const book = await getBook();
  const updatedBook = updateLedgerInBook(book, ledgerId, (ledger) =>
    updateLedger(ledger, updates),
  );
  await saveBook(updatedBook);
  return updatedBook;
}

/**
 * 获取主账本
 */
export async function getMainLedgerData(): Promise<LedgerData> {
  const book = await getBook();
  return getMainLedger(book);
}

/**
 * 获取指定账本
 */
export async function getLedgerData(ledgerId: string): Promise<LedgerData | undefined> {
  const book = await getBook();
  return getLedger(book, ledgerId);
}

// ============================================================================
// 账户操作
// ============================================================================

/**
 * 添加账户到账本
 */
export async function addAccount(
  ledgerId: string,
  params: {
    name: string;
    parentId: string;
    currency?: CurrencyCode;
    icon?: string;
    note?: string;
  },
): Promise<BookData> {
  const book = await getBook();
  const updatedBook = updateLedgerInBook(book, ledgerId, (ledger) =>
    addAccountToLedger(ledger, params),
  );
  await saveBook(updatedBook);
  return updatedBook;
}

/**
 * 添加账户到主账本
 */
export async function addAccountToMain(params: {
  name: string;
  parentId: string;
  currency?: CurrencyCode;
  icon?: string;
  note?: string;
}): Promise<BookData> {
  const book = await getBook();
  const mainLedger = getMainLedger(book);
  return addAccount(mainLedger.id, params);
}

/**
 * 更新账户信息
 */
export async function updateAccountInfo(
  ledgerId: string,
  accountId: string,
  updates: { name?: string; icon?: string; note?: string; archived?: boolean },
): Promise<BookData> {
  const book = await getBook();
  const updatedBook = updateLedgerInBook(book, ledgerId, (ledger) =>
    updateAccountInLedger(ledger, accountId, updates),
  );
  await saveBook(updatedBook);
  return updatedBook;
}

// ============================================================================
// 分录操作
// ============================================================================

/**
 * 添加分录到账本
 */
export async function addEntry(
  ledgerId: string,
  entry: JournalEntryData,
): Promise<BookData> {
  const book = await getBook();
  const updatedBook = updateLedgerInBook(book, ledgerId, (ledger) =>
    addEntryToLedger(ledger, entry),
  );
  await saveBook(updatedBook);
  return updatedBook;
}

/**
 * 添加分录到主账本
 */
export async function addEntryToMain(entry: JournalEntryData): Promise<BookData> {
  const book = await getBook();
  const mainLedger = getMainLedger(book);
  return addEntry(mainLedger.id, entry);
}

/**
 * 删除分录
 */
export async function removeEntry(
  ledgerId: string,
  entryId: string,
): Promise<BookData> {
  const book = await getBook();
  const updatedBook = updateLedgerInBook(book, ledgerId, (ledger) =>
    removeEntryFromLedger(ledger, entryId),
  );
  await saveBook(updatedBook);
  return updatedBook;
}

/**
 * 更新分录
 */
export async function updateEntry(
  ledgerId: string,
  entry: JournalEntryData,
): Promise<BookData> {
  const book = await getBook();
  const updatedBook = updateLedgerInBook(book, ledgerId, (ledger) =>
    updateEntryInLedger(ledger, entry),
  );
  await saveBook(updatedBook);
  return updatedBook;
}

// ============================================================================
// 汇率操作
// ============================================================================

/**
 * 设置汇率
 */
export async function setExchangeRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
  date?: string,
): Promise<BookData> {
  const book = await getBook();
  const updatedBook = setExchangeRateInBook(book, from, to, rate, date);
  await saveBook(updatedBook);
  return updatedBook;
}

// ============================================================================
// 标签操作
// ============================================================================

/**
 * 添加常用标签
 */
export async function addCommonTags(tags: string[]): Promise<BookData> {
  const book = await getBook();
  const updatedBook = addCommonTagsToBook(book, tags);
  await saveBook(updatedBook);
  return updatedBook;
}

/**
 * 移除常用标签
 */
export async function removeCommonTags(tags: string[]): Promise<BookData> {
  const book = await getBook();
  const updatedBook = removeCommonTagsFromBook(book, tags);
  await saveBook(updatedBook);
  return updatedBook;
}

// ============================================================================
// 导出类型
// ============================================================================

export type { BookData, LedgerData, JournalEntryData };
