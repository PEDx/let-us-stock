/**
 * GitHub Gist 存储适配器
 * 通过 /api/sync 端点与 GitHub API 交互
 * 注意：只同步 groups，不同步 activeGroupId
 */

import type { Group, RemoteGroupsData } from "./types";
import { DEFAULT_GROUPS_DATA } from "./types";

interface SyncResponse {
  data: RemoteGroupsData | null;
  updatedAt?: string;
  gistId: string | null;
  success?: boolean;
  error?: string;
}

/**
 * 远端存储适配器
 * 只负责同步 groups 数据，不包含 activeGroupId
 */
export class GistStorageAdapter {
  private gistId: string | null = null;

  constructor(gistId?: string) {
    this.gistId = gistId || null;
  }

  /**
   * 从 /api/sync 获取远端分组数据
   */
  async getGroups(): Promise<Group[]> {
    try {
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

      // 如果没有数据，返回默认 groups
      if (!result.data) {
        return DEFAULT_GROUPS_DATA.groups;
      }

      return result.data.groups;
    } catch (error) {
      console.error("Failed to get data from Gist:", error);
      return DEFAULT_GROUPS_DATA.groups;
    }
  }

  /**
   * 保存分组数据到 /api/sync
   * 只保存 groups，不保存 activeGroupId
   */
  async saveGroups(groups: Group[]): Promise<void> {
    try {
      const remoteData: RemoteGroupsData = { groups };

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: remoteData,
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
    } catch (error) {
      console.error("Failed to save data to Gist:", error);
      throw error;
    }
  }

  /**
   * 获取远程数据的更新时间
   */
  async getRemoteUpdatedAt(): Promise<string | null> {
    try {
      const response = await fetch("/api/sync");
      if (!response.ok) {
        return null;
      }

      const result: SyncResponse = await response.json();

      if (result.error || !result.data) {
        return null;
      }

      // 保存 gistId
      if (result.gistId) {
        this.gistId = result.gistId;
      }

      return result.updatedAt || null;
    } catch {
      return null;
    }
  }

  /**
   * 查找或创建 Gist
   */
  async findOrCreateGist(): Promise<string> {
    if (this.gistId) return this.gistId;

    // 先尝试获取数据，看是否已有 Gist
    try {
      await this.getGroups();
      if (this.gistId) {
        return this.gistId;
      }
    } catch {
      // 忽略错误，继续创建
    }

    // 如果没有 gistId，通过保存数据来创建新的 Gist
    await this.saveGroups(DEFAULT_GROUPS_DATA.groups);

    if (!this.gistId) {
      throw new Error("Failed to create or find Gist");
    }

    return this.gistId;
  }

  getGistId(): string | null {
    return this.gistId;
  }
}
