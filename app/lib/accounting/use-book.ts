/**
 * 账簿 React Hook
 *
 * 提供账簿数据的加载、保存和操作
 * 使用 Firebase Firestore 作为数据存储
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  BookData,
  LedgerData,
  AccountData,
  JournalEntryData,
  CurrencyCode,
} from "../double-entry/types";
import { AccountType, LedgerType } from "../double-entry/types";
import {
  getMainLedger,
  getLedger,
  getActiveLedgers,
  findAccountsByType,
  findChildAccounts,
  getNetWorth,
  getTypeBalance,
  createSimpleEntry,
  fromMainUnit,
  toMainUnit,
} from "../double-entry";
import { useI18n } from "../i18n";
import { useAuth } from "../firebase/auth-context";
import { FirestoreRepositoryFactory } from "../firebase/repository/firestore-repository";
import { BookService } from "../firebase/services/book-service";
import { LAST_LEDGER_KEY } from "./constants";

// ============================================================================
// Types
// ============================================================================

export interface UseBookResult {
  /** 账簿数据 */
  book: BookData | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 当前选中的账本 */
  currentLedger: LedgerData | null;
  /** 设置当前账本 */
  setCurrentLedgerId: (id: string) => void;

  // 账户操作
  /** 获取账户列表（按类型） */
  getAccountsByType: (type: AccountType) => AccountData[];
  /** 获取子账户 */
  getChildAccounts: (parentId: string) => AccountData[];
  /** 添加账户 */
  addAccount: (params: {
    name: string;
    parentId: string;
    currency?: CurrencyCode;
    icon?: string;
    initialBalance?: number;
  }) => Promise<void>;
  /** 更新账户 */
  updateAccount: (
    accountId: string,
    updates: { name?: string; icon?: string; note?: string; archived?: boolean },
  ) => Promise<void>;
  /** 删除账户（归档） */
  archiveAccount: (accountId: string) => Promise<void>;

  // 分类操作（支出/收入账户）
  /** 支出分类列表 */
  expenseCategories: AccountData[];
  /** 收入分类列表 */
  incomeCategories: AccountData[];
  /** 添加分类 */
  addCategory: (params: {
    type: "expense" | "income";
    name: string;
    icon?: string;
  }) => Promise<void>;
  /** 更新分类 */
  updateCategory: (
    categoryId: string,
    updates: { name?: string; icon?: string },
  ) => Promise<void>;
  /** 删除分类（归档） */
  archiveCategory: (categoryId: string) => Promise<void>;

  // 账本操作
  /** 获取所有活跃账本 */
  ledgers: LedgerData[];
  /** 创建专题账本 */
  createLedger: (name: string, description?: string) => Promise<void>;
  /** 删除账本 */
  deleteLedger: (id: string) => Promise<void>;

  // 记账操作
  /** 添加简单分录（支出/收入） */
  addSimpleEntry: (params: {
    type: "expense" | "income" | "transfer";
    amount: number;
    currency: CurrencyCode;
    categoryAccountId: string;
    paymentAccountId: string;
    toAccountId?: string; // 转账目标账户
    description: string;
    date: string;
    tags?: string[];
    payee?: string;
  }) => Promise<void>;
  /** 删除分录 */
  deleteEntry: (entryId: string) => Promise<void>;

  // 统计
  /** 获取净资产 */
  netWorth: number;
  /** 获取总资产 */
  totalAssets: number;
  /** 获取总负债 */
  totalLiabilities: number;

  // 刷新
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useBook(): UseBookResult {
  const { t } = useI18n();
  const { user, isAuthenticated } = useAuth();

  const [book, setBook] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLedgerId, setCurrentLedgerIdState] = useState<string | null>(null);

  // 使用 ref 缓存 service 实例
  const serviceRef = useRef<BookService | null>(null);

  // 初始化 service
  const getService = useCallback(() => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    if (!serviceRef.current) {
      const factory = new FirestoreRepositoryFactory(user.id);
      serviceRef.current = new BookService(
        user.id,
        factory.getBookRepository(),
        factory.getLedgerRepository(),
        factory.getAccountRepository(),
        factory.getEntryRepository(),
      );
    }
    return serviceRef.current;
  }, [user]);

  // 加载账簿
  const loadBook = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const service = getService();
      const data = await service.getOrCreateBook({
        mainLedgerName: t.records.defaultLedger,
        categoryLabels: t.records.categories as Record<string, string>,
      });
      setBook(data);

      // 恢复上次使用的账本
      const lastLedgerId = localStorage.getItem(LAST_LEDGER_KEY);
      if (lastLedgerId && data.ledgers.some((l) => l.id === lastLedgerId)) {
        setCurrentLedgerIdState(lastLedgerId);
      } else {
        setCurrentLedgerIdState(data.mainLedgerId);
      }
    } catch (error) {
      console.error("Failed to load book:", error);
    } finally {
      setIsLoading(false);
    }
  }, [t.records.defaultLedger, t.records.categories, isAuthenticated, user, getService]);

  // 用户登录后加载
  useEffect(() => {
    if (isAuthenticated && user) {
      loadBook();
    } else {
      setBook(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user, loadBook]);

  // 当前账本
  const currentLedger = useMemo(() => {
    if (!book || !currentLedgerId) return null;
    return getLedger(book, currentLedgerId) ?? getMainLedger(book);
  }, [book, currentLedgerId]);

  // 设置当前账本
  const setCurrentLedgerId = useCallback((id: string) => {
    setCurrentLedgerIdState(id);
    localStorage.setItem(LAST_LEDGER_KEY, id);
  }, []);

  // 所有活跃账本
  const ledgers = useMemo(() => {
    if (!book) return [];
    return getActiveLedgers(book);
  }, [book]);

  // 获取主账本的账户（用于资产管理）
  const mainLedger = useMemo(() => {
    if (!book) return null;
    return getMainLedger(book);
  }, [book]);

  // 按类型获取账户
  const getAccountsByType = useCallback(
    (type: AccountType): AccountData[] => {
      if (!mainLedger) return [];
      return findAccountsByType(mainLedger.accounts, type);
    },
    [mainLedger],
  );

  // 获取子账户
  const getChildAccounts = useCallback(
    (parentId: string): AccountData[] => {
      if (!mainLedger) return [];
      return findChildAccounts(mainLedger.accounts, parentId);
    },
    [mainLedger],
  );

  // 添加账户
  const addAccount = useCallback(
    async (params: {
      name: string;
      parentId: string;
      currency?: CurrencyCode;
      icon?: string;
      initialBalance?: number;
    }) => {
      if (!book) return;

      const { initialBalance, ...accountParams } = params;
      const service = getService();

      // 添加账户
      const newAccount = await service.addAccount(book.mainLedgerId, accountParams);

      // 刷新账簿
      const updatedBook = await service.getOrCreateBook({
        mainLedgerName: t.records.defaultLedger,
        categoryLabels: t.records.categories as Record<string, string>,
      });
      setBook(updatedBook);

      // 如果有初始余额，创建期初分录
      if (initialBalance && initialBalance > 0) {
        const updatedMainLedger = getMainLedger(updatedBook);
        const equityRoot = updatedMainLedger.accounts.find(
          (a) => a.type === AccountType.EQUITY && a.parentId === null,
        );
        if (equityRoot) {
          const currency = params.currency ?? updatedMainLedger.defaultCurrency;
          const amount = fromMainUnit(initialBalance, currency).amount;
          const entry = createSimpleEntry({
            date: new Date(),
            description: "期初余额",
            debitAccountId: newAccount.id,
            creditAccountId: equityRoot.id,
            amount,
          });
          await service.addEntry(book.mainLedgerId, entry);

          // 再次刷新
          const finalBook = await service.getOrCreateBook({
            mainLedgerName: t.records.defaultLedger,
            categoryLabels: t.records.categories as Record<string, string>,
          });
          setBook(finalBook);
        }
      }
    },
    [book, t.records.defaultLedger, t.records.categories, getService],
  );

  // 更新账户
  const updateAccount = useCallback(
    async (
      accountId: string,
      updates: { name?: string; icon?: string; note?: string; archived?: boolean },
    ) => {
      if (!book) return;
      const service = getService();
      await service.updateAccount(book.mainLedgerId, accountId, updates);

      // 刷新账簿
      const updatedBook = await service.getOrCreateBook({
        mainLedgerName: t.records.defaultLedger,
        categoryLabels: t.records.categories as Record<string, string>,
      });
      setBook(updatedBook);
    },
    [book, t.records.defaultLedger, t.records.categories, getService],
  );

  // 归档账户
  const archiveAccount = useCallback(
    async (accountId: string) => {
      await updateAccount(accountId, { archived: true });
    },
    [updateAccount],
  );

  // 分类列表（支出/收入账户的子账户）
  const expenseCategories = useMemo(() => {
    if (!mainLedger) return [];
    return findAccountsByType(mainLedger.accounts, AccountType.EXPENSES).filter(
      (a) => a.parentId !== null && !a.archived,
    );
  }, [mainLedger]);

  const incomeCategories = useMemo(() => {
    if (!mainLedger) return [];
    return findAccountsByType(mainLedger.accounts, AccountType.INCOME).filter(
      (a) => a.parentId !== null && !a.archived,
    );
  }, [mainLedger]);

  // 添加分类
  const addCategory = useCallback(
    async (params: { type: "expense" | "income"; name: string; icon?: string }) => {
      if (!mainLedger) return;

      const rootAccount = mainLedger.accounts.find(
        (a) =>
          a.type ===
            (params.type === "expense" ? AccountType.EXPENSES : AccountType.INCOME) &&
          a.parentId === null,
      );
      if (!rootAccount) return;

      const service = getService();
      await service.addAccount(book!.mainLedgerId, {
        name: params.name,
        parentId: rootAccount.id,
        icon: params.icon,
      });

      // 刷新账簿
      const updatedBook = await service.getOrCreateBook({
        mainLedgerName: t.records.defaultLedger,
        categoryLabels: t.records.categories as Record<string, string>,
      });
      setBook(updatedBook);
    },
    [mainLedger, book, t.records.defaultLedger, t.records.categories, getService],
  );

  // 更新分类
  const updateCategory = useCallback(
    async (categoryId: string, updates: { name?: string; icon?: string }) => {
      await updateAccount(categoryId, updates);
    },
    [updateAccount],
  );

  // 归档分类
  const archiveCategory = useCallback(
    async (categoryId: string) => {
      await updateAccount(categoryId, { archived: true });
    },
    [updateAccount],
  );

  // 创建专题账本
  const createLedger = useCallback(
    async (name: string, description?: string) => {
      const service = getService();
      const newLedger = await service.addLedger({
        name,
        type: LedgerType.TOPIC,
        description,
      });

      // 刷新账簿
      const updatedBook = await service.getOrCreateBook({
        mainLedgerName: t.records.defaultLedger,
        categoryLabels: t.records.categories as Record<string, string>,
      });
      setBook(updatedBook);

      // 切换到新账本
      setCurrentLedgerId(newLedger.id);
    },
    [t.records.defaultLedger, t.records.categories, getService, setCurrentLedgerId],
  );

  // 删除账本
  const deleteLedger = useCallback(
    async (id: string) => {
      const service = getService();
      await service.removeLedger(id);

      // 刷新账簿
      const updatedBook = await service.getOrCreateBook({
        mainLedgerName: t.records.defaultLedger,
        categoryLabels: t.records.categories as Record<string, string>,
      });
      setBook(updatedBook);

      // 如果删除的是当前账本，切换到主账本
      if (currentLedgerId === id) {
        setCurrentLedgerId(updatedBook.mainLedgerId);
      }
    },
    [currentLedgerId, setCurrentLedgerId, t.records.defaultLedger, t.records.categories, getService],
  );

  // 添加简单分录
  const addSimpleEntry = useCallback(
    async (params: {
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
    }) => {
      if (!currentLedger) return;

      const service = getService();
      await service.addSimpleEntry({
        ...params,
        ledgerId: currentLedger.id,
      });

      // 刷新账簿
      const updatedBook = await service.getOrCreateBook({
        mainLedgerName: t.records.defaultLedger,
        categoryLabels: t.records.categories as Record<string, string>,
      });
      setBook(updatedBook);
    },
    [currentLedger, t.records.defaultLedger, t.records.categories, getService],
  );

  // 删除分录
  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!currentLedger) return;

      const service = getService();
      await service.removeEntry(currentLedger.id, entryId);

      // 刷新账簿
      const updatedBook = await service.getOrCreateBook({
        mainLedgerName: t.records.defaultLedger,
        categoryLabels: t.records.categories as Record<string, string>,
      });
      setBook(updatedBook);
    },
    [currentLedger, t.records.defaultLedger, t.records.categories, getService],
  );

  // 统计数据
  const { netWorth: netWorthValue, totalAssets, totalLiabilities } = useMemo(() => {
    if (!mainLedger) {
      return { netWorth: 0, totalAssets: 0, totalLiabilities: 0 };
    }
    return {
      netWorth: getNetWorth(mainLedger),
      totalAssets: getTypeBalance(mainLedger, AccountType.ASSETS),
      totalLiabilities: getTypeBalance(mainLedger, AccountType.LIABILITIES),
    };
  }, [mainLedger]);

  return {
    book,
    isLoading,
    currentLedger,
    setCurrentLedgerId,
    getAccountsByType,
    getChildAccounts,
    addAccount,
    updateAccount,
    archiveAccount,
    expenseCategories,
    incomeCategories,
    addCategory,
    updateCategory,
    archiveCategory,
    ledgers,
    createLedger,
    deleteLedger,
    addSimpleEntry,
    deleteEntry,
    netWorth: netWorthValue,
    totalAssets,
    totalLiabilities,
    refresh: loadBook,
  };
}
