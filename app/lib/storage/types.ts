/**
 * 存储层接口定义
 */

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
 * 存储适配器接口
 * 所有存储实现都需要实现这个接口
 */
export interface StorageAdapter {
  /** 获取分组数据 */
  getGroupsData(): Promise<GroupsData>;

  /** 保存分组数据 */
  saveGroupsData(data: GroupsData): Promise<void>;
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
