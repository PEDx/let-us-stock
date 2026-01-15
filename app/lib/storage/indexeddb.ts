/**
 * IndexedDB 存储适配器
 */

import type { GroupsStorageAdapter, BookStorageAdapter, GroupsData } from "./types";
import type { BookData } from "../double-entry/types";
import { DEFAULT_GROUPS_DATA } from "./types";

const DB_NAME = "let-us-stock";
const DB_VERSION = 3; // 升级版本以添加新 store
const GROUPS_STORE = "data";
const BOOK_STORE = "book";

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
      
      // 创建分组数据 store
      if (!db.objectStoreNames.contains(GROUPS_STORE)) {
        db.createObjectStore(GROUPS_STORE, { keyPath: "id" });
      }
      
      // 创建账簿数据 store
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        db.createObjectStore(BOOK_STORE, { keyPath: "id" });
      }
    };
  });
}

/**
 * IndexedDB 存储适配器
 * 支持分组数据和账簿数据
 */
export class IndexedDBAdapter implements GroupsStorageAdapter, BookStorageAdapter {
  // ============================================================================
  // 分组数据
  // ============================================================================

  async getGroupsData(): Promise<GroupsData> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(GROUPS_STORE, "readonly");
      const store = transaction.objectStore(GROUPS_STORE);
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
      const transaction = db.transaction(GROUPS_STORE, "readwrite");
      const store = transaction.objectStore(GROUPS_STORE);
      const request = store.put({ id: "groups-data", data });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============================================================================
  // 账簿数据
  // ============================================================================

  async getBookData(): Promise<BookData | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(BOOK_STORE, "readonly");
      const store = transaction.objectStore(BOOK_STORE);
      const request = store.get("book-data");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  }

  async saveBookData(data: BookData): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(BOOK_STORE, "readwrite");
      const store = transaction.objectStore(BOOK_STORE);
      const request = store.put({ id: "book-data", data });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============================================================================
  // 清除数据
  // ============================================================================

  async clearAllData(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GROUPS_STORE, BOOK_STORE], "readwrite");
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      transaction.objectStore(GROUPS_STORE).clear();
      transaction.objectStore(BOOK_STORE).clear();
    });
  }
}
