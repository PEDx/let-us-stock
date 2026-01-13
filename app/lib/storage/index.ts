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
  getGroupsData: () => syncStorage.getGroupsData(),
  saveGroupsData: (data: Parameters<SyncStorageAdapter["saveGroupsData"]>[0]) =>
    syncStorage.saveGroupsData(data),
  setRemote: () =>
    syncStorage.setRemote(),
  clearRemote: () => syncStorage.clearRemote(),
  forcePull: () => syncStorage.forcePull(),
  forcePush: () => syncStorage.forcePush(),
  isRemoteConnected: () => syncStorage.isRemoteConnected(),
  getGistId: () => syncStorage.getGistId(),
};
