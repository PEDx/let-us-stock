/**
 * 同步存储适配器
 * 结合本地存储和远程存储，实现 Last Write Wins 策略
 */

import type { StorageAdapter, GroupsData } from "./types";
import { DEFAULT_GROUPS_DATA } from "./types";
import { IndexedDBAdapter } from "./indexeddb";
import { GistStorageAdapter } from "./gist";

const LOCAL_META_KEY = "sync-meta";

interface SyncMeta {
  updatedAt: string;
  gistId?: string;
}

/**
 * 同步存储适配器
 * - 未登录：只使用本地存储
 * - 已登录：本地 + 远程同步，LWW 策略
 */
export class SyncStorageAdapter implements StorageAdapter {
  private local: IndexedDBAdapter;
  private remote: GistStorageAdapter | null = null;
  private syncMeta: SyncMeta | null = null;
  private isSyncing = false;

  constructor() {
    this.local = new IndexedDBAdapter();
  }

  /**
   * 设置远程存储（登录后调用）
   */
  setRemote(accessToken: string, gistId?: string): void {
    this.remote = new GistStorageAdapter(accessToken, gistId);
  }

  /**
   * 清除远程存储（登出后调用）
   */
  clearRemote(): void {
    this.remote = null;
  }

  /**
   * 获取本地同步元数据
   */
  private async getLocalMeta(): Promise<SyncMeta | null> {
    try {
      const stored = localStorage.getItem(LOCAL_META_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * 保存本地同步元数据
   */
  private async saveLocalMeta(meta: SyncMeta): Promise<void> {
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
    this.syncMeta = meta;
  }

  async getGroupsData(): Promise<GroupsData> {
    // 先获取本地数据
    const localData = await this.local.getGroupsData();

    // 如果没有远程存储，直接返回本地数据
    if (!this.remote) {
      return localData;
    }

    // 有远程存储时，进行同步
    try {
      const localMeta = await this.getLocalMeta();
      const remoteUpdatedAt = await this.remote.getRemoteUpdatedAt();

      // 比较时间戳，决定使用哪个数据源
      if (remoteUpdatedAt && localMeta?.updatedAt) {
        const remoteTime = new Date(remoteUpdatedAt).getTime();
        const localTime = new Date(localMeta.updatedAt).getTime();

        if (remoteTime > localTime) {
          // 远程数据更新，使用远程数据并同步到本地
          const remoteData = await this.remote.getGroupsData();
          await this.local.saveGroupsData(remoteData);
          await this.saveLocalMeta({
            updatedAt: remoteUpdatedAt,
            gistId: this.remote.getGistId() || undefined,
          });
          return remoteData;
        }
      } else if (remoteUpdatedAt && !localMeta?.updatedAt) {
        // 本地没有元数据，使用远程数据
        const remoteData = await this.remote.getGroupsData();
        await this.local.saveGroupsData(remoteData);
        await this.saveLocalMeta({
          updatedAt: remoteUpdatedAt,
          gistId: this.remote.getGistId() || undefined,
        });
        return remoteData;
      }

      // 本地数据更新或相同，使用本地数据
      return localData;
    } catch (error) {
      console.error("Sync read error, using local data:", error);
      return localData;
    }
  }

  async saveGroupsData(data: GroupsData): Promise<void> {
    const now = new Date().toISOString();

    // 保存到本地
    await this.local.saveGroupsData(data);
    await this.saveLocalMeta({
      updatedAt: now,
      gistId: this.remote?.getGistId() || undefined,
    });

    // 如果有远程存储，异步同步到远程
    if (this.remote && !this.isSyncing) {
      this.isSyncing = true;
      this.remote
        .saveGroupsData(data)
        .catch((error) => {
          console.error("Failed to sync to remote:", error);
        })
        .finally(() => {
          this.isSyncing = false;
        });
    }
  }

  /**
   * 强制同步（从远程拉取最新数据）
   */
  async forcePull(): Promise<GroupsData> {
    if (!this.remote) {
      return this.local.getGroupsData();
    }

    const remoteData = await this.remote.getGroupsData();
    await this.local.saveGroupsData(remoteData);

    const remoteUpdatedAt = await this.remote.getRemoteUpdatedAt();
    if (remoteUpdatedAt) {
      await this.saveLocalMeta({
        updatedAt: remoteUpdatedAt,
        gistId: this.remote.getGistId() || undefined,
      });
    }

    return remoteData;
  }

  /**
   * 强制推送（将本地数据推送到远程）
   */
  async forcePush(): Promise<void> {
    if (!this.remote) return;

    const localData = await this.local.getGroupsData();
    await this.remote.saveGroupsData(localData);

    const now = new Date().toISOString();
    await this.saveLocalMeta({
      updatedAt: now,
      gistId: this.remote.getGistId() || undefined,
    });
  }

  /**
   * 获取 Gist ID
   */
  getGistId(): string | null {
    return this.remote?.getGistId() || null;
  }

  /**
   * 是否已连接远程存储
   */
  isRemoteConnected(): boolean {
    return this.remote !== null;
  }
}
