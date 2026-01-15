"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import { useBook } from "~/lib/accounting";
import { getCurrencySymbol } from "~/lib/accounting/constants";
import {
  getCurrencyMultiplier,
  getPeriodRange,
  calculatePeriodSummary,
} from "~/lib/double-entry";
import { cn } from "~/lib/utils";

type Period = "month" | "year";

/**
 * 统计组件
 */
export function EntryStats() {
  const { t, language } = useI18n();
  const { currentLedger } = useBook();
  const [period, setPeriod] = useState<Period>("month");

  const defaultCurrency = currentLedger?.defaultCurrency ?? "CNY";

  // 获取统计数据
  const stats = useMemo(() => {
    if (!currentLedger) {
      return { income: 0, expenses: 0, balance: 0 };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const dateRange =
      period === "month"
        ? getPeriodRange(year, "month", month)
        : getPeriodRange(year, "year");

    const summary = calculatePeriodSummary(currentLedger, dateRange);
    return {
      income: summary.income,
      expenses: summary.expenses,
      balance: summary.netChange,
    };
  }, [currentLedger, period]);

  // 格式化金额（从最小单位转换为主单位）
  const formatAmount = (amount: number) => {
    const multiplier = getCurrencyMultiplier(defaultCurrency);
    const mainUnit = amount / multiplier;
    return mainUnit.toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const currencySymbol = getCurrencySymbol(defaultCurrency);

  return (
    <div className='space-y-3'>
      {/* 时间选择 */}
      <div className='flex gap-1'>
        <button
          onClick={() => setPeriod("month")}
          className={cn(
            "rounded-xs border px-1.5 py-0.5 text-xs transition-colors",
            period === "month"
              ? "border-primary bg-primary/10 text-primary"
              : "hover:bg-muted",
          )}>
          {t.records.thisMonth}
        </button>
        <button
          onClick={() => setPeriod("year")}
          className={cn(
            "rounded-xs border px-1.5 py-0.5 text-xs transition-colors",
            period === "year"
              ? "border-primary bg-primary/10 text-primary"
              : "hover:bg-muted",
          )}>
          {t.records.thisYear}
        </button>
      </div>

      {/* 统计卡片 */}
      <div className='grid gap-2 sm:grid-cols-3'>
        {/* 收入 */}
        <div className='rounded-xs border px-2 py-1.5'>
          <div className='flex items-center gap-1'>
            <div className='flex size-5 items-center justify-center rounded-full bg-green-500/10'>
              <TrendingUp className='size-3 text-green-600' />
            </div>
            <span className='text-xs text-muted-foreground'>
              {t.records.incomeTotal}
            </span>
          </div>
          <div className='mt-1 text-sm font-bold text-green-600'>
            {currencySymbol}
            {formatAmount(stats.income)}
          </div>
        </div>

        {/* 支出 */}
        <div className='rounded-xs border px-2 py-1.5'>
          <div className='flex items-center gap-1'>
            <div className='flex size-5 items-center justify-center rounded-full bg-red-500/10'>
              <TrendingDown className='size-3 text-red-600' />
            </div>
            <span className='text-xs text-muted-foreground'>
              {t.records.expenseTotal}
            </span>
          </div>
          <div className='mt-1 text-sm font-bold text-red-600'>
            {currencySymbol}
            {formatAmount(stats.expenses)}
          </div>
        </div>

        {/* 结余 */}
        <div className='rounded-xs border px-2 py-1.5'>
          <div className='flex items-center gap-1'>
            <div
              className={cn(
                "flex size-5 items-center justify-center rounded-full",
                stats.balance >= 0 ? "bg-green-500/10" : "bg-red-500/10",
              )}>
              <Minus
                className={cn(
                  "size-3",
                  stats.balance >= 0 ? "text-green-600" : "text-red-600",
                )}
              />
            </div>
            <span className='text-xs text-muted-foreground'>{t.records.balance}</span>
          </div>
          <div
            className={cn(
              "mt-1 text-sm font-bold",
              stats.balance >= 0 ? "text-green-600" : "text-red-600",
            )}>
            {stats.balance >= 0 ? "+" : ""}
            {currencySymbol}
            {formatAmount(stats.balance)}
          </div>
        </div>
      </div>

      {/* 占位：未来可添加图表 */}
      <div className='flex h-20 items-center justify-center rounded-xs border border-dashed text-muted-foreground'>
        <p className='text-xs'>📊 图表功能开发中...</p>
      </div>
    </div>
  );
}
