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
  const groupsDataRef = useRef<GroupsData | null>(null);
  const activeGroupRequestRef = useRef(0);

  // 登录后：使用 loading 状态直到数据加载完成
  // 未登录时：groupsData 为 null，isLoading 为 false
  const [groupsData, setGroupsData] = useState<GroupsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    groupsDataRef.current = groupsData;
  }, [groupsData]);

  // 获取分组数据
  const loadGroups = useCallback(async () => {
    const { isAuthenticated: auth, user: currentUser } = authRef.current;
    if (!auth || !currentUser) {
      setIsLoading(false);
      setGroupsData(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const repo = new GroupsRepository(currentUser.id);
      const data = await repo.getGroupsData();
      setGroupsData(data);
    } catch (err) {
      console.error("Failed to load groups:", err);
      setError(err instanceof Error ? err : new Error("Failed to load groups"));
    } finally {
      setIsLoading(false);
    }
  }, []); // 使用 authRef.current，无需依赖

  // 登录状态变化时加载数据
  useEffect(() => {
    if (isAuthenticated && user) {
      loadGroups();
    } else if (!isAuthLoading && !isAuthenticated) {
      // 已退出登录
      setIsLoading(false);
      setGroupsData(null);
    }
  }, [isAuthenticated, user, isAuthLoading, loadGroups]);

  // 添加分组
  const addGroup = useCallback(
    async (name: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser) return DEFAULT_GROUPS_DATA;

      const newData = await addGroupToRepo(currentUser.id, name);
      setGroupsData(newData);
      return newData;
    },
    [], // 移除 groupsData 依赖
  );

  // 删除分组
  const removeGroup = useCallback(
    async (groupId: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser) return DEFAULT_GROUPS_DATA;

      const newData = await removeGroupFromRepo(currentUser.id, groupId);
      setGroupsData(newData);
      return newData;
    },
    [], // 移除 groupsData 依赖
  );

  // 重命名分组
  const renameGroup = useCallback(
    async (groupId: string, newName: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser) return DEFAULT_GROUPS_DATA;

      const newData = await renameGroupInRepo(currentUser.id, groupId, newName);
      setGroupsData(newData);
      return newData;
    },
    [], // 移除 groupsData 依赖
  );

  // 重新排序分组
  const reorderGroups = useCallback(
    async (newOrder: string[]): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser) return DEFAULT_GROUPS_DATA;

      const newData = await reorderGroupsInRepo(currentUser.id, newOrder);
      setGroupsData(newData);
      return newData;
    },
    [], // 移除 groupsData 依赖
  );

  // 切换激活分组
  const setActiveGroup = useCallback(
    async (groupId: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser) return DEFAULT_GROUPS_DATA;

      const previousData = groupsDataRef.current ?? DEFAULT_GROUPS_DATA;
      const optimisticData: GroupsData = {
        ...previousData,
        activeGroupId: groupId,
      };
      setGroupsData(optimisticData);

      const requestId = activeGroupRequestRef.current + 1;
      activeGroupRequestRef.current = requestId;

      try {
        const newData = await setActiveGroupInRepo(currentUser.id, groupId);
        if (activeGroupRequestRef.current === requestId) {
          setGroupsData(newData);
        }
        return newData;
      } catch (err) {
        console.error("Failed to set active group:", err);
        if (activeGroupRequestRef.current === requestId) {
          setGroupsData(previousData);
        }
        return previousData;
      }
    },
    [], // 移除 groupsData 依赖
  );

  // 添加股票到分组
  const addSymbolToGroup = useCallback(
    async (groupId: string, symbol: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser) return DEFAULT_GROUPS_DATA;

      const newData = await addSymbolToGroupInRepo(
        currentUser.id,
        groupId,
        symbol,
      );
      setGroupsData(newData);
      return newData;
    },
    [], // 移除 groupsData 依赖
  );

  // 从分组删除股票
  const removeSymbolFromGroup = useCallback(
    async (groupId: string, symbol: string): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser) return DEFAULT_GROUPS_DATA;

      const newData = await removeSymbolFromGroupInRepo(
        currentUser.id,
        groupId,
        symbol,
      );
      setGroupsData(newData);
      return newData;
    },
    [], // 移除 groupsData 依赖
  );

  // 重新排序分组内股票
  const reorderSymbolsInGroup = useCallback(
    async (groupId: string, newOrder: string[]): Promise<GroupsData> => {
      const { user: currentUser } = authRef.current;
      if (!currentUser) return DEFAULT_GROUPS_DATA;

      const newData = await reorderSymbolsInGroupInRepo(
        currentUser.id,
        groupId,
        newOrder,
      );
      setGroupsData(newData);
      return newData;
    },
    [], // 移除 groupsData 依赖
  );

  // 判断当前是否已登录
  const isLoggedIn = isAuthenticated && !!user;

  const groupsDataRet = useMemo(() => {
    // 未登录或正在检查登录状态
    if (isAuthLoading) {
      return { groups: [], activeGroupId: "" };
    }

    // 已退出登录
    if (!isLoggedIn) {
      return DEFAULT_GROUPS_DATA;
    }

    // 正在加载数据，返回空数据
    if (isLoading) {
      return { groups: [], activeGroupId: "" };
    }

    // 返回实际数据
    return groupsData ?? DEFAULT_GROUPS_DATA;
  }, [groupsData, isLoading, isLoggedIn, isAuthLoading]);

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
