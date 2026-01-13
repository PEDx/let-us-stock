/**
 * 存储层入口
 *
 * 使用方法：
 * import { storage } from "~/lib/storage";
 * const data = await storage.getGroupsData();
 *
 * 切换存储实现：
 * import { setStorage, IndexedDBAdapter } from "~/lib/storage";
 * setStorage(new IndexedDBAdapter());
 */

export * from "./types";
export { IndexedDBAdapter } from "./indexeddb";

import type { StorageAdapter } from "./types";
import { IndexedDBAdapter } from "./indexeddb";

// 默认使用 IndexedDB
let currentStorage: StorageAdapter = new IndexedDBAdapter();

/**
 * 获取当前存储实例
 */
export function getStorage(): StorageAdapter {
  return currentStorage;
}

/**
 * 设置存储实现
 * @param adapter 新的存储适配器
 */
export function setStorage(adapter: StorageAdapter): void {
  currentStorage = adapter;
}

/**
 * 默认存储实例（便捷导出）
 */
export const storage = {
  get current() {
    return currentStorage;
  },
  getGroupsData: () => currentStorage.getGroupsData(),
  saveGroupsData: (data: Parameters<StorageAdapter["saveGroupsData"]>[0]) =>
    currentStorage.saveGroupsData(data),
};
