/**
 * Repository 接口定义
 *
 * 定义数据访问接口，实现存储层与业务逻辑的解耦
 */

import type {
  BookData,
  LedgerData,
  AccountData,
  JournalEntryData,
  ExchangeRate,
  EntryQuery,
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
  getBookMeta(userId: string): Promise<{
    mainLedgerId: string;
    commonTags: string[];
    exchangeRates: ExchangeRate[];
    updatedAt: string | null;
  } | null>;

  /** 保存账簿元数据 */
  saveBookMeta(
    userId: string,
    meta: {
      mainLedgerId: string;
      commonTags: string[];
      exchangeRates: ExchangeRate[];
    },
  ): Promise<void>;
}

/**
 * 账本 Repository
 */
export interface ILedgerRepository {
  /** 获取所有账本 */
  getAllLedgers(userId: string): Promise<LedgerData[]>;

  /** 获取单个账本（不包含分录） */
  getLedger(userId: string, ledgerId: string): Promise<LedgerData | null>;

  /** 保存账本 */
  saveLedger(userId: string, ledger: LedgerData): Promise<void>;

  /** 删除账本 */
  deleteLedger(userId: string, ledgerId: string): Promise<void>;
}

/**
 * 账户 Repository
 */
export interface IAccountRepository {
  /** 获取账本的所有账户 */
  getAccounts(userId: string, ledgerId: string): Promise<AccountData[]>;

  /** 保存账户 */
  saveAccount(userId: string, ledgerId: string, account: AccountData): Promise<void>;

  /** 批量保存账户 */
  saveAccounts(userId: string, ledgerId: string, accounts: AccountData[]): Promise<void>;

  /** 删除账户 */
  deleteAccount(userId: string, ledgerId: string, accountId: string): Promise<void>;
}

/**
 * 分录 Repository
 */
export interface IEntryRepository {
  /** 查询分录（分页） */
  queryEntries(
    userId: string,
    ledgerId: string,
    options?: EntryQueryOptions,
  ): Promise<PaginatedResult<JournalEntryData>>;

  /** 获取单条分录 */
  getEntry(userId: string, ledgerId: string, entryId: string): Promise<JournalEntryData | null>;

  /** 保存分录 */
  saveEntry(userId: string, ledgerId: string, entry: JournalEntryData): Promise<void>;

  /** 批量保存分录 */
  saveEntries(userId: string, ledgerId: string, entries: JournalEntryData[]): Promise<void>;

  /** 删除分录 */
  deleteEntry(userId: string, ledgerId: string, entryId: string): Promise<void>;

  /** 获取分录统计 */
  getEntryStats(
    userId: string,
    ledgerId: string,
    options?: EntryQueryOptions,
  ): Promise<EntryStats>;

  /** 监听分录变化（实时） */
  watchEntries(
    userId: string,
    ledgerId: string,
    callback: (entries: JournalEntryData[]) => void,
  ): () => void;
}

/**
 * 统一 Repository 工厂
 */
export interface IRepositoryFactory {
  getBookRepository(): IBookRepository;
  getLedgerRepository(): ILedgerRepository;
  getAccountRepository(): IAccountRepository;
  getEntryRepository(): IEntryRepository;
}
