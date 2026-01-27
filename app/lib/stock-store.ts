/**
 * 股票数据存储业务逻辑层
 * 使用 Firebase Firestore 作为数据存储
 */

"use client";

import { useCallback, useState, useEffect } from "react";
import { useAuth } from "./firebase/auth-context";
import {
  GroupsRepository,
  addGroup as addGroupToRepo,
  removeGroup as removeGroupFromRepo,
  renameGroup as renameGroupInRepo,
  reorderGroups as reorderGroupsInRepo,
  setActiveGroup as setActiveGroupInRepo,
  addSymbolToGroup as addSymbolToGroupInRepo,
  removeSymbolFromGroup as removeSymbolFromGroupInRepo,
  reorderSymbolsInGroup as reorderSymbolsInGroupInRepo,
} from "./firebase/repository/groups-repository";
import type { Group, GroupsData } from "./storage/types";
import { DEFAULT_GROUPS_DATA } from "./storage/types";

// ============================================================================
// React Hook for Groups Data
// ============================================================================

/**
 * 股票分组 Hook
 */
export function useGroupsData() {
  const { user, isAuthenticated } = useAuth();
  const [groupsData, setGroupsData] = useState<GroupsData>(DEFAULT_GROUPS_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 获取分组数据
  const loadGroups = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const repo = new GroupsRepository(user.id);
      const data = await repo.getGroupsData();
      setGroupsData(data);
    } catch (err) {
      console.error("Failed to load groups:", err);
      setError(err instanceof Error ? err : new Error("Failed to load groups"));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // 初始加载
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // 添加分组
  const addGroup = useCallback(
    async (name: string) => {
      if (!user) return DEFAULT_GROUPS_DATA;
      const newData = await addGroupToRepo(user.id, name);
      setGroupsData(newData);
      return newData;
    },
    [user],
  );

  // 删除分组
  const removeGroup = useCallback(
    async (groupId: string) => {
      if (!user) return groupsData;
      const newData = await removeGroupFromRepo(user.id, groupId);
      setGroupsData(newData);
      return newData;
    },
    [user, groupsData],
  );

  // 重命名分组
  const renameGroup = useCallback(
    async (groupId: string, newName: string) => {
      if (!user) return groupsData;
      const newData = await renameGroupInRepo(user.id, groupId, newName);
      setGroupsData(newData);
      return newData;
    },
    [user, groupsData],
  );

  // 重新排序分组
  const reorderGroups = useCallback(
    async (newOrder: string[]) => {
      if (!user) return groupsData;
      const newData = await reorderGroupsInRepo(user.id, newOrder);
      setGroupsData(newData);
      return newData;
    },
    [user, groupsData],
  );

  // 切换激活分组
  const setActiveGroup = useCallback(
    async (groupId: string) => {
      if (!user) return groupsData;
      const newData = await setActiveGroupInRepo(user.id, groupId);
      setGroupsData(newData);
      return newData;
    },
    [user, groupsData],
  );

  // 添加股票到分组
  const addSymbolToGroup = useCallback(
    async (groupId: string, symbol: string) => {
      if (!user) return groupsData;
      const newData = await addSymbolToGroupInRepo(user.id, groupId, symbol);
      setGroupsData(newData);
      return newData;
    },
    [user, groupsData],
  );

  // 从分组删除股票
  const removeSymbolFromGroup = useCallback(
    async (groupId: string, symbol: string) => {
      if (!user) return groupsData;
      const newData = await removeSymbolFromGroupInRepo(user.id, groupId, symbol);
      setGroupsData(newData);
      return newData;
    },
    [user, groupsData],
  );

  // 重新排序分组内股票
  const reorderSymbolsInGroup = useCallback(
    async (groupId: string, newOrder: string[]) => {
      if (!user) return groupsData;
      const newData = await reorderSymbolsInGroupInRepo(user.id, groupId, newOrder);
      setGroupsData(newData);
      return newData;
    },
    [user, groupsData],
  );

  return {
    groupsData,
    isLoading,
    error,
    refresh: loadGroups,
    addGroup,
    removeGroup,
    renameGroup,
    reorderGroups,
    setActiveGroup,
    addSymbolToGroup,
    removeSymbolFromGroup,
    reorderSymbolsInGroup,
  };
}

// 重新导出类型
export type { Group, GroupsData };
