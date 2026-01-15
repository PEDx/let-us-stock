/**
 * 存储层接口定义
 */

import type { BookData } from "../double-entry/types";

// ============================================================================
// 股票分组数据
// ============================================================================

export interface Group {
  id: string;
  name: string;
  symbols: string[];
}

export interface GroupsData {
  groups: Group[];
  activeGroupId: string;
}

/**
 * 远端同步的分组数据结构（不包含 activeGroupId）
 */
export interface RemoteGroupsData {
  groups: Group[];
}

/**
 * 默认股票列表
 */
export const DEFAULT_SYMBOLS = [
  "AAPL",
  "TSLA",
  "GOOG",
  "MSFT",
  "NVDA",
  "META",
  "AMZN",
  "NFLX",
  "QQQ",
  "BTC-USD",
];

/**
 * 默认分组数据
 */
export const DEFAULT_GROUPS_DATA: GroupsData = {
  groups: [{ id: "default", name: "default", symbols: DEFAULT_SYMBOLS }],
  activeGroupId: "default",
};

// ============================================================================
// 账簿数据
// ============================================================================

/**
 * 远端同步的账簿数据（与 BookData 相同）
 */
export type RemoteBookData = BookData;

// ============================================================================
// 存储适配器接口
// ============================================================================

/**
 * 分组数据存储适配器
 */
export interface GroupsStorageAdapter {
  /** 获取分组数据 */
  getGroupsData(): Promise<GroupsData>;
  /** 保存分组数据 */
  saveGroupsData(data: GroupsData): Promise<void>;
}

/**
 * 账簿数据存储适配器
 */
export interface BookStorageAdapter {
  /** 获取账簿数据 */
  getBookData(): Promise<BookData | null>;
  /** 保存账簿数据 */
  saveBookData(data: BookData): Promise<void>;
}

/**
 * 完整存储适配器（兼容旧接口）
 */
export interface StorageAdapter extends GroupsStorageAdapter {}

// ============================================================================
// 同步元数据
// ============================================================================

/**
 * 同步元数据
 */
export interface SyncMeta {
  /** 分组数据更新时间 */
  groupsUpdatedAt?: string;
  /** 账簿数据更新时间 */
  bookUpdatedAt?: string;
  /** Gist ID */
  gistId?: string;
}

/**
 * 远端同步数据结构
 */
export interface RemoteSyncData {
  /** 分组数据 */
  groups?: RemoteGroupsData;
  /** 账簿数据 */
  book?: BookData;
}
