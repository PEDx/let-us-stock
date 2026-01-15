/**
 * 金额处理工具
 *
 * 内部使用整数（最小单位，如分）存储，避免浮点精度问题
 */

import type { CurrencyCode } from "./types";
import { getCurrency, getCurrencyMultiplier } from "./currency";

/**
 * 金额对象（不可变）
 */
export interface Money {
  /** 金额（最小单位，如分） */
  amount: number;
  /** 货币代码 */
  currency: CurrencyCode;
}

/**
 * 创建金额（从最小单位）
 */
export function createMoney(amount: number, currency: CurrencyCode): Money {
  return { amount: Math.round(amount), currency };
}

/**
 * 从主单位创建金额（如：从元创建）
 * @param value 主单位金额（如 100.50 元）
 * @param currency 货币代码
 */
export function fromMainUnit(value: number, currency: CurrencyCode): Money {
  const multiplier = getCurrencyMultiplier(currency);
  return createMoney(Math.round(value * multiplier), currency);
}

/**
 * 转换为主单位（如：分转元）
 */
export function toMainUnit(money: Money): number {
  const multiplier = getCurrencyMultiplier(money.currency);
  return money.amount / multiplier;
}

/**
 * 格式化金额为字符串
 */
export function formatMoney(money: Money): string {
  const config = getCurrency(money.currency);
  const value = toMainUnit(money);
  return `${config.symbol}${value.toFixed(config.decimals)}`;
}

/**
 * 金额相加（必须同币种）
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot add different currencies: ${a.currency} and ${b.currency}`,
    );
  }
  return createMoney(a.amount + b.amount, a.currency);
}

/**
 * 金额相减（必须同币种）
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot subtract different currencies: ${a.currency} and ${b.currency}`,
    );
  }
  return createMoney(a.amount - b.amount, a.currency);
}

/**
 * 金额取反
 */
export function negateMoney(money: Money): Money {
  return createMoney(-money.amount, money.currency);
}

/**
 * 判断金额是否为零
 */
export function isZero(money: Money): boolean {
  return money.amount === 0;
}

/**
 * 判断金额是否相等
 */
export function isEqual(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

/**
 * 零金额
 */
export function zero(currency: CurrencyCode): Money {
  return createMoney(0, currency);
}
