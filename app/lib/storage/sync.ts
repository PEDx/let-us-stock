/**
 * 同步存储适配器
 * 结合本地存储和远程存储，实现 Last Write Wins 策略
 *
 * 同步策略：
 * - groups: 本地 + 远程同步
 * - activeGroupId: 仅本地存储，不同步到远端
 */

import type { StorageAdapter, GroupsData } from "./types";
import { IndexedDBAdapter } from "./indexeddb";
import { GistStorageAdapter } from "./gist";

const LOCAL_META_KEY = "sync-meta";

interface SyncMeta {
  updatedAt: string;
  gistId?: string;
}

type SyncStatusListener = (isSyncing: boolean) => void;

/**
 * 同步存储适配器
 * - 未登录：只使用本地存储
 * - 已登录：本地 + 远程同步，LWW 策略（仅同步 groups）
 */
export class SyncStorageAdapter implements StorageAdapter {
  private local: IndexedDBAdapter;
  private remote: GistStorageAdapter | null = null;
  private syncMeta: SyncMeta | null = null;
  private isSyncing = false;
  private syncListeners: Set<SyncStatusListener> = new Set();

  constructor() {
    this.local = new IndexedDBAdapter();
  }

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
    // 先获取本地数据（包含 activeGroupId）
    const localData = await this.local.getGroupsData();

    // 如果没有远程存储，直接返回本地数据
    if (!this.remote) {
      return localData;
    }

    // 有远程存储时，进行同步（仅同步 groups）
    try {
      const localMeta = await this.getLocalMeta();
      const remoteUpdatedAt = await this.remote.getRemoteUpdatedAt();

      // 比较时间戳，决定使用哪个 groups 数据源
      if (remoteUpdatedAt && localMeta?.updatedAt) {
        const remoteTime = new Date(remoteUpdatedAt).getTime();
        const localTime = new Date(localMeta.updatedAt).getTime();

        if (remoteTime > localTime) {
          // 远程 groups 更新，使用远程 groups + 本地 activeGroupId
          const remoteGroups = await this.remote.getGroups();
          const mergedData = this.mergeData(remoteGroups, localData.activeGroupId);
          await this.local.saveGroupsData(mergedData);
          await this.saveLocalMeta({
            updatedAt: remoteUpdatedAt,
            gistId: this.remote.getGistId() || undefined,
          });
          return mergedData;
        }
      } else if (remoteUpdatedAt && !localMeta?.updatedAt) {
        // 本地没有元数据，使用远程 groups + 本地 activeGroupId
        const remoteGroups = await this.remote.getGroups();
        const mergedData = this.mergeData(remoteGroups, localData.activeGroupId);
        await this.local.saveGroupsData(mergedData);
        await this.saveLocalMeta({
          updatedAt: remoteUpdatedAt,
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
   * 如果本地 activeGroupId 在远端 groups 中不存在，则使用第一个 group
   */
  private mergeData(
    groups: GroupsData["groups"],
    localActiveGroupId: string,
  ): GroupsData {
    // 确保 activeGroupId 在 groups 中存在
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
    await this.saveLocalMeta({
      updatedAt: now,
      gistId: this.remote?.getGistId() || undefined,
    });

    // 如果有远程存储，异步同步 groups 到远程（不包含 activeGroupId）
    if (this.remote && !this.isSyncing) {
      this.notifySyncStatus(true);
      this.remote
        .saveGroups(data.groups)
        .catch((error) => {
          console.error("Failed to sync to remote:", error);
        })
        .finally(() => {
          this.notifySyncStatus(false);
        });
    }
  }

  /**
   * 仅保存到本地，不触发远端同步
   * 用于只修改 activeGroupId 等本地字段的场景
   */
  async saveLocalOnly(data: GroupsData): Promise<void> {
    await this.local.saveGroupsData(data);
  }

  /**
   * 仅从本地读取，不触发远端同步
   * 用于切换 tab 等不需要同步的场景
   */
  async getLocalOnly(): Promise<GroupsData> {
    return this.local.getGroupsData();
  }

  /**
   * 强制同步（从远程拉取最新 groups）
   */
  async forcePull(): Promise<GroupsData> {
    // 获取本地数据以保留 activeGroupId
    const localData = await this.local.getGroupsData();

    if (!this.remote) {
      return localData;
    }

    const remoteGroups = await this.remote.getGroups();
    const mergedData = this.mergeData(remoteGroups, localData.activeGroupId);
    await this.local.saveGroupsData(mergedData);

    const remoteUpdatedAt = await this.remote.getRemoteUpdatedAt();
    if (remoteUpdatedAt) {
      await this.saveLocalMeta({
        updatedAt: remoteUpdatedAt,
        gistId: this.remote.getGistId() || undefined,
      });
    }

    return mergedData;
  }

  /**
   * 强制推送（将本地 groups 推送到远程）
   */
  async forcePush(): Promise<void> {
    if (!this.remote) return;

    const localData = await this.local.getGroupsData();
    // 只推送 groups，不推送 activeGroupId
    await this.remote.saveGroups(localData.groups);

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
