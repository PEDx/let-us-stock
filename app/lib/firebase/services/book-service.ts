/**
 * 账簿服务层
 *
 * 封装账簿相关的业务逻辑，使用 Repository 进行数据访问
 */

import type {
  BookData,
  LedgerData,
  AccountData,
  JournalEntryData,
  ExchangeRate,
  CurrencyCode,
} from "~/lib/double-entry/types";
import {
  LedgerType,
  AccountType
} from "~/lib/double-entry/types";
import type {
  IBookRepository,
  ILedgerRepository,
  IAccountRepository,
  IEntryRepository,
  PaginatedResult,
  EntryStats,
} from "../repository/types";
import {
  createSimpleEntry,
  fromMainUnit,
} from "~/lib/double-entry";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "~/lib/accounting/constants";

// ============================================================================
// 工具函数
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// 账簿服务
// ============================================================================

export class BookService {
  private bookRepo: IBookRepository;
  private ledgerRepo: ILedgerRepository;
  private accountRepo: IAccountRepository;
  private entryRepo: IEntryRepository;
  private userId: string;

  constructor(
    userId: string,
    bookRepo: IBookRepository,
    ledgerRepo: ILedgerRepository,
    accountRepo: IAccountRepository,
    entryRepo: IEntryRepository,
  ) {
    this.userId = userId;
    this.bookRepo = bookRepo;
    this.ledgerRepo = ledgerRepo;
    this.accountRepo = accountRepo;
    this.entryRepo = entryRepo;
  }

  // ============================================================================
  // 账簿初始化
  // ============================================================================

  /**
   * 获取或创建账簿
   */
  async getOrCreateBook(options?: {
    mainLedgerName?: string;
    defaultCurrency?: CurrencyCode;
    categoryLabels?: Record<string, string>;
  }): Promise<BookData> {
    let bookMeta = await this.bookRepo.getBookMeta(this.userId);

    if (!bookMeta) {
      // 创建新账簿
      const mainLedgerId = generateId();
      const mainLedgerName = options?.mainLedgerName ?? "Main";
      const defaultCurrency = options?.defaultCurrency ?? "CNY";

      // 创建主账本
      const mainLedger: LedgerData = {
        id: mainLedgerId,
        name: mainLedgerName,
        type: LedgerType.MAIN,
        accounts: [],
        entries: [],
        defaultCurrency,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 保存账本
      await this.ledgerRepo.saveLedger(this.userId, mainLedger);

      // 保存账簿元数据
      await this.bookRepo.saveBookMeta(this.userId, {
        mainLedgerId,
        commonTags: [],
        exchangeRates: [],
      });

      bookMeta = {
        mainLedgerId,
        commonTags: [],
        exchangeRates: [],
        updatedAt: new Date().toISOString(),
      };

      // 添加预设分类
      await this.addPresetCategories(mainLedgerId, options?.categoryLabels, defaultCurrency);
    }

    // 构建完整的 BookData
    const ledgers = await this.ledgerRepo.getAllLedgers(this.userId);

    // 为每个账本加载账户
    for (const ledger of ledgers) {
      ledger.accounts = await this.accountRepo.getAccounts(this.userId, ledger.id);
    }

    return {
      ledgers,
      mainLedgerId: bookMeta.mainLedgerId,
      commonTags: bookMeta.commonTags,
      exchangeRates: bookMeta.exchangeRates,
      updatedAt: bookMeta.updatedAt ?? new Date().toISOString(),
    };
  }

  /**
   * 添加预设分类
   */
  private async addPresetCategories(
    ledgerId: string,
    categoryLabels?: Record<string, string>,
    defaultCurrency: CurrencyCode = "CNY",
  ): Promise<void> {
    const rootAccounts: AccountData[] = [
      {
        id: generateId(),
        name: "Assets",
        type: AccountType.ASSETS,
        currency: defaultCurrency,
        parentId: null,
        path: "assets",
        balance: 0,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "Liabilities",
        type: AccountType.LIABILITIES,
        currency: defaultCurrency,
        parentId: null,
        path: "liabilities",
        balance: 0,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "Equity",
        type: AccountType.EQUITY,
        currency: defaultCurrency,
        parentId: null,
        path: "equity",
        balance: 0,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "Income",
        type: AccountType.INCOME,
        currency: defaultCurrency,
        parentId: null,
        path: "income",
        balance: 0,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: "Expenses",
        type: AccountType.EXPENSES,
        currency: defaultCurrency,
        parentId: null,
        path: "expenses",
        balance: 0,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 保存根账户
    await this.accountRepo.saveAccounts(this.userId, ledgerId, rootAccounts);

    // 添加分类
    const expenseRoot = rootAccounts.find((a) => a.type === "expenses")!;
    const incomeRoot = rootAccounts.find((a) => a.type === "income")!;

    const categories: Array<{ type: "expense" | "income"; labelKey: string; icon?: string }> = [
      ...EXPENSE_CATEGORIES.map((c) => ({ type: "expense" as const, ...c })),
      ...INCOME_CATEGORIES.map((c) => ({ type: "income" as const, ...c })),
    ];

    const categoryAccounts: AccountData[] = [];

    for (const cat of categories) {
      const parentId = cat.type === "expense" ? expenseRoot.id : incomeRoot.id;
      const name = categoryLabels?.[cat.labelKey] ?? cat.labelKey;

      categoryAccounts.push({
        id: generateId(),
        name,
        type: cat.type === "expense" ? AccountType.EXPENSES : AccountType.INCOME,
        currency: defaultCurrency,
        parentId,
        path: `${cat.type === "expense" ? "expenses" : "income"}/${cat.labelKey}`,
        balance: 0,
        icon: cat.icon,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await this.accountRepo.saveAccounts(this.userId, ledgerId, categoryAccounts);
  }

  // ============================================================================
  // 账本操作
  // ============================================================================

  async addLedger(params: {
    name: string;
    type?: LedgerType;
    description?: string;
    defaultCurrency?: CurrencyCode;
    icon?: string;
  }): Promise<LedgerData> {
    const bookMeta = await this.bookRepo.getBookMeta(this.userId);
    if (!bookMeta) {
      throw new Error("Book not initialized");
    }

    const ledger: LedgerData = {
      id: generateId(),
      name: params.name,
      type: params.type ?? LedgerType.DAILY,
      description: params.description,
      accounts: [],
      entries: [],
      defaultCurrency: params.defaultCurrency ?? bookMeta.exchangeRates.length > 0 ? "CNY" : "CNY",
      icon: params.icon,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.ledgerRepo.saveLedger(this.userId, ledger);
    return ledger;
  }

  async removeLedger(ledgerId: string): Promise<void> {
    const bookMeta = await this.bookRepo.getBookMeta(this.userId);
    if (!bookMeta) {
      throw new Error("Book not initialized");
    }

    if (ledgerId === bookMeta.mainLedgerId) {
      throw new Error("Cannot delete main ledger");
    }

    await this.ledgerRepo.deleteLedger(this.userId, ledgerId);
  }

  async updateLedgerInfo(
    ledgerId: string,
    updates: Partial<Pick<LedgerData, "name" | "description" | "icon" | "archived">>,
  ): Promise<LedgerData> {
    const ledger = await this.ledgerRepo.getLedger(this.userId, ledgerId);
    if (!ledger) {
      throw new Error("Ledger not found");
    }

    const updatedLedger: LedgerData = {
      ...ledger,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.ledgerRepo.saveLedger(this.userId, updatedLedger);
    return updatedLedger;
  }

  async getLedger(ledgerId: string): Promise<LedgerData | null> {
    const ledger = await this.ledgerRepo.getLedger(this.userId, ledgerId);
    if (!ledger) return null;

    // 加载账户
    ledger.accounts = await this.accountRepo.getAccounts(this.userId, ledgerId);

    return ledger;
  }

  async getMainLedger(): Promise<LedgerData | null> {
    const bookMeta = await this.bookRepo.getBookMeta(this.userId);
    if (!bookMeta) {
      throw new Error("Book not initialized");
    }
    return this.getLedger(bookMeta.mainLedgerId);
  }

  // ============================================================================
  // 账户操作
  // ============================================================================

  async addAccount(
    ledgerId: string,
    params: {
      name: string;
      parentId: string;
      currency?: CurrencyCode;
      icon?: string;
      note?: string;
    },
  ): Promise<AccountData> {
    const ledger = await this.ledgerRepo.getLedger(this.userId, ledgerId);
    if (!ledger) {
      throw new Error("Ledger not found");
    }

    const parentAccount = ledger.accounts.find((a) => a.id === params.parentId);
    const path = parentAccount ? `${parentAccount.path}/${params.name}` : params.name;

    const account: AccountData = {
      id: generateId(),
      name: params.name,
      type: parentAccount?.type ?? AccountType.ASSETS,
      currency: params.currency ?? ledger.defaultCurrency,
      parentId: params.parentId,
      path,
      balance: 0,
      icon: params.icon,
      note: params.note,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.accountRepo.saveAccount(this.userId, ledgerId, account);
    return account;
  }

  async updateAccount(
    ledgerId: string,
    accountId: string,
    updates: { name?: string; icon?: string; note?: string; archived?: boolean },
  ): Promise<AccountData> {
    const accounts = await this.accountRepo.getAccounts(this.userId, ledgerId);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    const updatedAccount: AccountData = {
      ...account,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.accountRepo.saveAccount(this.userId, ledgerId, updatedAccount);
    return updatedAccount;
  }

  async getAccounts(ledgerId: string): Promise<AccountData[]> {
    return this.accountRepo.getAccounts(this.userId, ledgerId);
  }

  // ============================================================================
  // 分录操作
  // ============================================================================

  async addEntry(ledgerId: string, entry: JournalEntryData): Promise<JournalEntryData> {
    const newEntry: JournalEntryData = {
      ...entry,
      id: entry.id ?? generateId(),
      createdAt: entry.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.entryRepo.saveEntry(this.userId, ledgerId, newEntry);
    return newEntry;
  }

  async addSimpleEntry(params: {
    ledgerId: string;
    type: "expense" | "income" | "transfer";
    amount: number;
    currency: CurrencyCode;
    categoryAccountId: string;
    paymentAccountId: string;
    toAccountId?: string;
    description: string;
    date: string;
    tags?: string[];
    payee?: string;
  }): Promise<JournalEntryData> {
    const ledger = await this.getLedger(params.ledgerId);
    if (!ledger) {
      throw new Error("Ledger not found");
    }

    const amount = fromMainUnit(params.amount, params.currency).amount;
    let entry: JournalEntryData;

    if (params.type === "expense") {
      entry = createSimpleEntry({
        date: new Date(params.date),
        description: params.description,
        debitAccountId: params.categoryAccountId,
        creditAccountId: params.paymentAccountId,
        amount,
        tags: params.tags,
        payee: params.payee,
      });
    } else if (params.type === "income") {
      entry = createSimpleEntry({
        date: new Date(params.date),
        description: params.description,
        debitAccountId: params.paymentAccountId,
        creditAccountId: params.categoryAccountId,
        amount,
        tags: params.tags,
        payee: params.payee,
      });
    } else {
      if (!params.toAccountId) {
        throw new Error("Transfer requires toAccountId");
      }
      entry = createSimpleEntry({
        date: new Date(params.date),
        description: params.description,
        debitAccountId: params.toAccountId,
        creditAccountId: params.paymentAccountId,
        amount,
        tags: params.tags,
      });
    }

    return this.addEntry(params.ledgerId, entry);
  }

  async updateEntry(ledgerId: string, entry: JournalEntryData): Promise<JournalEntryData> {
    const updatedEntry: JournalEntryData = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };

    await this.entryRepo.saveEntry(this.userId, ledgerId, updatedEntry);
    return updatedEntry;
  }

  async removeEntry(ledgerId: string, entryId: string): Promise<void> {
    await this.entryRepo.deleteEntry(this.userId, ledgerId, entryId);
  }

  async queryEntries(
    ledgerId: string,
    options?: {
      page?: number;
      pageSize?: number;
      startDate?: string;
      endDate?: string;
      accountIds?: string[];
      tags?: string[];
      keyword?: string;
    },
  ): Promise<PaginatedResult<JournalEntryData>> {
    return this.entryRepo.queryEntries(this.userId, ledgerId, options);
  }

  async getEntryStats(
    ledgerId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      accountIds?: string[];
      tags?: string[];
    },
  ): Promise<EntryStats> {
    return this.entryRepo.getEntryStats(this.userId, ledgerId, options);
  }

  // ============================================================================
  // 标签操作
  // ============================================================================

  async addCommonTags(tags: string[]): Promise<void> {
    const bookMeta = await this.bookRepo.getBookMeta(this.userId);
    if (!bookMeta) {
      throw new Error("Book not initialized");
    }

    const existingTags = new Set(bookMeta.commonTags);
    const newTags = tags.filter((t) => !existingTags.has(t));

    if (newTags.length > 0) {
      await this.bookRepo.saveBookMeta(this.userId, {
        ...bookMeta,
        commonTags: [...bookMeta.commonTags, ...newTags],
      });
    }
  }

  async removeCommonTags(tags: string[]): Promise<void> {
    const bookMeta = await this.bookRepo.getBookMeta(this.userId);
    if (!bookMeta) {
      throw new Error("Book not initialized");
    }

    const tagSet = new Set(tags);
    await this.bookRepo.saveBookMeta(this.userId, {
      ...bookMeta,
      commonTags: bookMeta.commonTags.filter((t) => !tagSet.has(t)),
    });
  }

  // ============================================================================
  // 汇率操作
  // ============================================================================

  async setExchangeRate(
    from: CurrencyCode,
    to: CurrencyCode,
    rate: number,
    date?: string,
  ): Promise<void> {
    const bookMeta = await this.bookRepo.getBookMeta(this.userId);
    if (!bookMeta) {
      throw new Error("Book not initialized");
    }

    const existingRates = bookMeta.exchangeRates.filter(
      (r) => !(r.from === from && r.to === to),
    );

    const newRate: ExchangeRate = {
      from,
      to,
      rate,
      date: date ?? new Date().toISOString(),
    };

    await this.bookRepo.saveBookMeta(this.userId, {
      ...bookMeta,
      exchangeRates: [...existingRates, newRate],
    });
  }
}
