/**
 * 复式记账核心类型定义
 */

// ============================================================================
// 货币
// ============================================================================

/**
 * 货币代码
 */
export type CurrencyCode = "CNY" | "USD" | "HKD" | "JPY" | "EUR" | "GBP" | "SGD";

/**
 * 货币配置
 */
export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** 小数位数（用于显示） */
  decimals: number;
}

/**
 * 汇率记录
 */
export interface ExchangeRate {
  /** 源货币 */
  from: CurrencyCode;
  /** 目标货币 */
  to: CurrencyCode;
  /** 汇率 */
  rate: number;
  /** 日期 */
  date: string;
}

// ============================================================================
// 账户
// ============================================================================

/**
 * 账户类型
 */
export enum AccountType {
  /** 资产 - 借增贷减 */
  ASSETS = "assets",
  /** 负债 - 贷增借减 */
  LIABILITIES = "liabilities",
  /** 权益 - 贷增借减 */
  EQUITY = "equity",
  /** 收入 - 贷增借减 */
  INCOME = "income",
  /** 支出 - 借增贷减 */
  EXPENSES = "expenses",
}

/**
 * 账户数据（可序列化）
 */
export interface AccountData {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  /** 父账户 ID，根账户为 null */
  parentId: string | null;
  /** 账户路径，如 "assets:bank:cmb" */
  path: string;
  /** 余额（以最小单位存储，如分） */
  balance: number;
  /** 图标（可选） */
  icon?: string;
  /** 备注 */
  note?: string;
  /** 是否归档 */
  archived?: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

// ============================================================================
// 分录
// ============================================================================

/**
 * 分录行类型
 */
export enum EntryLineType {
  /** 借方 - 资金使用/去向 */
  DEBIT = "debit",
  /** 贷方 - 资金来源 */
  CREDIT = "credit",
}

/**
 * 分录行数据
 */
export interface EntryLineData {
  accountId: string;
  /** 金额（以最小单位存储，如分） */
  amount: number;
  type: EntryLineType;
  /** 备注 */
  note?: string;
}

/**
 * 日记账分录数据（可序列化）
 */
export interface JournalEntryData {
  id: string;
  /** 交易日期 (YYYY-MM-DD) */
  date: string;
  /** 描述 */
  description: string;
  /** 分录行 */
  lines: EntryLineData[];
  /** 标签（用于分类统计） */
  tags?: string[];
  /** 收款人/商家 */
  payee?: string;
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

// ============================================================================
// 账本
// ============================================================================

/**
 * 账本类型
 */
export enum LedgerType {
  /** 主账本 - 资产管理 */
  MAIN = "main",
  /** 日常账本 - 日常记账 */
  DAILY = "daily",
  /** 专题账本 - 如旅游、装修等 */
  TOPIC = "topic",
}

/**
 * 账本数据（可序列化）
 */
export interface LedgerData {
  id: string;
  /** 账本名称 */
  name: string;
  /** 账本类型 */
  type: LedgerType;
  /** 描述 */
  description?: string;
  /** 所有账户 */
  accounts: AccountData[];
  /** 所有分录 */
  entries: JournalEntryData[];
  /** 默认货币 */
  defaultCurrency: CurrencyCode;
  /** 图标 */
  icon?: string;
  /** 是否归档 */
  archived?: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

// ============================================================================
// 账簿（多账本容器）
// ============================================================================

/**
 * 账簿数据（包含多个账本）
 */
export interface BookData {
  /** 所有账本 */
  ledgers: LedgerData[];
  /** 主账本 ID */
  mainLedgerId: string;
  /** 汇率表 */
  exchangeRates: ExchangeRate[];
  /** 常用标签 */
  commonTags: string[];
  /** 更新时间 */
  updatedAt: string;
}

// ============================================================================
// 查询和报表
// ============================================================================

/**
 * 时间范围
 */
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/**
 * 时间粒度
 */
export type TimeGranularity = "day" | "week" | "month" | "quarter" | "year";

/**
 * 分录查询条件
 */
export interface EntryQuery {
  /** 日期范围 */
  dateRange?: DateRange;
  /** 账户 ID 列表 */
  accountIds?: string[];
  /** 标签 */
  tags?: string[];
  /** 收款人 */
  payee?: string;
  /** 金额范围（最小单位） */
  amountRange?: { min?: number; max?: number };
  /** 关键词搜索 */
  keyword?: string;
}

/**
 * 汇总数据点
 */
export interface SummaryPoint {
  /** 时间标签（如 "2024-01", "2024-Q1", "2024"） */
  period: string;
  /** 收入 */
  income: number;
  /** 支出 */
  expenses: number;
  /** 净值变化 */
  netChange: number;
}

/**
 * 分类汇总
 */
export interface CategorySummary {
  /** 账户/标签 ID */
  id: string;
  /** 名称 */
  name: string;
  /** 金额 */
  amount: number;
  /** 占比 */
  percentage: number;
}

/**
 * 资产负债快照
 */
export interface BalanceSnapshot {
  date: string;
  /** 总资产 */
  totalAssets: number;
  /** 总负债 */
  totalLiabilities: number;
  /** 净资产 */
  netWorth: number;
  /** 按货币分组的资产 */
  assetsByCurrency: Record<CurrencyCode, number>;
}
