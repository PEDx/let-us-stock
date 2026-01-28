/**
 * 股票分组 Repository
 */

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  type Firestore,
} from "firebase/firestore";
import { getApps } from "firebase/app";
import type { Group, GroupsData } from "../../storage/types";
import { DEFAULT_GROUPS_DATA } from "../../storage/types";

let db: Firestore | null = null;

function getDB(): Firestore {
  if (!db) {
    const app = getApps()[0];
    db = getFirestore(app);
  }
  return db;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// 分组 Repository
// ============================================================================

export class GroupsRepository {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * 获取分组数据
   */
  async getGroupsData(): Promise<GroupsData> {
    const db = getDB();
    const docRef = doc(db, `users/${this.userId}/meta`, "groups");

    try {
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // 返回默认值并保存
        await this.saveGroupsData(DEFAULT_GROUPS_DATA);
        return DEFAULT_GROUPS_DATA;
      }

      const data = docSnap.data();
      return {
        groups: data.groups || [],
        activeGroupId: data.activeGroupId || "default",
      };
    } catch (error) {
      console.error("Failed to get groups data:", error);
      return DEFAULT_GROUPS_DATA;
    }
  }

  /**
   * 保存分组数据
   */
  async saveGroupsData(data: GroupsData): Promise<void> {
    const db = getDB();
    const docRef = doc(db, `users/${this.userId}/meta`, "groups");

    await setDoc(docRef, {
      groups: data.groups,
      activeGroupId: data.activeGroupId,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * 仅保存到本地（不触发远程同步，但 Firebase 是实时同步的）
   */
  async saveLocalOnly(data: GroupsData): Promise<void> {
    return this.saveGroupsData(data);
  }

  /**
   * 仅从本地读取（不触发远程同步）
   */
  async getLocalOnly(): Promise<GroupsData> {
    return this.getGroupsData();
  }
}

// ============================================================================
// 分组操作函数
// ============================================================================

export async function getGroupsData(): Promise<GroupsData> {
  // 这里需要由调用方传入 userId，暂时返回默认值
  // 实际使用时会通过 useGroupsViewModel 传入
  return DEFAULT_GROUPS_DATA;
}

export async function saveGroupsData(data: GroupsData): Promise<void> {
  // 暂时占位，实际使用 useGroupsViewModel
}

export async function addGroup(
  userId: string,
  name: string,
): Promise<GroupsData> {
  const repo = new GroupsRepository(userId);
  const data = await repo.getLocalOnly();
  const newGroup: Group = { id: `group-${generateId()}`, name, symbols: [] };
  data.groups.push(newGroup);
  data.activeGroupId = newGroup.id;
  await repo.saveGroupsData(data);
  return data;
}

export async function removeGroup(
  userId: string,
  groupId: string,
): Promise<GroupsData> {
  const repo = new GroupsRepository(userId);
  const data = await repo.getLocalOnly();

  if (data.groups.length <= 1) {
    return data;
  }

  const index = data.groups.findIndex((g) => g.id === groupId);
  if (index !== -1) {
    data.groups.splice(index, 1);
    if (data.activeGroupId === groupId) {
      data.activeGroupId = data.groups[0].id;
    }
  }

  await repo.saveGroupsData(data);
  return data;
}

export async function renameGroup(
  userId: string,
  groupId: string,
  newName: string,
): Promise<GroupsData> {
  const repo = new GroupsRepository(userId);
  const data = await repo.getLocalOnly();
  const group = data.groups.find((g) => g.id === groupId);
  if (group) {
    group.name = newName;
    await repo.saveGroupsData(data);
  }
  return data;
}

export async function reorderGroups(
  userId: string,
  newOrder: string[],
): Promise<GroupsData> {
  const repo = new GroupsRepository(userId);
  const data = await repo.getLocalOnly();
  const groupsMap = new Map(data.groups.map((g) => [g.id, g]));
  data.groups = newOrder.map((id) => groupsMap.get(id)!).filter(Boolean);
  await repo.saveGroupsData(data);
  return data;
}

export async function setActiveGroup(
  userId: string,
  groupId: string,
): Promise<GroupsData> {
  const repo = new GroupsRepository(userId);
  const data = await repo.getLocalOnly();
  if (data.groups.some((g) => g.id === groupId)) {
    data.activeGroupId = groupId;
    await repo.saveLocalOnly(data);
  }
  return data;
}

export async function addSymbolToGroup(
  userId: string,
  groupId: string,
  symbol: string,
): Promise<GroupsData> {
  const repo = new GroupsRepository(userId);
  const data = await repo.getLocalOnly();
  const group = data.groups.find((g) => g.id === groupId);
  if (group) {
    const upperSymbol = symbol.toUpperCase();
    if (!group.symbols.includes(upperSymbol)) {
      group.symbols.unshift(upperSymbol);
      await repo.saveGroupsData(data);
    }
  }
  return data;
}

export async function removeSymbolFromGroup(
  userId: string,
  groupId: string,
  symbol: string,
): Promise<GroupsData> {
  const repo = new GroupsRepository(userId);
  const data = await repo.getLocalOnly();
  const group = data.groups.find((g) => g.id === groupId);
  if (group) {
    group.symbols = group.symbols.filter((s) => s !== symbol.toUpperCase());
    await repo.saveGroupsData(data);
  }
  return data;
}

export async function reorderSymbolsInGroup(
  userId: string,
  groupId: string,
  newOrder: string[],
): Promise<GroupsData> {
  const repo = new GroupsRepository(userId);
  const data = await repo.getLocalOnly();
  const group = data.groups.find((g) => g.id === groupId);
  if (group) {
    group.symbols = newOrder;
    await repo.saveGroupsData(data);
  }
  return data;
}
