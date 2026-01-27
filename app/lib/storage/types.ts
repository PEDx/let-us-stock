/**
 * 存储类型定义
 */

// ============================================================================
// 股票分组数据
// ============================================================================

export interface Group {
  id: string;
  name: string;
  symbols: string[];
}

export interface GroupsData {
  groups: Group[];
  activeGroupId: string;
}

/**
 * 远端同步的分组数据结构（不包含 activeGroupId）
 */
export interface RemoteGroupsData {
  groups: Group[];
}

/**
 * 默认股票列表
 */
export const DEFAULT_SYMBOLS = [
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

/**
 * 默认分组数据
 */
export const DEFAULT_GROUPS_DATA: GroupsData = {
  groups: [{ id: "default", name: "default", symbols: DEFAULT_SYMBOLS }],
  activeGroupId: "default",
};
