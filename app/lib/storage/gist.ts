/**
 * GitHub Gist 存储适配器
 */

import type { StorageAdapter, GroupsData } from "./types";
import { DEFAULT_GROUPS_DATA } from "./types";

const GIST_FILENAME = "let-us-stock-data.json";
const GIST_DESCRIPTION = "Let Us Stock - Data Storage (Do not delete)";

interface GistFile {
  filename: string;
  content: string;
}

interface Gist {
  id: string;
  description: string;
  files: Record<string, GistFile>;
  updated_at: string;
}

interface StoredData {
  version: number;
  updatedAt: string;
  data: GroupsData;
}

export class GistStorageAdapter implements StorageAdapter {
  private accessToken: string;
  private gistId: string | null = null;
  private cachedData: StoredData | null = null;

  constructor(accessToken: string, gistId?: string) {
    this.accessToken = accessToken;
    this.gistId = gistId || null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 查找或创建数据 Gist
   */
  async findOrCreateGist(): Promise<string> {
    if (this.gistId) return this.gistId;

    // 查找已存在的 Gist
    const gists = await this.request<Gist[]>("/gists?per_page=100");
    const existingGist = gists.find(
      (g) => g.description === GIST_DESCRIPTION && g.files[GIST_FILENAME],
    );

    if (existingGist) {
      this.gistId = existingGist.id;
      return this.gistId;
    }

    // 创建新 Gist
    const initialData: StoredData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      data: DEFAULT_GROUPS_DATA,
    };

    const newGist = await this.request<Gist>("/gists", {
      method: "POST",
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(initialData, null, 2),
          },
        },
      }),
    });

    this.gistId = newGist.id;
    return this.gistId;
  }

  async getGroupsData(): Promise<GroupsData> {
    try {
      const gistId = await this.findOrCreateGist();
      const gist = await this.request<Gist>(`/gists/${gistId}`);

      const file = gist.files[GIST_FILENAME];
      if (!file) {
        return DEFAULT_GROUPS_DATA;
      }

      const storedData: StoredData = JSON.parse(file.content);
      this.cachedData = storedData;

      return storedData.data;
    } catch (error) {
      console.error("Failed to get data from Gist:", error);
      return DEFAULT_GROUPS_DATA;
    }
  }

  async saveGroupsData(data: GroupsData): Promise<void> {
    try {
      const gistId = await this.findOrCreateGist();

      const storedData: StoredData = {
        version: 1,
        updatedAt: new Date().toISOString(),
        data,
      };

      await this.request(`/gists/${gistId}`, {
        method: "PATCH",
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(storedData, null, 2),
            },
          },
        }),
      });

      this.cachedData = storedData;
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
      const gistId = await this.findOrCreateGist();
      const gist = await this.request<Gist>(`/gists/${gistId}`);
      const file = gist.files[GIST_FILENAME];

      if (!file) return null;

      const storedData: StoredData = JSON.parse(file.content);
      return storedData.updatedAt;
    } catch {
      return null;
    }
  }

  getGistId(): string | null {
    return this.gistId;
  }
}
