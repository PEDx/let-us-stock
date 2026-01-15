/**
 * 存储层入口
 *
 * 使用方法：
 * import { storage } from "~/lib/storage";
 *
 * // 股票分组数据
 * const data = await storage.getGroupsData();
 *
 * // 账簿数据
 * const book = await storage.getBookData();
 *
 * 登录后启用同步：
 * import { storage } from "~/lib/storage";
 * storage.setRemote();
 */

export * from "./types";
export { IndexedDBAdapter } from "./indexeddb";
export { GistStorageAdapter } from "./gist";
export { SyncStorageAdapter } from "./sync";

import { SyncStorageAdapter } from "./sync";
import type { BookData } from "../double-entry/types";

// 使用同步存储适配器
const syncStorage = new SyncStorageAdapter();

/**
 * 默认存储实例
 */
export const storage = {
  // ============================================================================
  // 股票分组数据
  // ============================================================================

  /** 获取分组数据（会触发远端同步检查） */
  getGroupsData: () => syncStorage.getGroupsData(),
  /** 保存分组数据（会触发远端同步） */
  saveGroupsData: (data: Parameters<SyncStorageAdapter["saveGroupsData"]>[0]) =>
    syncStorage.saveGroupsData(data),
  /** 仅从本地读取分组，不触发远端同步 */
  getLocalOnly: () => syncStorage.getLocalOnly(),
  /** 仅保存分组到本地，不触发远端同步 */
  saveLocalOnly: (data: Parameters<SyncStorageAdapter["saveLocalOnly"]>[0]) =>
    syncStorage.saveLocalOnly(data),
  /** 强制从远端拉取分组 */
  forcePullGroups: () => syncStorage.forcePullGroups(),
  /** 强制推送分组到远端 */
  forcePushGroups: () => syncStorage.forcePushGroups(),

  // 兼容旧接口
  forcePull: () => syncStorage.forcePull(),
  forcePush: () => syncStorage.forcePush(),

  // ============================================================================
  // 账簿数据
  // ============================================================================

  /** 获取账簿数据（会触发远端同步检查） */
  getBookData: () => syncStorage.getBookData(),
  /** 保存账簿数据（会触发远端同步） */
  saveBookData: (data: BookData) => syncStorage.saveBookData(data),
  /** 仅从本地读取账簿 */
  getBookLocalOnly: () => syncStorage.getBookLocalOnly(),
  /** 仅保存账簿到本地 */
  saveBookLocalOnly: (data: BookData) => syncStorage.saveBookLocalOnly(data),
  /** 强制从远端拉取账簿 */
  forcePullBook: () => syncStorage.forcePullBook(),
  /** 强制推送账簿到远端 */
  forcePushBook: () => syncStorage.forcePushBook(),

  // ============================================================================
  // 通用方法
  // ============================================================================

  /** 设置远程存储（登录后调用） */
  setRemote: () => syncStorage.setRemote(),
  /** 清除远程存储（登出后调用） */
  clearRemote: () => syncStorage.clearRemote(),
  /** 是否已连接远程存储 */
  isRemoteConnected: () => syncStorage.isRemoteConnected(),
  /** 获取 Gist ID */
  getGistId: () => syncStorage.getGistId(),
  /** 订阅同步状态变化，返回取消订阅函数 */
  onSyncStatusChange: (listener: (isSyncing: boolean) => void) =>
    syncStorage.onSyncStatusChange(listener),
};
