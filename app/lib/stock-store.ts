/**
 * 股票数据存储业务逻辑层
 * 使用 Firebase Firestore 作为数据存储
 */

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
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

export function useGroupsData() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // 使用 ref 获取最新的 auth 状态
  const authRef = useRef({ isAuthenticated, user });
  authRef.current = { isAuthenticated, user };

  // 登录后：使用 loading 状态直到数据加载完成
  // 未登录时：groupsData 为 null，isLoading 为 false
  const [groupsData, setGroupsData] = useState<GroupsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 获取分组数据
  const loadGroups = useCallback(async () => {
    const { isAuthenticated: auth, user: currentUser } = authRef.current;
    if (!auth || !currentUser) {
      setIsLoading(false);
      setGroupsData(null);
      return;
    }

    try {
      const repo = new GroupsRepository(currentUser.id);
      const data = await repo.getGroupsData();
      setIsLoading(true);
      setError(null);
      setGroupsData(data);
    } catch (err) {
      console.error("Failed to load groups:", err);
      setError(err instanceof Error ? err : new Error("Failed to load groups"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // 添加分组
  const addGroup = useCallback(
    async (name: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser || !groupsData) return DEFAULT_GROUPS_DATA;
      const newData = await addGroupToRepo(currentUser.id, name);
      setGroupsData(newData);
      return newData;
    },
    [groupsData],
  );

  // 删除分组
  const removeGroup = useCallback(
    async (groupId: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser || !groupsData) return DEFAULT_GROUPS_DATA;
      const newData = await removeGroupFromRepo(currentUser.id, groupId);
      setGroupsData(newData);
      return newData;
    },
    [groupsData],
  );

  // 重命名分组
  const renameGroup = useCallback(
    async (groupId: string, newName: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser || !groupsData) return DEFAULT_GROUPS_DATA;
      const newData = await renameGroupInRepo(currentUser.id, groupId, newName);
      setGroupsData(newData);
      return newData;
    },
    [groupsData],
  );

  // 重新排序分组
  const reorderGroups = useCallback(
    async (newOrder: string[]): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser || !groupsData) return DEFAULT_GROUPS_DATA;
      const newData = await reorderGroupsInRepo(currentUser.id, newOrder);
      setGroupsData(newData);
      return newData;
    },
    [groupsData],
  );

  // 切换激活分组
  const setActiveGroup = useCallback(
    async (groupId: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser || !groupsData) return DEFAULT_GROUPS_DATA;
      const newData = await setActiveGroupInRepo(currentUser.id, groupId);
      setGroupsData(newData);
      return newData;
    },
    [groupsData],
  );

  // 添加股票到分组
  const addSymbolToGroup = useCallback(
    async (groupId: string, symbol: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser || !groupsData) return DEFAULT_GROUPS_DATA;
      const newData = await addSymbolToGroupInRepo(
        currentUser.id,
        groupId,
        symbol,
      );
      setGroupsData(newData);
      return newData;
    },
    [groupsData],
  );

  // 从分组删除股票
  const removeSymbolFromGroup = useCallback(
    async (groupId: string, symbol: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser || !groupsData) return DEFAULT_GROUPS_DATA;
      const newData = await removeSymbolFromGroupInRepo(
        currentUser.id,
        groupId,
        symbol,
      );
      setGroupsData(newData);
      return newData;
    },
    [groupsData],
  );

  // 重新排序分组内股票
  const reorderSymbolsInGroup = useCallback(
    async (groupId: string, newOrder: string[]): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser || !groupsData) return DEFAULT_GROUPS_DATA;
      const newData = await reorderSymbolsInGroupInRepo(
        currentUser.id,
        groupId,
        newOrder,
      );
      setGroupsData(newData);
      return newData;
    },
    [groupsData],
  );

  // 判断当前是否已登录
  const isLoggedIn = isAuthenticated && !!user;

  const groupsDataRet = useMemo(() => {
    if (!isAuthLoading && !isLoggedIn) return DEFAULT_GROUPS_DATA;
    if (isLoading) return { groups: [], activeGroupId: "" };
    return groupsData ?? DEFAULT_GROUPS_DATA;
  }, [groupsData, isLoading, isLoggedIn]);

  // 数据加载完成
  return {
    groupsData: groupsDataRet,
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
