import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  num: number | undefined | null,
  decimals = 2,
): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 英文单位配置 (K/M/B/T)
 */
export const UNITS_EN = {
  thousand: " K",
  million: " M",
  billion: " B",
  trillion: " T",
};

/**
 * 中文单位配置 (万/亿/万亿)
 */
export const UNITS_ZH = {
  wan: " 万",
  yi: " 亿",
  wanyi: " 万亿",
};

export type UnitsEN = typeof UNITS_EN;
export type UnitsZH = typeof UNITS_ZH;

/**
 * 格式化大数字（英文单位：K/M/B/T）
 */
export function formatLargeNumber(
  num: number | undefined | null,
  decimals = 2,
  units: UnitsEN = UNITS_EN,
): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  if (num >= 1e12) return formatNumber(num / 1e12, decimals) + units.trillion;
  if (num >= 1e9) return formatNumber(num / 1e9, decimals) + units.billion;
  if (num >= 1e6) return formatNumber(num / 1e6, decimals) + units.million;
  if (num >= 1e3) return formatNumber(num / 1e3, decimals) + units.thousand;
  return formatNumber(num, decimals);
}

/**
 * 格式化大数字（中文单位：万/亿/万亿）
 */
export function formatLargeNumberZh(
  num: number | undefined | null,
  decimals = 2,
  units: UnitsZH = UNITS_ZH,
): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  if (num >= 1e12) return formatNumber(num / 1e12, decimals) + units.wanyi;
  if (num >= 1e8) return formatNumber(num / 1e8, decimals) + units.yi;
  if (num >= 1e4) return formatNumber(num / 1e4, decimals) + units.wan;
  return formatNumber(num, decimals);
}
