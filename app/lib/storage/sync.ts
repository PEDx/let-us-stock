/**
 * 同步存储适配器
 * 结合本地存储和远程存储，实现 Last Write Wins 策略
 *
 * 支持两种数据类型：
 * - groups: 股票分组数据（activeGroupId 仅本地存储）
 * - book: 账簿数据（完整同步）
 */

import type { StorageAdapter, GroupsData, SyncMeta } from "./types";
import type { BookData } from "../double-entry/types";
import { IndexedDBAdapter } from "./indexeddb";
import { GistStorageAdapter } from "./gist";

const LOCAL_META_KEY = "sync-meta";
const BOOK_META_KEY = "book-sync-meta";

type SyncStatusListener = (isSyncing: boolean) => void;

/**
 * 同步存储适配器
 * - 未登录：只使用本地存储
 * - 已登录：本地 + 远程同步，LWW 策略
 */
export class SyncStorageAdapter implements StorageAdapter {
  private local: IndexedDBAdapter;
  private remote: GistStorageAdapter | null = null;
  private isSyncing = false;
  private syncListeners: Set<SyncStatusListener> = new Set();

  constructor() {
    this.local = new IndexedDBAdapter();
  }

  // ============================================================================
  // 同步状态
  // ============================================================================

  /**
   * 订阅同步状态变化
   */
  onSyncStatusChange(listener: SyncStatusListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * 通知所有监听器同步状态变化
   */
  private notifySyncStatus(isSyncing: boolean): void {
    this.isSyncing = isSyncing;
    this.syncListeners.forEach((listener) => listener(isSyncing));
  }

  /**
   * 设置远程存储（登录后调用）
   */
  setRemote(): void {
    if (this.remote) {
      return;
    }
    this.remote = new GistStorageAdapter();
  }

  /**
   * 清除远程存储（登出后调用）
   */
  clearRemote(): void {
    this.remote = null;
  }

  /**
   * 是否已连接远程存储
   */
  isRemoteConnected(): boolean {
    return this.remote !== null;
  }

  /**
   * 获取 Gist ID
   */
  getGistId(): string | null {
    return this.remote?.getGistId() || null;
  }

  // ============================================================================
  // 元数据管理
  // ============================================================================

  private getLocalMeta(key: string): SyncMeta | null {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveLocalMeta(key: string, meta: Partial<SyncMeta>): void {
    const existing = this.getLocalMeta(key) || {};
    localStorage.setItem(key, JSON.stringify({ ...existing, ...meta }));
  }

  // ============================================================================
  // 分组数据（Groups）
  // ============================================================================

  async getGroupsData(): Promise<GroupsData> {
    // 先获取本地数据（包含 activeGroupId）
    const localData = await this.local.getGroupsData();

    // 如果没有远程存储，直接返回本地数据
    if (!this.remote) {
      return localData;
    }

    // 有远程存储时，进行同步（仅同步 groups）
    try {
      const localMeta = this.getLocalMeta(LOCAL_META_KEY);
      const remoteUpdatedAt = await this.remote.getRemoteUpdatedAt();

      // 比较时间戳，决定使用哪个 groups 数据源
      if (remoteUpdatedAt && localMeta?.groupsUpdatedAt) {
        const remoteTime = new Date(remoteUpdatedAt).getTime();
        const localTime = new Date(localMeta.groupsUpdatedAt).getTime();

        if (remoteTime > localTime) {
          // 远程 groups 更新，使用远程 groups + 本地 activeGroupId
          const remoteGroups = await this.remote.getGroups();
          const mergedData = this.mergeGroupsData(remoteGroups, localData.activeGroupId);
          await this.local.saveGroupsData(mergedData);
          this.saveLocalMeta(LOCAL_META_KEY, {
            groupsUpdatedAt: remoteUpdatedAt,
            gistId: this.remote.getGistId() || undefined,
          });
          return mergedData;
        }
      } else if (remoteUpdatedAt && !localMeta?.groupsUpdatedAt) {
        // 本地没有元数据，使用远程 groups + 本地 activeGroupId
        const remoteGroups = await this.remote.getGroups();
        const mergedData = this.mergeGroupsData(remoteGroups, localData.activeGroupId);
        await this.local.saveGroupsData(mergedData);
        this.saveLocalMeta(LOCAL_META_KEY, {
          groupsUpdatedAt: remoteUpdatedAt,
          gistId: this.remote.getGistId() || undefined,
        });
        return mergedData;
      }

      // 本地 groups 更新或相同，使用本地数据
      return localData;
    } catch (error) {
      console.error("Sync read error, using local data:", error);
      return localData;
    }
  }

  /**
   * 合并远端 groups 和本地 activeGroupId
   */
  private mergeGroupsData(
    groups: GroupsData["groups"],
    localActiveGroupId: string,
  ): GroupsData {
    const activeGroupExists = groups.some((g) => g.id === localActiveGroupId);
    const activeGroupId = activeGroupExists
      ? localActiveGroupId
      : groups[0]?.id || "default";

    return { groups, activeGroupId };
  }

  async saveGroupsData(data: GroupsData): Promise<void> {
    const now = new Date().toISOString();

    // 保存完整数据到本地（包含 activeGroupId）
    await this.local.saveGroupsData(data);
    this.saveLocalMeta(LOCAL_META_KEY, {
      groupsUpdatedAt: now,
      gistId: this.remote?.getGistId() || undefined,
    });

    // 如果有远程存储，异步同步 groups 到远程（不包含 activeGroupId）
    if (this.remote && !this.isSyncing) {
      this.notifySyncStatus(true);
      this.remote
        .saveGroups(data.groups)
        .catch((error) => {
          console.error("Failed to sync groups to remote:", error);
        })
        .finally(() => {
          this.notifySyncStatus(false);
        });
    }
  }

  /**
   * 仅保存到本地，不触发远端同步
   */
  async saveLocalOnly(data: GroupsData): Promise<void> {
    await this.local.saveGroupsData(data);
  }

  /**
   * 仅从本地读取，不触发远端同步
   */
  async getLocalOnly(): Promise<GroupsData> {
    return this.local.getGroupsData();
  }

  /**
   * 强制从远程拉取 groups
   */
  async forcePullGroups(): Promise<GroupsData> {
    const localData = await this.local.getGroupsData();

    if (!this.remote) {
      return localData;
    }

    const remoteGroups = await this.remote.getGroups();
    const mergedData = this.mergeGroupsData(remoteGroups, localData.activeGroupId);
    await this.local.saveGroupsData(mergedData);

    const remoteUpdatedAt = await this.remote.getRemoteUpdatedAt();
    if (remoteUpdatedAt) {
      this.saveLocalMeta(LOCAL_META_KEY, {
        groupsUpdatedAt: remoteUpdatedAt,
        gistId: this.remote.getGistId() || undefined,
      });
    }

    return mergedData;
  }

  /**
   * 强制推送 groups 到远程
   */
  async forcePushGroups(): Promise<void> {
    if (!this.remote) return;

    const localData = await this.local.getGroupsData();
    await this.remote.saveGroups(localData.groups);

    const now = new Date().toISOString();
    this.saveLocalMeta(LOCAL_META_KEY, {
      groupsUpdatedAt: now,
      gistId: this.remote.getGistId() || undefined,
    });
  }

  // 兼容旧接口
  async forcePull(): Promise<GroupsData> {
    return this.forcePullGroups();
  }

  async forcePush(): Promise<void> {
    return this.forcePushGroups();
  }

  // ============================================================================
  // 账簿数据（Book）
  // ============================================================================

  async getBookData(): Promise<BookData | null> {
    // 先获取本地数据
    const localData = await this.local.getBookData();

    // 如果没有远程存储，直接返回本地数据
    if (!this.remote) {
      return localData;
    }

    // 有远程存储时，进行同步
    try {
      const localMeta = this.getLocalMeta(BOOK_META_KEY);
      const remoteUpdatedAt = await this.remote.getRemoteUpdatedAt();

      if (remoteUpdatedAt && localMeta?.bookUpdatedAt) {
        const remoteTime = new Date(remoteUpdatedAt).getTime();
        const localTime = new Date(localMeta.bookUpdatedAt).getTime();

        if (remoteTime > localTime) {
          // 远程数据更新，使用远程数据
          const remoteBook = await this.remote.getBook();
          if (remoteBook) {
            await this.local.saveBookData(remoteBook);
            this.saveLocalMeta(BOOK_META_KEY, {
              bookUpdatedAt: remoteUpdatedAt,
            });
            return remoteBook;
          }
        }
      } else if (remoteUpdatedAt && !localMeta?.bookUpdatedAt) {
        // 本地没有元数据，使用远程数据
        const remoteBook = await this.remote.getBook();
        if (remoteBook) {
          await this.local.saveBookData(remoteBook);
          this.saveLocalMeta(BOOK_META_KEY, {
            bookUpdatedAt: remoteUpdatedAt,
          });
          return remoteBook;
        }
      }

      return localData;
    } catch (error) {
      console.error("Book sync read error, using local data:", error);
      return localData;
    }
  }

  async saveBookData(data: BookData): Promise<void> {
    const now = new Date().toISOString();

    // 保存到本地
    await this.local.saveBookData(data);
    this.saveLocalMeta(BOOK_META_KEY, {
      bookUpdatedAt: now,
    });

    // 如果有远程存储，异步同步到远程
    if (this.remote && !this.isSyncing) {
      this.notifySyncStatus(true);
      this.remote
        .saveBook(data)
        .catch((error) => {
          console.error("Failed to sync book to remote:", error);
        })
        .finally(() => {
          this.notifySyncStatus(false);
        });
    }
  }

  /**
   * 仅保存账簿到本地
   */
  async saveBookLocalOnly(data: BookData): Promise<void> {
    await this.local.saveBookData(data);
  }

  /**
   * 仅从本地读取账簿
   */
  async getBookLocalOnly(): Promise<BookData | null> {
    return this.local.getBookData();
  }

  /**
   * 强制从远程拉取账簿
   */
  async forcePullBook(): Promise<BookData | null> {
    if (!this.remote) {
      return this.local.getBookData();
    }

    const remoteBook = await this.remote.getBook();
    if (remoteBook) {
      await this.local.saveBookData(remoteBook);
      const remoteUpdatedAt = await this.remote.getRemoteUpdatedAt();
      if (remoteUpdatedAt) {
        this.saveLocalMeta(BOOK_META_KEY, {
          bookUpdatedAt: remoteUpdatedAt,
        });
      }
    }

    return remoteBook;
  }

  /**
   * 强制推送账簿到远程
   */
  async forcePushBook(): Promise<void> {
    if (!this.remote) return;

    const localData = await this.local.getBookData();
    if (localData) {
      await this.remote.saveBook(localData);

      const now = new Date().toISOString();
      this.saveLocalMeta(BOOK_META_KEY, {
        bookUpdatedAt: now,
      });
    }
  }
}
