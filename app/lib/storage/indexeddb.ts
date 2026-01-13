/**
 * IndexedDB 存储适配器
 */

import type { StorageAdapter, GroupsData } from "./types";
import { DEFAULT_GROUPS_DATA } from "./types";

const DB_NAME = "let-us-stock";
const DB_VERSION = 2;
const STORE_NAME = "data";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // 删除旧的 store
      if (db.objectStoreNames.contains("symbols")) {
        db.deleteObjectStore("symbols");
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export class IndexedDBAdapter implements StorageAdapter {
  async getGroupsData(): Promise<GroupsData> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get("groups-data");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data && result.data.groups?.length > 0) {
          resolve(result.data);
        } else {
          // 返回默认值并保存
          this.saveGroupsData(DEFAULT_GROUPS_DATA);
          resolve(DEFAULT_GROUPS_DATA);
        }
      };
    });
  }

  async saveGroupsData(data: GroupsData): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: "groups-data", data });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
