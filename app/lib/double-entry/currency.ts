/**
 * 货币和汇率管理
 */

import type { CurrencyCode, CurrencyConfig, ExchangeRate } from "./types";

/**
 * 预定义货币配置
 */
export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  CNY: { code: "CNY", symbol: "¥", name: "人民币", decimals: 2 },
  USD: { code: "USD", symbol: "$", name: "美元", decimals: 2 },
  HKD: { code: "HKD", symbol: "HK$", name: "港币", decimals: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "日元", decimals: 0 },
  EUR: { code: "EUR", symbol: "€", name: "欧元", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "英镑", decimals: 2 },
  SGD: { code: "SGD", symbol: "S$", name: "新加坡元", decimals: 2 },
};

/**
 * 获取货币配置
 */
export function getCurrency(code: CurrencyCode): CurrencyConfig {
  return CURRENCIES[code];
}

/**
 * 获取货币的最小单位乘数
 * 例如：CNY 是 100（1元 = 100分）
 */
export function getCurrencyMultiplier(code: CurrencyCode): number {
  const decimals = CURRENCIES[code].decimals;
  return Math.pow(10, decimals);
}

// ============================================================================
// 汇率管理
// ============================================================================

/**
 * 创建汇率记录
 */
export function createExchangeRate(
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number,
  date?: string,
): ExchangeRate {
  return {
    from,
    to,
    rate,
    date: date ?? new Date().toISOString().split("T")[0],
  };
}

/**
 * 获取汇率（查找最近的汇率记录）
 */
export function getExchangeRate(
  rates: ExchangeRate[],
  from: CurrencyCode,
  to: CurrencyCode,
  date?: string,
): number | null {
  if (from === to) return 1;

  const targetDate = date ?? new Date().toISOString().split("T")[0];

  // 查找直接汇率
  const directRates = rates
    .filter((r) => r.from === from && r.to === to && r.date <= targetDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (directRates.length > 0) {
    return directRates[0].rate;
  }

  // 查找反向汇率
  const reverseRates = rates
    .filter((r) => r.from === to && r.to === from && r.date <= targetDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (reverseRates.length > 0) {
    return 1 / reverseRates[0].rate;
  }

  return null;
}

/**
 * 货币转换（最小单位）
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRate[],
  date?: string,
): number | null {
  const rate = getExchangeRate(rates, from, to, date);
  if (rate === null) return null;

  // 需要考虑小数位数差异
  const fromMultiplier = getCurrencyMultiplier(from);
  const toMultiplier = getCurrencyMultiplier(to);

  // 先转为主单位，乘以汇率，再转为最小单位
  const mainUnit = amount / fromMultiplier;
  const converted = mainUnit * rate;
  return Math.round(converted * toMultiplier);
}

/**
 * 更新或添加汇率
 */
export function upsertExchangeRate(
  rates: ExchangeRate[],
  newRate: ExchangeRate,
): ExchangeRate[] {
  // 移除同一天的相同货币对
  const filtered = rates.filter(
    (r) =>
      !(r.from === newRate.from && r.to === newRate.to && r.date === newRate.date),
  );
  return [...filtered, newRate];
}

/**
 * 获取所有可用货币对
 */
export function getAvailableCurrencyPairs(
  rates: ExchangeRate[],
): Array<{ from: CurrencyCode; to: CurrencyCode }> {
  const pairs = new Set<string>();
  
  for (const rate of rates) {
    pairs.add(`${rate.from}-${rate.to}`);
    pairs.add(`${rate.to}-${rate.from}`); // 反向也可用
  }

  return Array.from(pairs).map((pair) => {
    const [from, to] = pair.split("-") as [CurrencyCode, CurrencyCode];
    return { from, to };
  });
}
