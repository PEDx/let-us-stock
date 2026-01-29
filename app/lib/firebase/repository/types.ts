/**
 * Repository 接口定义
 *
 * 定义数据访问接口，实现存储层与业务逻辑的解耦
 */

import type {
  BookData,
  AccountData,
  JournalEntryData,
  ExchangeRate,
} from "~/lib/double-entry/types";

// ============================================================================
// 查询选项
// ============================================================================

/**
 * 分录查询选项
 */
export interface EntryQueryOptions {
  /** 页码（从 1 开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 日期范围起始 */
  startDate?: string;
  /** 日期范围结束 */
  endDate?: string;
  /** 账户 ID 列表 */
  accountIds?: string[];
  /** 标签 */
  tags?: string[];
  /** 关键词搜索 */
  keyword?: string;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有更多数据 */
  hasMore: boolean;
}

/**
 * 统计结果
 */
export interface EntryStats {
  totalCount: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byAccount: Record<string, number>;
  byTag: Record<string, number>;
}

// ============================================================================
// Repository 接口
// ============================================================================

/**
 * 账簿 Repository
 */
export interface IBookRepository {
  /** 获取账簿元数据（不包含明细） */
  getBookMeta(
    userId: string,
    bookId: string,
  ): Promise<{
    commonTags: string[];
    exchangeRates: ExchangeRate[];
    updatedAt: string | null;
  } | null>;

  /** 保存账簿元数据 */
  saveBookMeta(
    userId: string,
    bookId: string,
    meta: { commonTags: string[]; exchangeRates: ExchangeRate[] },
  ): Promise<void>;

  /** 获取单个账簿（不包含分录） */
  getBook(userId: string, bookId: string): Promise<BookData | null>;

  /** 保存账簿 */
  saveBook(userId: string, book: BookData): Promise<void>;

  /** 删除账簿 */
  deleteBook(userId: string, bookId: string): Promise<void>;
}

/**
 * 账户 Repository
 */
export interface IAccountRepository {
  /** 获取账簿的所有账户 */
  getAccounts(userId: string, bookId: string): Promise<AccountData[]>;

  /** 保存账户 */
  saveAccount(userId: string, bookId: string, account: AccountData): Promise<void>;

  /** 批量保存账户 */
  saveAccounts(userId: string, bookId: string, accounts: AccountData[]): Promise<void>;

  /** 删除账户 */
  deleteAccount(userId: string, bookId: string, accountId: string): Promise<void>;
}

/**
 * 分录 Repository
 */
export interface IEntryRepository {
  /** 查询分录（分页） */
  queryEntries(
    userId: string,
    bookId: string,
    options?: EntryQueryOptions,
  ): Promise<PaginatedResult<JournalEntryData>>;

  /** 获取单条分录 */
  getEntry(
    userId: string,
    bookId: string,
    entryId: string,
  ): Promise<JournalEntryData | null>;

  /** 保存分录 */
  saveEntry(userId: string, bookId: string, entry: JournalEntryData): Promise<void>;

  /** 批量保存分录 */
  saveEntries(userId: string, bookId: string, entries: JournalEntryData[]): Promise<void>;

  /** 删除分录 */
  deleteEntry(userId: string, bookId: string, entryId: string): Promise<void>;

  /** 获取分录统计 */
  getEntryStats(
    userId: string,
    bookId: string,
    options?: EntryQueryOptions,
  ): Promise<EntryStats>;

  /** 监听分录变化（实时） */
  watchEntries(
    userId: string,
    bookId: string,
    callback: (entries: JournalEntryData[]) => void,
  ): () => void;
}

/**
 * 统一 Repository 工厂
 */
export interface IRepositoryFactory {
  getBookRepository(): IBookRepository;
  getAccountRepository(): IAccountRepository;
  getEntryRepository(): IEntryRepository;
}
