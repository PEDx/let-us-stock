/**
 * 使用 IndexedDB 存储用户的股票列表和分组
 */

const DB_NAME = "let-us-stock";
const DB_VERSION = 2;
const STORE_NAME = "data";

// 默认股票列表
const DEFAULT_SYMBOLS = [
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

export interface Group {
  id: string;
  name: string;
  symbols: string[];
}

export interface GroupsData {
  groups: Group[];
  activeGroupId: string;
}

const DEFAULT_GROUPS_DATA: GroupsData = {
  groups: [{ id: "default", name: "default", symbols: DEFAULT_SYMBOLS }],
  activeGroupId: "default",
};

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

// ============ Groups API ============

export async function getGroupsData(): Promise<GroupsData> {
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
        saveGroupsData(DEFAULT_GROUPS_DATA);
        resolve(DEFAULT_GROUPS_DATA);
      }
    };
  });
}

export async function saveGroupsData(data: GroupsData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id: "groups-data", data });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function addGroup(name: string): Promise<GroupsData> {
  const data = await getGroupsData();
  const newGroup: Group = {
    id: `group-${Date.now()}`,
    name,
    symbols: [],
  };
  data.groups.push(newGroup);
  data.activeGroupId = newGroup.id;
  await saveGroupsData(data);
  return data;
}

export async function removeGroup(groupId: string): Promise<GroupsData> {
  const data = await getGroupsData();
  // 不能删除最后一个分组
  if (data.groups.length <= 1) {
    return data;
  }
  const index = data.groups.findIndex((g) => g.id === groupId);
  if (index !== -1) {
    data.groups.splice(index, 1);
    // 如果删除的是当前激活的分组，切换到第一个
    if (data.activeGroupId === groupId) {
      data.activeGroupId = data.groups[0].id;
    }
  }
  await saveGroupsData(data);
  return data;
}

export async function renameGroup(
  groupId: string,
  newName: string,
): Promise<GroupsData> {
  const data = await getGroupsData();
  const group = data.groups.find((g) => g.id === groupId);
  if (group) {
    group.name = newName;
    await saveGroupsData(data);
  }
  return data;
}

export async function reorderGroups(newOrder: string[]): Promise<GroupsData> {
  const data = await getGroupsData();
  const groupsMap = new Map(data.groups.map((g) => [g.id, g]));
  data.groups = newOrder.map((id) => groupsMap.get(id)!).filter(Boolean);
  await saveGroupsData(data);
  return data;
}

export async function setActiveGroup(groupId: string): Promise<GroupsData> {
  const data = await getGroupsData();
  if (data.groups.some((g) => g.id === groupId)) {
    data.activeGroupId = groupId;
    await saveGroupsData(data);
  }
  return data;
}

// ============ Symbols in Group API ============

export async function addSymbolToGroup(
  groupId: string,
  symbol: string,
): Promise<GroupsData> {
  const data = await getGroupsData();
  const group = data.groups.find((g) => g.id === groupId);
  if (group) {
    const upperSymbol = symbol.toUpperCase();
    if (!group.symbols.includes(upperSymbol)) {
      group.symbols.unshift(upperSymbol);
      await saveGroupsData(data);
    }
  }
  return data;
}

export async function removeSymbolFromGroup(
  groupId: string,
  symbol: string,
): Promise<GroupsData> {
  const data = await getGroupsData();
  const group = data.groups.find((g) => g.id === groupId);
  if (group) {
    group.symbols = group.symbols.filter((s) => s !== symbol.toUpperCase());
    await saveGroupsData(data);
  }
  return data;
}

export async function reorderSymbolsInGroup(
  groupId: string,
  newOrder: string[],
): Promise<GroupsData> {
  const data = await getGroupsData();
  const group = data.groups.find((g) => g.id === groupId);
  if (group) {
    group.symbols = newOrder;
    await saveGroupsData(data);
  }
  return data;
}

// ============ Legacy API (for backward compatibility) ============

export async function getSymbols(): Promise<string[]> {
  const data = await getGroupsData();
  const activeGroup = data.groups.find((g) => g.id === data.activeGroupId);
  return activeGroup?.symbols || [];
}

export async function addSymbol(symbol: string): Promise<string[]> {
  const data = await getGroupsData();
  const result = await addSymbolToGroup(data.activeGroupId, symbol);
  const activeGroup = result.groups.find((g) => g.id === result.activeGroupId);
  return activeGroup?.symbols || [];
}

export async function removeSymbol(symbol: string): Promise<string[]> {
  const data = await getGroupsData();
  const result = await removeSymbolFromGroup(data.activeGroupId, symbol);
  const activeGroup = result.groups.find((g) => g.id === result.activeGroupId);
  return activeGroup?.symbols || [];
}

export async function reorderSymbols(newOrder: string[]): Promise<void> {
  const data = await getGroupsData();
  await reorderSymbolsInGroup(data.activeGroupId, newOrder);
}
