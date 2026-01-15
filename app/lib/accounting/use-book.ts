/**
 * 账簿 React Hook
 *
 * 提供账簿数据的加载、保存和操作
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  BookData,
  LedgerData,
  AccountData,
  JournalEntryData,
  CurrencyCode,
} from "../double-entry/types";
import { AccountType, LedgerType, EntryLineType } from "../double-entry/types";
import {
  getBook,
  saveBook,
  addAccount as addAccountToBook,
  addAccountToMain,
  updateAccountInfo,
  addLedger,
  removeLedger,
  updateLedgerInfo,
  addEntry,
  addEntryToMain,
  removeEntry,
  setExchangeRate,
} from "../book-store";
import {
  getMainLedger,
  getLedger,
  getActiveLedgers,
  findAccountsByType,
  findAccountById,
  findChildAccounts,
  getNetWorth,
  getTypeBalance,
  createSimpleEntry,
  fromMainUnit,
  toMainUnit,
} from "../double-entry";
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
  const [book, setBook] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLedgerId, setCurrentLedgerIdState] = useState<string | null>(null);

  // 加载账簿
  const loadBook = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBook();
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
  }, []);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

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
      const { initialBalance, ...accountParams } = params;
      const updatedBook = await addAccountToMain(accountParams);
      setBook(updatedBook);

      // 如果有初始余额，创建期初分录
        if (initialBalance && initialBalance > 0) {
        const newMainLedger = getMainLedger(updatedBook);
        // 找到刚创建的账户
        const newAccount = newMainLedger.accounts.find(
          (a) => a.name === params.name && a.parentId === params.parentId,
        );
        if (newAccount) {
          // 找到权益根账户
          const equityRoot = newMainLedger.accounts.find(
            (a) => a.type === AccountType.EQUITY && a.parentId === null,
          );
          if (equityRoot) {
            const currency = params.currency ?? newMainLedger.defaultCurrency;
            const amount = fromMainUnit(initialBalance, currency).amount;
            const entry = createSimpleEntry({
              date: new Date(),
              description: "期初余额",
              debitAccountId: newAccount.id,
              creditAccountId: equityRoot.id,
              amount,
            });
            const finalBook = await addEntryToMain(entry);
            setBook(finalBook);
          }
        }
      }
    },
    [],
  );

  // 更新账户
  const updateAccount = useCallback(
    async (
      accountId: string,
      updates: { name?: string; icon?: string; note?: string; archived?: boolean },
    ) => {
      if (!book) return;
      const mainLedgerId = book.mainLedgerId;
      const updatedBook = await updateAccountInfo(mainLedgerId, accountId, updates);
      setBook(updatedBook);
    },
    [book],
  );

  // 创建专题账本
  const createLedger = useCallback(async (name: string, description?: string) => {
    const updatedBook = await addLedger({
      name,
      type: LedgerType.TOPIC,
      description,
    });
    setBook(updatedBook);
    // 切换到新账本
    const newLedger = updatedBook.ledgers[updatedBook.ledgers.length - 1];
    if (newLedger) {
      setCurrentLedgerId(newLedger.id);
    }
  }, [setCurrentLedgerId]);

  // 删除账本
  const deleteLedger = useCallback(
    async (id: string) => {
      const updatedBook = await removeLedger(id);
      setBook(updatedBook);
      // 如果删除的是当前账本，切换到主账本
      if (currentLedgerId === id) {
        setCurrentLedgerId(updatedBook.mainLedgerId);
      }
    },
    [currentLedgerId, setCurrentLedgerId],
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

      const amount = fromMainUnit(params.amount, params.currency).amount;
      let entry: JournalEntryData;

      if (params.type === "expense") {
        // 支出：借方为支出分类，贷方为付款账户
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
        // 收入：借方为收款账户，贷方为收入分类
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
        // 转账：借方为目标账户，贷方为源账户
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

      const updatedBook = await addEntry(currentLedger.id, entry);
      setBook(updatedBook);
    },
    [currentLedger],
  );

  // 删除分录
  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!currentLedger) return;
      const updatedBook = await removeEntry(currentLedger.id, entryId);
      setBook(updatedBook);
    },
    [currentLedger],
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
