/**
 * 股票数据存储业务逻辑层
 * 底层使用可替换的存储适配器
 */

import { storage } from "./storage";
import type { Group, GroupsData } from "./storage";

// 重新导出类型供外部使用
export type { Group, GroupsData };

// ============ Groups API ============

export async function getGroupsData(): Promise<GroupsData> {
  return storage.getGroupsData();
}

export async function saveGroupsData(data: GroupsData): Promise<void> {
  return storage.saveGroupsData(data);
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
