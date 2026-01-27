/**
 * 记账预设常量
 */

import type { CurrencyCode } from "../double-entry/types";

// ============================================================================
// 预设分类
// ============================================================================

export interface CategoryDef {
  id: string;
  icon: string;
  /** i18n key under records.categories */
  labelKey: string;
}

/**
 * 支出分类
 */
export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: "food", icon: "🍜", labelKey: "food" },
  { id: "transport", icon: "🚗", labelKey: "transport" },
  { id: "shopping", icon: "🛒", labelKey: "shopping" },
  { id: "entertainment", icon: "🎬", labelKey: "entertainment" },
  { id: "housing", icon: "🏠", labelKey: "housing" },
  { id: "medical", icon: "🏥", labelKey: "medical" },
  { id: "education", icon: "📚", labelKey: "education" },
  { id: "communication", icon: "📱", labelKey: "communication" },
  { id: "other", icon: "📦", labelKey: "other" },
];

/**
 * 收入分类
 */
export const INCOME_CATEGORIES: CategoryDef[] = [
  { id: "salary", icon: "💰", labelKey: "salary" },
  { id: "bonus", icon: "🎁", labelKey: "bonus" },
  { id: "investment", icon: "📈", labelKey: "investment" },
  { id: "partTime", icon: "💼", labelKey: "partTime" },
  { id: "gift", icon: "🧧", labelKey: "gift" },
  { id: "other", icon: "📦", labelKey: "other" },
];

// ============================================================================
// 预设账户图标
// ============================================================================

export const ACCOUNT_ICONS = [
  "💵", // 现金
  "💳", // 银行卡
  "🏦", // 银行
  "📱", // 手机支付
  "💰", // 钱袋
  "🪙", // 硬币
  "📈", // 证券
  "🏠", // 房产
  "🚗", // 汽车
  "💎", // 贵重物品
  "🎯", // 目标
  "✈️", // 旅行
  "🎓", // 教育
  "💼", // 工作
];

// ============================================================================
// 支持的货币
// ============================================================================

export interface CurrencyDef {
  code: CurrencyCode;
  symbol: string;
  name: string;
  nameZh: string;
}

export const SUPPORTED_CURRENCIES: CurrencyDef[] = [
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", nameZh: "人民币" },
  { code: "USD", symbol: "$", name: "US Dollar", nameZh: "美元" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", nameZh: "港币" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", nameZh: "日元" },
  { code: "EUR", symbol: "€", name: "Euro", nameZh: "欧元" },
  { code: "GBP", symbol: "£", name: "British Pound", nameZh: "英镑" },
];

/**
 * 获取货币显示名称
 */
export function getCurrencyName(code: CurrencyCode, language: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  if (!currency) return code;
  return language === "zh" ? currency.nameZh : currency.name;
}

/**
 * 获取货币符号
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return currency?.symbol ?? code;
}
