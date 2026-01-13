/**
 * 存储层入口
 *
 * 使用方法：
 * import { storage } from "~/lib/storage";
 * const data = await storage.getGroupsData();
 *
 * 登录后启用同步：
 * import { storage } from "~/lib/storage";
 * storage.setRemote(accessToken);
 */

export * from "./types";
export { IndexedDBAdapter } from "./indexeddb";
export { GistStorageAdapter } from "./gist";
export { SyncStorageAdapter } from "./sync";

import { SyncStorageAdapter } from "./sync";

// 使用同步存储适配器
const syncStorage = new SyncStorageAdapter();

/**
 * 默认存储实例
 */
export const storage = {
  /** 获取数据（会触发远端同步检查） */
  getGroupsData: () => syncStorage.getGroupsData(),
  /** 保存数据（会触发远端同步） */
  saveGroupsData: (data: Parameters<SyncStorageAdapter["saveGroupsData"]>[0]) =>
    syncStorage.saveGroupsData(data),
  /** 仅从本地读取，不触发远端同步 */
  getLocalOnly: () => syncStorage.getLocalOnly(),
  /** 仅保存到本地，不触发远端同步 */
  saveLocalOnly: (data: Parameters<SyncStorageAdapter["saveLocalOnly"]>[0]) =>
    syncStorage.saveLocalOnly(data),
  setRemote: () => syncStorage.setRemote(),
  clearRemote: () => syncStorage.clearRemote(),
  forcePull: () => syncStorage.forcePull(),
  forcePush: () => syncStorage.forcePush(),
  isRemoteConnected: () => syncStorage.isRemoteConnected(),
  getGistId: () => syncStorage.getGistId(),
  /** 订阅同步状态变化，返回取消订阅函数 */
  onSyncStatusChange: (listener: (isSyncing: boolean) => void) =>
    syncStorage.onSyncStatusChange(listener),
};
