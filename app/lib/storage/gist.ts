/**
 * GitHub Gist 存储适配器
 * 通过 /api/sync 端点与 GitHub API 交互，而不是直接调用
 */

import type { StorageAdapter, GroupsData } from "./types";
import { DEFAULT_GROUPS_DATA } from "./types";

interface SyncResponse {
  data: GroupsData | null;
  updatedAt?: string;
  gistId: string | null;
  success?: boolean;
  error?: string;
}

export class GistStorageAdapter implements StorageAdapter {
  private gistId: string | null = null;

  constructor(gistId?: string) {
    this.gistId = gistId || null;
  }

  /**
   * 从 /api/sync 获取数据
   */
  async getGroupsData(): Promise<GroupsData> {
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

      // 如果没有数据，返回默认数据
      if (!result.data) {
        return DEFAULT_GROUPS_DATA;
      }

      return result.data;
    } catch (error) {
      console.error("Failed to get data from Gist:", error);
      return DEFAULT_GROUPS_DATA;
    }
  }

  /**
   * 保存数据到 /api/sync
   */
  async saveGroupsData(data: GroupsData): Promise<void> {
    try {
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
   * 查找或创建 Gist（通过保存数据自动完成）
   * 注意：GET 请求不会创建 Gist，只有 POST 请求才会创建
   */
  async findOrCreateGist(): Promise<string> {
    if (this.gistId) return this.gistId;

    // 先尝试获取数据，看是否已有 Gist
    try {
      await this.getGroupsData();
      if (this.gistId) {
        return this.gistId;
      }
    } catch {
      // 忽略错误，继续创建
    }

    // 如果没有 gistId，通过保存数据来创建新的 Gist
    // 这会触发 POST 请求，服务端会自动创建新的 Gist
    await this.saveGroupsData(DEFAULT_GROUPS_DATA);

    if (!this.gistId) {
      throw new Error("Failed to create or find Gist");
    }

    return this.gistId;
  }

  getGistId(): string | null {
    return this.gistId;
  }
}
