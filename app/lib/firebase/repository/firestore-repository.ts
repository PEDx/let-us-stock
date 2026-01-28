/**
 * Firestore Repository 实现
 *
 * 使用 Firebase Firestore 作为数据存储，支持实时监听和离线缓存
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  onSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type {
  BookData,
  LedgerData,
  AccountData,
  JournalEntryData,
  ExchangeRate,
} from "../../double-entry/types";
import { getApps } from "firebase/app";
import type {
  IBookRepository,
  ILedgerRepository,
  IAccountRepository,
  IEntryRepository,
  EntryQueryOptions,
  PaginatedResult,
  EntryStats,
} from "./types";

// Firestore 实例
let db: Firestore | null = null;

function getDB(): Firestore {
  if (!db) {
    const app = getApps()[0];
    db = getFirestore(app);
  }
  return db;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 将 Date 转换为 Firestore Timestamp
 */
function toTimestamp(date: Date | string): Timestamp {
  const d = typeof date === "string" ? new Date(date) : date;
  return Timestamp.fromDate(d);
}

/**
 * 将 Firestore Timestamp 转换为 ISO 字符串
 */
function fromTimestamp(timestamp: Timestamp | null | undefined): string | null {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
}

/**
 * 将文档转换为 JournalEntryData
 */
function entryFromDoc(doc: QueryDocumentSnapshot): JournalEntryData {
  const data = doc.data();
  return {
    id: doc.id,
    date: data.date,
    description: data.description,
    lines: data.lines,
    tags: data.tags,
    payee: data.payee,
    note: data.note,
    createdAt: fromTimestamp(data.createdAt) ?? new Date().toISOString(),
    updatedAt: fromTimestamp(data.updatedAt) ?? new Date().toISOString(),
  };
}

// ============================================================================
// 账簿 Repository 实现
// ============================================================================

class BookRepository implements IBookRepository {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getBookMeta(
    userId: string,
  ): Promise<{
    mainLedgerId: string;
    commonTags: string[];
    exchangeRates: ExchangeRate[];
    updatedAt: string | null;
  } | null> {
    const db = getDB();
    const docRef = doc(db, `users/${userId}/meta`, "book");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      mainLedgerId: data.mainLedgerId,
      commonTags: data.commonTags ?? [],
      exchangeRates: data.exchangeRates ?? [],
      updatedAt: fromTimestamp(data.updatedAt),
    };
  }

  async saveBookMeta(
    userId: string,
    meta: {
      mainLedgerId: string;
      commonTags: string[];
      exchangeRates: ExchangeRate[];
    },
  ): Promise<void> {
    const db = getDB();
    const docRef = doc(db, `users/${userId}/meta`, "book");
    await setDoc(docRef, { ...meta, updatedAt: Timestamp.now() });
  }
}

// ============================================================================
// 账本 Repository 实现
// ============================================================================

class LedgerRepository implements ILedgerRepository {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getAllLedgers(userId: string): Promise<LedgerData[]> {
    const db = getDB();
    const collectionRef = collection(db, `users/${userId}/ledgers`);
    const snapshot = await getDocs(collectionRef);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        description: data.description,
        accounts: [], // 账户从子集合加载
        entries: [], // 分录从子集合加载
        defaultCurrency: data.defaultCurrency,
        icon: data.icon,
        archived: data.archived ?? false,
        createdAt: fromTimestamp(data.createdAt) ?? new Date().toISOString(),
        updatedAt: fromTimestamp(data.updatedAt) ?? new Date().toISOString(),
      };
    });
  }

  async getLedger(
    userId: string,
    ledgerId: string,
  ): Promise<LedgerData | null> {
    const db = getDB();
    const docRef = doc(db, `users/${userId}/ledgers`, ledgerId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      type: data.type,
      description: data.description,
      accounts: [],
      entries: [],
      defaultCurrency: data.defaultCurrency,
      icon: data.icon,
      archived: data.archived ?? false,
      createdAt: fromTimestamp(data.createdAt) ?? new Date().toISOString(),
      updatedAt: fromTimestamp(data.updatedAt) ?? new Date().toISOString(),
    };
  }

  async saveLedger(userId: string, ledger: LedgerData): Promise<void> {
    const db = getDB();
    const docRef = doc(db, `users/${userId}/ledgers`, ledger.id);
    await setDoc(docRef, {
      name: ledger.name,
      type: ledger.type,
      description: ledger.description ?? null,
      defaultCurrency: ledger.defaultCurrency ?? null,
      icon: ledger.icon ?? null,
      archived: ledger.archived ?? false,
      createdAt: ledger.createdAt
        ? toTimestamp(ledger.createdAt)
        : Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  async deleteLedger(userId: string, ledgerId: string): Promise<void> {
    const db = getDB();

    // 删除所有账户
    const accountsRef = collection(db, `users/${userId}/ledgers/${ledgerId}/accounts`);
    const accountsSnapshot = await getDocs(accountsRef);
    for (const doc of accountsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // 删除所有分录
    const entriesRef = collection(db, `users/${userId}/ledgers/${ledgerId}/entries`);
    const entriesSnapshot = await getDocs(entriesRef);
    
    // 使用 batch 删除分录（每个 batch 最多 500 个操作）
    const BATCH_SIZE = 500;
    for (let i = 0; i < entriesSnapshot.docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = entriesSnapshot.docs.slice(i, i + BATCH_SIZE);
      
      for (const doc of chunk) {
        batch.delete(doc.ref);
      }
      
      await batch.commit();
    }

    // 删除账本文档
    const ledgerRef = doc(db, `users/${userId}/ledgers`, ledgerId);
    await deleteDoc(ledgerRef);
  }
}

// ============================================================================
// 账户 Repository 实现
// ============================================================================

class AccountRepository implements IAccountRepository {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getAccounts(userId: string, ledgerId: string): Promise<AccountData[]> {
    const db = getDB();
    const collectionRef = collection(
      db,
      `users/${userId}/ledgers/${ledgerId}/accounts`,
    );
    const snapshot = await getDocs(collectionRef);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        currency: data.currency,
        parentId: data.parentId,
        path: data.path,
        balance: data.balance ?? 0,
        icon: data.icon,
        note: data.note,
        archived: data.archived ?? false,
        createdAt: fromTimestamp(data.createdAt) ?? new Date().toISOString(),
        updatedAt: fromTimestamp(data.updatedAt) ?? new Date().toISOString(),
      };
    });
  }

  async saveAccount(
    userId: string,
    ledgerId: string,
    account: AccountData,
  ): Promise<void> {
    const db = getDB();
    const docRef = doc(
      db,
      `users/${userId}/ledgers/${ledgerId}/accounts`,
      account.id,
    );
    await setDoc(docRef, {
      name: account.name,
      type: account.type,
      currency: account.currency ?? null,
      parentId: account.parentId ?? null,
      path: account.path,
      balance: account.balance ?? 0,
      icon: account.icon ?? null,
      note: account.note ?? null,
      archived: account.archived ?? false,
      createdAt: account.createdAt
        ? toTimestamp(account.createdAt)
        : Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  async saveAccounts(
    userId: string,
    ledgerId: string,
    accounts: AccountData[],
  ): Promise<void> {
    const db = getDB();
    const batch = writeBatch(db);

    for (const account of accounts) {
      const docRef = doc(
        db,
        `users/${userId}/ledgers/${ledgerId}/accounts`,
        account.id,
      );
      batch.set(docRef, {
        name: account.name,
        type: account.type,
        currency: account.currency ?? null,
        parentId: account.parentId ?? null,
        path: account.path,
        balance: account.balance ?? 0,
        icon: account.icon ?? null,
        note: account.note ?? null,
        archived: account.archived ?? false,
        createdAt: account.createdAt
          ? toTimestamp(account.createdAt)
          : Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();
  }

  async deleteAccount(
    userId: string,
    ledgerId: string,
    accountId: string,
  ): Promise<void> {
    const db = getDB();

    // 检查账户是否在分录中被使用
    const entriesRef = collection(db, `users/${userId}/ledgers/${ledgerId}/entries`);
    const entriesSnapshot = await getDocs(entriesRef);
    
    const isUsedInEntries = entriesSnapshot.docs.some((doc) => {
      const lines = doc.data().lines;
      return lines?.some((line: { accountId: string }) => line.accountId === accountId);
    });

    if (isUsedInEntries) {
      throw new Error("Cannot delete account that is used in entries. Archive it instead.");
    }

    // 查找所有子账户（递归删除）
    const accountsRef = collection(db, `users/${userId}/ledgers/${ledgerId}/accounts`);
    const snapshot = await getDocs(accountsRef);
    
    // 找到所有需要删除的账户（目标账户及其所有子账户）
    const toDelete: string[] = [accountId];
    const allAccounts = snapshot.docs.map((doc) => ({
      id: doc.id,
      parentId: doc.data().parentId,
    }));

    // 递归查找子账户
    const findChildren = (parentId: string) => {
      const children = allAccounts.filter((a) => a.parentId === parentId);
      for (const child of children) {
        toDelete.push(child.id);
        findChildren(child.id);
      }
    };

    findChildren(accountId);

    // 删除所有相关账户
    const BATCH_SIZE = 500;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = toDelete.slice(i, i + BATCH_SIZE);
      
      for (const id of chunk) {
        const docRef = doc(db, `users/${userId}/ledgers/${ledgerId}/accounts`, id);
        batch.delete(docRef);
      }
      
      await batch.commit();
    }
  }
}

// ============================================================================
// 分录 Repository 实现
// ============================================================================

class EntryRepository implements IEntryRepository {
  private userId: string;
  private DEFAULT_PAGE_SIZE = 50;

  constructor(userId: string) {
    this.userId = userId;
  }

  private getCollectionRef(ledgerId: string) {
    const db = getDB();
    return collection(db, `users/${this.userId}/ledgers/${ledgerId}/entries`);
  }

  async queryEntries(
    userId: string,
    ledgerId: string,
    options: EntryQueryOptions = {},
  ): Promise<PaginatedResult<JournalEntryData>> {
    const {
      page = 1,
      pageSize = this.DEFAULT_PAGE_SIZE,
      startDate,
      endDate,
      accountIds,
      tags,
      keyword,
    } = options;

    const db = getDB();
    const collectionRef = this.getCollectionRef(ledgerId);

    // 构建基础查询（路径已包含 ledgerId，无需 where 条件）
    let baseQuery = query(collectionRef, orderBy("date", "desc"));

    // 添加日期过滤（服务端）
    if (startDate && endDate) {
      baseQuery = query(
        collectionRef,
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "desc"),
      );
    } else if (startDate) {
      baseQuery = query(
        collectionRef,
        where("date", ">=", startDate),
        orderBy("date", "desc"),
      );
    } else if (endDate) {
      baseQuery = query(
        collectionRef,
        where("date", "<=", endDate),
        orderBy("date", "desc"),
      );
    }

    // 获取数据（获取更多数据用于后续过滤）
    const offset = (page - 1) * pageSize;
    const fetchSize = pageSize * 2; // 获取更多数据以支持客户端过滤
    let q = query(baseQuery, limit(fetchSize));

    const snapshot = await getDocs(q);
    let items = snapshot.docs.map(entryFromDoc);

    // 账户过滤（客户端，Firestore 不支持数组包含查询）
    if (accountIds && accountIds.length > 0) {
      items = items.filter((e) =>
        e.lines.some((l) => accountIds.includes(l.accountId)),
      );
    }

    // 标签过滤（客户端，Firestore 不支持数组包含查询）
    if (tags && tags.length > 0) {
      items = items.filter((e) => e.tags?.some((t) => tags.includes(t)));
    }

    // 关键词过滤（客户端，Firestore 不支持全文搜索）
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      items = items.filter(
        (e) =>
          e.description.toLowerCase().includes(lowerKeyword) ||
          e.payee?.toLowerCase().includes(lowerKeyword) ||
          e.note?.toLowerCase().includes(lowerKeyword),
      );
    }

    // 分页（在客户端过滤后）
    const startIdx = offset;
    const endIdx = startIdx + pageSize;
    const pageItems = items.slice(startIdx, endIdx);

    // 获取总数（对于客户端过滤，总数是所有符合条件的文档）
    const total = items.length;

    // 计算总页数和是否有更多
    const totalPages = Math.ceil(total / pageSize);
    const hasMore = endIdx < items.length;

    return {
      items: pageItems,
      total,
      page,
      pageSize,
      totalPages,
      hasMore,
    };
  }

  async getEntry(
    userId: string,
    ledgerId: string,
    entryId: string,
  ): Promise<JournalEntryData | null> {
    const db = getDB();
    const docRef = doc(
      db,
      `users/${userId}/ledgers/${ledgerId}/entries`,
      entryId,
    );
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return entryFromDoc(docSnap as QueryDocumentSnapshot);
  }

  async saveEntry(
    userId: string,
    ledgerId: string,
    entry: JournalEntryData,
  ): Promise<void> {
    const db = getDB();
    const docRef = doc(
      db,
      `users/${userId}/ledgers/${ledgerId}/entries`,
      entry.id,
    );
    await setDoc(docRef, {
      ledgerId,
      date: entry.date,
      description: entry.description ?? null,
      lines: entry.lines,
      tags: entry.tags ?? null,
      payee: entry.payee ?? null,
      note: entry.note ?? null,
      createdAt: entry.createdAt
        ? toTimestamp(entry.createdAt)
        : Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  async saveEntries(
    userId: string,
    ledgerId: string,
    entries: JournalEntryData[],
  ): Promise<void> {
    const db = getDB();
    const batch = writeBatch(db);

    for (const entry of entries) {
      const docRef = doc(
        db,
        `users/${userId}/ledgers/${ledgerId}/entries`,
        entry.id,
      );
      batch.set(docRef, {
        ledgerId,
        date: entry.date,
        description: entry.description ?? null,
        lines: entry.lines,
        tags: entry.tags ?? null,
        payee: entry.payee ?? null,
        note: entry.note ?? null,
        createdAt: entry.createdAt
          ? toTimestamp(entry.createdAt)
          : Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();
  }

  async deleteEntry(
    userId: string,
    ledgerId: string,
    entryId: string,
  ): Promise<void> {
    const db = getDB();
    const docRef = doc(
      db,
      `users/${userId}/ledgers/${ledgerId}/entries`,
      entryId,
    );
    await deleteDoc(docRef);
  }

  async getEntryStats(
    userId: string,
    ledgerId: string,
    options: EntryQueryOptions = {},
  ): Promise<EntryStats> {
    const { startDate, endDate } = options;

    const db = getDB();
    const collectionRef = this.getCollectionRef(ledgerId);

    // 构建查询
    let q = query(collectionRef, orderBy("date", "desc"));

    // 如果有日期范围，添加日期过滤
    if (startDate || endDate) {
      if (startDate && endDate) {
        q = query(
          collectionRef,
          where("date", ">=", startDate),
          where("date", "<=", endDate),
          orderBy("date", "desc"),
        );
      } else if (startDate) {
        q = query(
          collectionRef,
          where("date", ">=", startDate),
          orderBy("date", "desc"),
        );
      } else if (endDate) {
        q = query(
          collectionRef,
          where("date", "<=", endDate),
          orderBy("date", "desc"),
        );
      }
    }

    // 获取符合条件的所有文档进行统计
    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(entryFromDoc);

    const stats: EntryStats = {
      totalCount: entries.length,
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      byAccount: {},
      byTag: {},
    };

    for (const entry of entries) {
      for (const line of entry.lines) {
        // 累计账户金额
        stats.byAccount[line.accountId] =
          (stats.byAccount[line.accountId] || 0) + line.amount;

        // 收入/支出统计
        if (line.type === "credit") {
          stats.totalIncome += line.amount;
        } else {
          stats.totalExpense += line.amount;
        }
      }

      // 标签统计
      if (entry.tags) {
        for (const tag of entry.tags) {
          // 计算该标签涉及的金额
          const tagAmount = entry.lines.reduce(
            (sum, line) => sum + line.amount,
            0,
          );
          stats.byTag[tag] = (stats.byTag[tag] || 0) + tagAmount;
        }
      }
    }

    stats.balance = stats.totalIncome - stats.totalExpense;

    return stats;
  }

  watchEntries(
    userId: string,
    ledgerId: string,
    callback: (entries: JournalEntryData[]) => void,
  ): () => void {
    const db = getDB();
    const collectionRef = this.getCollectionRef(ledgerId);

    const q = query(
      collectionRef,
      orderBy("date", "desc"),
      limit(100),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(entryFromDoc);
      callback(entries);
    });

    return unsubscribe;
  }
}

// ============================================================================
// Repository 工厂
// ============================================================================

/**
 * Repository 工厂类
 */
export class FirestoreRepositoryFactory {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  getBookRepository(): IBookRepository {
    return new BookRepository(this.userId);
  }

  getLedgerRepository(): ILedgerRepository {
    return new LedgerRepository(this.userId);
  }

  getAccountRepository(): IAccountRepository {
    return new AccountRepository(this.userId);
  }

  getEntryRepository(): IEntryRepository {
    return new EntryRepository(this.userId);
  }
}

// 导出类型（用于测试）
export type { BookRepository, LedgerRepository, AccountRepository, EntryRepository };

// 注意：这些类本身不需要导出，通过工厂模式使用

// ============================================================================
// 用户偏好存储
// ============================================================================

/**
 * 获取用户偏好
 */
export async function getUserPreferences(
  userId: string,
): Promise<Record<string, string>> {
  const db = getDB();
  const docRef = doc(db, `users/${userId}/meta`, "preferences");

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Record<string, string>;
    }
    return {};
  } catch {
    console.error("Failed to get user preferences");
    return {};
  }
}

/**
 * 保存用户偏好
 */
export async function saveUserPreference(
  userId: string,
  key: string,
  value: string,
): Promise<void> {
  const db = getDB();
  const docRef = doc(db, `users/${userId}/meta`, "preferences");

  try {
    await setDoc(docRef, { [key]: value }, { merge: true });
  } catch {
    console.error("Failed to save user preference");
  }
}
