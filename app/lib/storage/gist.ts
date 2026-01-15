/**
 * GitHub Gist 存储适配器
 * 通过 /api/sync 端点与 GitHub API 交互
 *
 * 支持两种数据类型：
 * - groups: 股票分组数据
 * - book: 账簿数据
 */

import type { Group, RemoteGroupsData, RemoteSyncData } from "./types";
import type { BookData } from "../double-entry/types";
import { DEFAULT_GROUPS_DATA } from "./types";

interface SyncResponse {
  data: RemoteSyncData | null;
  updatedAt?: string;
  gistId: string | null;
  success?: boolean;
  error?: string;
}

/**
 * 远端存储适配器
 * 统一管理 groups 和 book 数据的远端同步
 */
export class GistStorageAdapter {
  private gistId: string | null = null;
  private cachedData: RemoteSyncData | null = null;
  private cachedUpdatedAt: string | null = null;

  constructor(gistId?: string) {
    this.gistId = gistId || null;
  }

  // ============================================================================
  // 通用方法
  // ============================================================================

  /**
   * 获取远端全部数据
   */
  private async fetchRemoteData(): Promise<SyncResponse> {
    const response = await fetch("/api/sync");
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Not authenticated");
      }
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const result: SyncResponse = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // 保存 gistId
    if (result.gistId) {
      this.gistId = result.gistId;
    }

    // 缓存数据
    this.cachedData = result.data;
    this.cachedUpdatedAt = result.updatedAt || null;

    return result;
  }

  /**
   * 保存数据到远端
   */
  private async saveRemoteData(data: RemoteSyncData): Promise<void> {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
        gistId: this.gistId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Not authenticated");
      }
      throw new Error(`Failed to save: ${response.status}`);
    }

    const result: SyncResponse = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // 更新 gistId（如果是新创建的）
    if (result.gistId) {
      this.gistId = result.gistId;
    }

    // 更新缓存
    this.cachedData = data;
    this.cachedUpdatedAt = result.updatedAt || null;
  }

  /**
   * 获取远程数据的更新时间
   */
  async getRemoteUpdatedAt(): Promise<string | null> {
    try {
      const result = await this.fetchRemoteData();
      return result.updatedAt || null;
    } catch {
      return null;
    }
  }

  getGistId(): string | null {
    return this.gistId;
  }

  // ============================================================================
  // 分组数据
  // ============================================================================

  /**
   * 获取远端分组数据
   */
  async getGroups(): Promise<Group[]> {
    try {
      const result = await this.fetchRemoteData();

      if (!result.data?.groups) {
        return DEFAULT_GROUPS_DATA.groups;
      }

      return result.data.groups.groups;
    } catch (error) {
      console.error("Failed to get groups from Gist:", error);
      return DEFAULT_GROUPS_DATA.groups;
    }
  }

  /**
   * 保存分组数据到远端
   * 保留其他数据（book）不变
   */
  async saveGroups(groups: Group[]): Promise<void> {
    try {
      // 获取当前远端数据
      let currentData: RemoteSyncData = {};
      try {
        const result = await this.fetchRemoteData();
        currentData = result.data || {};
      } catch {
        // 忽略错误，使用空数据
      }

      // 更新 groups，保留 book
      const newData: RemoteSyncData = {
        ...currentData,
        groups: { groups },
      };

      await this.saveRemoteData(newData);
    } catch (error) {
      console.error("Failed to save groups to Gist:", error);
      throw error;
    }
  }

  // ============================================================================
  // 账簿数据
  // ============================================================================

  /**
   * 获取远端账簿数据
   */
  async getBook(): Promise<BookData | null> {
    try {
      const result = await this.fetchRemoteData();
      return result.data?.book || null;
    } catch (error) {
      console.error("Failed to get book from Gist:", error);
      return null;
    }
  }

  /**
   * 保存账簿数据到远端
   * 保留其他数据（groups）不变
   */
  async saveBook(book: BookData): Promise<void> {
    try {
      // 获取当前远端数据
      let currentData: RemoteSyncData = {};
      try {
        const result = await this.fetchRemoteData();
        currentData = result.data || {};
      } catch {
        // 忽略错误，使用空数据
      }

      // 更新 book，保留 groups
      const newData: RemoteSyncData = {
        ...currentData,
        book,
      };

      await this.saveRemoteData(newData);
    } catch (error) {
      console.error("Failed to save book to Gist:", error);
      throw error;
    }
  }

  // ============================================================================
  // 批量操作
  // ============================================================================

  /**
   * 获取全部数据
   */
  async getAllData(): Promise<RemoteSyncData | null> {
    try {
      const result = await this.fetchRemoteData();
      return result.data;
    } catch (error) {
      console.error("Failed to get all data from Gist:", error);
      return null;
    }
  }

  /**
   * 保存全部数据
   */
  async saveAllData(data: RemoteSyncData): Promise<void> {
    try {
      await this.saveRemoteData(data);
    } catch (error) {
      console.error("Failed to save all data to Gist:", error);
      throw error;
    }
  }

  /**
   * 查找或创建 Gist
   */
  async findOrCreateGist(): Promise<string> {
    if (this.gistId) return this.gistId;

    // 先尝试获取数据，看是否已有 Gist
    try {
      await this.fetchRemoteData();
      if (this.gistId) {
        return this.gistId;
      }
    } catch {
      // 忽略错误，继续创建
    }

    // 如果没有 gistId，通过保存数据来创建新的 Gist
    await this.saveRemoteData({
      groups: { groups: DEFAULT_GROUPS_DATA.groups },
    });

    if (!this.gistId) {
      throw new Error("Failed to create or find Gist");
    }

    return this.gistId;
  }
}
