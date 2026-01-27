;

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useI18n } from "~/lib/i18n";
import { useBook } from "~/lib/accounting";
import { getCurrencySymbol } from "~/lib/accounting/constants";
import {
  findAccountById,
  getCurrencyMultiplier,
  getThisMonthEntries,
} from "~/lib/double-entry";
import { EntryLineType } from "~/lib/double-entry/types";
import type { JournalEntryData, AccountData } from "~/lib/double-entry/types";
import { cn } from "~/lib/utils";
import { ConfirmPopover } from "~/components/confirm-popover";

/**
 * 流水列表组件
 */
export function EntryFlow() {
  const { t, language } = useI18n();
  const { currentLedger, deleteEntry } = useBook();

  // 获取本月记录
  const entries = useMemo(() => {
    if (!currentLedger) return [];
    return getThisMonthEntries(currentLedger).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [currentLedger]);

  // 按日期分组
  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntryData[]> = {};
    entries.forEach((entry) => {
      const date = entry.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime(),
    );
  }, [entries]);

  // 获取账户
  const getAccount = (accountId: string): AccountData | undefined => {
    if (!currentLedger) return undefined;
    return findAccountById(currentLedger.accounts, accountId);
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      weekday: "short",
    };
    return date.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", options);
  };

  // 获取分录金额和类型
  const getEntryInfo = (entry: JournalEntryData) => {
    const debitLine = entry.lines.find((l) => l.type === EntryLineType.DEBIT);
    const creditLine = entry.lines.find((l) => l.type === EntryLineType.CREDIT);

    if (!debitLine || !creditLine) {
      return { type: "unknown", amount: 0, currency: "CNY" as const };
    }

    const debitAccount = getAccount(debitLine.accountId);
    const creditAccount = getAccount(creditLine.accountId);

    if (debitAccount?.type === "expenses") {
      return {
        type: "expense" as const,
        amount: debitLine.amount,
        currency: debitAccount.currency,
        category: debitAccount,
        paymentAccount: creditAccount,
      };
    } else if (creditAccount?.type === "income") {
      return {
        type: "income" as const,
        amount: creditLine.amount,
        currency: creditAccount.currency,
        category: creditAccount,
        paymentAccount: debitAccount,
      };
    } else {
      return {
        type: "transfer" as const,
        amount: debitLine.amount,
        currency: debitAccount?.currency || "CNY",
        fromAccount: creditAccount,
        toAccount: debitAccount,
      };
    }
  };

  // 格式化金额（从最小单位转换为主单位）
  const formatAmount = (amount: number, currency: string) => {
    const multiplier = getCurrencyMultiplier(currency as "CNY");
    const mainUnit = amount / multiplier;
    return mainUnit.toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (entries.length === 0) {
    return (
      <div className='flex h-20 flex-col items-center justify-center text-muted-foreground'>
        <p className='text-xs'>{t.records.noEntries}</p>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {groupedEntries.map(([date, dayEntries]) => (
        <div key={date} className='rounded-xs border'>
          <div className='border-b bg-muted/50 px-2 py-1'>
            <span className='text-xs font-medium'>{formatDate(date)}</span>
          </div>
          <div className='divide-y'>
            {dayEntries.map((entry) => {
              const info = getEntryInfo(entry);
              return (
                <div
                  key={entry.id}
                  className='group flex items-center justify-between px-2 py-1'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-sm'>
                      {info.type === "expense"
                        ? info.category?.icon || "💸"
                        : info.type === "income"
                          ? info.category?.icon || "💰"
                          : "🔄"}
                    </span>
                    <div>
                      <div className='text-xs'>{entry.description}</div>
                      <div className='text-xs text-muted-foreground'>
                        {info.type === "transfer"
                          ? `${info.fromAccount?.name} → ${info.toAccount?.name}`
                          : info.paymentAccount?.name}
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        info.type === "expense"
                          ? "text-red-600"
                          : info.type === "income"
                            ? "text-green-600"
                            : "text-blue-600",
                      )}>
                      {info.type === "expense" ? "-" : info.type === "income" ? "+" : ""}
                      {getCurrencySymbol(info.currency as "CNY")}
                      {formatAmount(info.amount, info.currency)}
                    </span>
                    <ConfirmPopover onConfirm={() => deleteEntry(entry.id)}>
                      <button className='rounded-xs p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100'>
                        <Trash2 className='size-3' />
                      </button>
                    </ConfirmPopover>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
