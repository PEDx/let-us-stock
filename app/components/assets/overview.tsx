"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import { useBook } from "~/lib/accounting";
import { getCurrencySymbol } from "~/lib/accounting/constants";
import { getMainLedger, findAccountsByType, getCurrencyMultiplier } from "~/lib/double-entry";
import { AccountType } from "~/lib/double-entry/types";
import { cn } from "~/lib/utils";

/**
 * 资产总览组件
 */
export function AssetsOverview() {
  const { t, language } = useI18n();
  const { book, netWorth, totalAssets, totalLiabilities } = useBook();

  // 获取主账本的默认货币
  const defaultCurrency = useMemo(() => {
    if (!book) return "CNY";
    const mainLedger = getMainLedger(book);
    return mainLedger.defaultCurrency;
  }, [book]);

  const currencySymbol = getCurrencySymbol(defaultCurrency);

  // 格式化金额（从最小单位转换为主单位）
  const formatAmount = (amount: number) => {
    const multiplier = getCurrencyMultiplier(defaultCurrency);
    const mainUnit = amount / multiplier;
    return mainUnit.toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 获取账户列表
  const { assetAccounts, liabilityAccounts } = useMemo(() => {
    if (!book) return { assetAccounts: [], liabilityAccounts: [] };
    const mainLedger = getMainLedger(book);
    return {
      assetAccounts: findAccountsByType(mainLedger.accounts, AccountType.ASSETS).filter(
        (a) => a.parentId !== null && !a.archived,
      ),
      liabilityAccounts: findAccountsByType(
        mainLedger.accounts,
        AccountType.LIABILITIES,
      ).filter((a) => a.parentId !== null && !a.archived),
    };
  }, [book]);

  return (
    <div className='space-y-3'>
      {/* 净资产卡片 */}
      <div className='rounded-xs border bg-gradient-to-br from-primary/5 to-primary/10 px-3 py-2'>
        <div className='text-xs text-muted-foreground'>{t.assets.netWorth}</div>
        <div
          className={cn(
            "text-lg font-bold",
            netWorth >= 0 ? "text-green-600" : "text-red-600",
          )}>
          {currencySymbol}
          {formatAmount(netWorth)}
        </div>
      </div>

      {/* 资产/负债卡片 */}
      <div className='grid gap-2 sm:grid-cols-2'>
        <div className='flex items-center gap-2 rounded-xs border px-2 py-1.5'>
          <div className='flex size-6 items-center justify-center rounded-full bg-green-500/10'>
            <Wallet className='size-3 text-green-600' />
          </div>
          <div>
            <div className='text-xs text-muted-foreground'>{t.assets.totalAssets}</div>
            <div className='text-sm font-semibold text-green-600'>
              {currencySymbol}
              {formatAmount(totalAssets)}
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2 rounded-xs border px-2 py-1.5'>
          <div className='flex size-6 items-center justify-center rounded-full bg-red-500/10'>
            <CreditCard className='size-3 text-red-600' />
          </div>
          <div>
            <div className='text-xs text-muted-foreground'>
              {t.assets.totalLiabilities}
            </div>
            <div className='text-sm font-semibold text-red-600'>
              {currencySymbol}
              {formatAmount(totalLiabilities)}
            </div>
          </div>
        </div>
      </div>

      {/* 账户列表预览 */}
      <div className='grid gap-2 sm:grid-cols-2'>
        {/* 资产账户 */}
        <div className='rounded-xs border'>
          <div className='flex items-center gap-1 border-b px-2 py-1'>
            <TrendingUp className='size-3 text-green-600' />
            <span className='text-xs font-medium'>{t.assets.types.assets}</span>
          </div>
          <div className='divide-y'>
            {assetAccounts.length === 0 ? (
              <div className='px-2 py-1.5 text-xs text-muted-foreground'>
                {t.common.noData}
              </div>
            ) : (
              assetAccounts.slice(0, 5).map((account) => (
                <div
                  key={account.id}
                  className='flex items-center justify-between px-2 py-1'>
                  <div className='flex items-center gap-1'>
                    <span className='text-xs'>{account.icon || "💳"}</span>
                    <span className='text-xs'>{account.name}</span>
                  </div>
                  <span className='text-xs font-medium text-green-600'>
                    {getCurrencySymbol(account.currency)}
                    {formatAmount(account.balance)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 负债账户 */}
        <div className='rounded-xs border'>
          <div className='flex items-center gap-1 border-b px-2 py-1'>
            <TrendingDown className='size-3 text-red-600' />
            <span className='text-xs font-medium'>{t.assets.types.liabilities}</span>
          </div>
          <div className='divide-y'>
            {liabilityAccounts.length === 0 ? (
              <div className='px-2 py-1.5 text-xs text-muted-foreground'>
                {t.common.noData}
              </div>
            ) : (
              liabilityAccounts.slice(0, 5).map((account) => (
                <div
                  key={account.id}
                  className='flex items-center justify-between px-2 py-1'>
                  <div className='flex items-center gap-1'>
                    <span className='text-xs'>{account.icon || "💳"}</span>
                    <span className='text-xs'>{account.name}</span>
                  </div>
                  <span className='text-xs font-medium text-red-600'>
                    {getCurrencySymbol(account.currency)}
                    {formatAmount(account.balance)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
