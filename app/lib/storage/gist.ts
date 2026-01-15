/**
 * GitHub Gist 存储适配器
 * 通过 /api/sync 端点与 GitHub API 交互
 *
 * 数据分开存储到两个不同的 Gist：
 * - groups: 股票分组数据 -> let-us-stock-groups.json
 * - book: 账簿数据 -> let-us-stock-book.json
 */

import type { Group, RemoteGroupsData } from "./types";
import type { BookData } from "../double-entry/types";
import { DEFAULT_GROUPS_DATA } from "./types";

type DataType = "groups" | "book";

interface SyncResponse<T = unknown> {
  data: T | null;
  updatedAt?: string;
  gistId: string | null;
  success?: boolean;
  error?: string;
  migrated?: boolean;
}

/**
 * 远端存储适配器
 * 分别管理 groups 和 book 数据的远端同步
 */
export class GistStorageAdapter {
  private groupsGistId: string | null = null;
  private bookGistId: string | null = null;

  // 缓存
  private groupsCache: { data: RemoteGroupsData | null; updatedAt: string | null } = {
    data: null,
    updatedAt: null,
  };
  private bookCache: { data: BookData | null; updatedAt: string | null } = {
    data: null,
    updatedAt: null,
  };

  // ============================================================================
  // 通用方法
  // ============================================================================

  /**
   * 获取远端数据
   */
  private async fetchRemoteData<T>(type: DataType): Promise<SyncResponse<T>> {
    const response = await fetch(`/api/sync?type=${type}`);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Not authenticated");
      }
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const result: SyncResponse<T> = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // 保存 gistId
    if (result.gistId) {
      if (type === "groups") {
        this.groupsGistId = result.gistId;
      } else {
        this.bookGistId = result.gistId;
      }
    }

    return result;
  }

  /**
   * 保存数据到远端
   */
  private async saveRemoteData<T>(type: DataType, data: T): Promise<SyncResponse<T>> {
    const gistId = type === "groups" ? this.groupsGistId : this.bookGistId;

    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        data,
        gistId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Not authenticated");
      }
      throw new Error(`Failed to save: ${response.status}`);
    }

    const result: SyncResponse<T> = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // 更新 gistId（如果是新创建的）
    if (result.gistId) {
      if (type === "groups") {
        this.groupsGistId = result.gistId;
      } else {
        this.bookGistId = result.gistId;
      }
    }

    return result;
  }

  // ============================================================================
  // 分组数据
  // ============================================================================

  /**
   * 获取远端分组数据的更新时间
   */
  async getGroupsUpdatedAt(): Promise<string | null> {
    try {
      const result = await this.fetchRemoteData<RemoteGroupsData>("groups");
      this.groupsCache = {
        data: result.data,
        updatedAt: result.updatedAt || null,
      };
      return result.updatedAt || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取远端分组数据
   */
  async getGroups(): Promise<Group[]> {
    try {
      const result = await this.fetchRemoteData<RemoteGroupsData>("groups");

      this.groupsCache = {
        data: result.data,
        updatedAt: result.updatedAt || null,
      };

      if (!result.data?.groups) {
        return DEFAULT_GROUPS_DATA.groups;
      }

      return result.data.groups;
    } catch (error) {
      console.error("Failed to get groups from Gist:", error);
      return DEFAULT_GROUPS_DATA.groups;
    }
  }

  /**
   * 保存分组数据到远端
   */
  async saveGroups(groups: Group[]): Promise<void> {
    try {
      const data: RemoteGroupsData = { groups };
      const result = await this.saveRemoteData("groups", data);

      this.groupsCache = {
        data,
        updatedAt: result.updatedAt || null,
      };
    } catch (error) {
      console.error("Failed to save groups to Gist:", error);
      throw error;
    }
  }

  getGroupsGistId(): string | null {
    return this.groupsGistId;
  }

  // ============================================================================
  // 账簿数据
  // ============================================================================

  /**
   * 获取远端账簿数据的更新时间
   */
  async getBookUpdatedAt(): Promise<string | null> {
    try {
      const result = await this.fetchRemoteData<BookData>("book");
      this.bookCache = {
        data: result.data,
        updatedAt: result.updatedAt || null,
      };
      return result.updatedAt || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取远端账簿数据
   */
  async getBook(): Promise<BookData | null> {
    try {
      const result = await this.fetchRemoteData<BookData>("book");

      this.bookCache = {
        data: result.data,
        updatedAt: result.updatedAt || null,
      };

      return result.data;
    } catch (error) {
      console.error("Failed to get book from Gist:", error);
      return null;
    }
  }

  /**
   * 保存账簿数据到远端
   */
  async saveBook(book: BookData): Promise<void> {
    try {
      const result = await this.saveRemoteData("book", book);

      this.bookCache = {
        data: book,
        updatedAt: result.updatedAt || null,
      };
    } catch (error) {
      console.error("Failed to save book to Gist:", error);
      throw error;
    }
  }

  getBookGistId(): string | null {
    return this.bookGistId;
  }

  // ============================================================================
  // 兼容旧接口
  // ============================================================================

  /**
   * 获取远程数据的更新时间（兼容旧接口，返回较新的时间戳）
   */
  async getRemoteUpdatedAt(): Promise<string | null> {
    try {
      const [groupsUpdatedAt, bookUpdatedAt] = await Promise.all([
        this.getGroupsUpdatedAt(),
        this.getBookUpdatedAt(),
      ]);

      if (!groupsUpdatedAt && !bookUpdatedAt) return null;
      if (!groupsUpdatedAt) return bookUpdatedAt;
      if (!bookUpdatedAt) return groupsUpdatedAt;

      return groupsUpdatedAt > bookUpdatedAt ? groupsUpdatedAt : bookUpdatedAt;
    } catch {
      return null;
    }
  }

  /**
   * 查找或创建 Groups Gist
   */
  async findOrCreateGroupsGist(): Promise<string> {
    if (this.groupsGistId) return this.groupsGistId;

    // 先尝试获取数据，看是否已有 Gist
    try {
      await this.fetchRemoteData<RemoteGroupsData>("groups");
      if (this.groupsGistId) {
        return this.groupsGistId;
      }
    } catch {
      // 忽略错误，继续创建
    }

    // 如果没有 gistId，通过保存数据来创建新的 Gist
    await this.saveRemoteData("groups", { groups: DEFAULT_GROUPS_DATA.groups });

    if (!this.groupsGistId) {
      throw new Error("Failed to create or find Groups Gist");
    }

    return this.groupsGistId;
  }

  /**
   * 兼容旧接口
   * @deprecated Use findOrCreateGroupsGist instead
   */
  async findOrCreateGist(): Promise<string> {
    return this.findOrCreateGroupsGist();
  }

  /**
   * 兼容旧接口
   * @deprecated Use getGroupsGistId or getBookGistId instead
   */
  getGistId(): string | null {
    return this.groupsGistId;
  }
}
