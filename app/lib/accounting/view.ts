import type {
  AccountData,
  CurrencyCode,
  DateRange,
  LedgerData,
} from "~/lib/double-entry/types";
import { AccountType } from "~/lib/double-entry/types";
import {
  getEntryAmount,
  getEntryCategory,
  getEntryCurrency,
} from "~/lib/double-entry/entry";
import { calculatePeriodSummary } from "~/lib/double-entry/report";
import { createMoney, formatMoney } from "~/lib/double-entry/money";

export type CurrencyAmount = {
  currency: CurrencyCode;
  amount: number;
  formatted: string;
};

export type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  balance: number;
  formattedBalance: string;
  level: number;
  path: string;
  isRoot: boolean;
  archived?: boolean;
};

export type AccountGroup = {
  type: AccountType;
  rows: AccountRow[];
  totals: CurrencyAmount[];
};

export type EntryRow = {
  id: string;
  date: string;
  description: string;
  payee?: string;
  tags?: string[];
  category: "expense" | "income" | "transfer" | "unknown";
  currency: CurrencyCode;
  amount: number;
  formattedAmount: string;
  accounts: string[];
  lineCount: number;
};

export type PeriodSummary = {
  income: CurrencyAmount;
  expenses: CurrencyAmount;
  netChange: CurrencyAmount;
};

function formatAmount(amount: number, currency: CurrencyCode): string {
  return formatMoney(createMoney(amount, currency));
}

function sumByCurrency(accounts: AccountData[]): CurrencyAmount[] {
  const totals = new Map<CurrencyCode, number>();
  for (const account of accounts) {
    totals.set(
      account.currency,
      (totals.get(account.currency) ?? 0) + account.balance,
    );
  }
  return Array.from(totals.entries()).map(([currency, amount]) => ({
    currency,
    amount,
    formatted: formatAmount(amount, currency),
  }));
}

function unionCurrencies(
  a: CurrencyAmount[],
  b: CurrencyAmount[],
): CurrencyCode[] {
  const set = new Set<CurrencyCode>();
  for (const item of a) set.add(item.currency);
  for (const item of b) set.add(item.currency);
  return Array.from(set);
}

export function buildAssetsOverview(ledger: LedgerData): {
  assets: CurrencyAmount[];
  liabilities: CurrencyAmount[];
  netWorth: CurrencyAmount[];
} {
  const assets = sumByCurrency(
    ledger.accounts.filter((a) => a.type === AccountType.ASSETS),
  );
  const liabilities = sumByCurrency(
    ledger.accounts.filter((a) => a.type === AccountType.LIABILITIES),
  );
  const netWorth = unionCurrencies(assets, liabilities).map((currency) => {
    const assetsAmount =
      assets.find((a) => a.currency === currency)?.amount ?? 0;
    const liabilitiesAmount =
      liabilities.find((a) => a.currency === currency)?.amount ?? 0;
    const amount = assetsAmount - liabilitiesAmount;
    return { currency, amount, formatted: formatAmount(amount, currency) };
  });

  return { assets, liabilities, netWorth };
}

export function buildAccountGroups(
  ledger: LedgerData,
  types: AccountType[],
): AccountGroup[] {
  return types.map((type) => {
    const accounts = ledger.accounts.filter((a) => a.type === type);
    const rows = accounts
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((account) => {
        const level = account.path.split(":").length - 1;
        return {
          id: account.id,
          name: account.name,
          type: account.type,
          currency: account.currency,
          balance: account.balance,
          formattedBalance: formatAmount(account.balance, account.currency),
          level,
          path: account.path,
          isRoot: account.parentId === null,
          archived: account.archived,
        };
      });

    return { type, rows, totals: sumByCurrency(accounts) };
  });
}

export function buildEntryRows(ledger: LedgerData): EntryRow[] {
  const accountMap = new Map(ledger.accounts.map((a) => [a.id, a]));
  return ledger.entries
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((entry) => {
      const currency = getEntryCurrency(entry, accountMap);
      const amount = getEntryAmount(entry);
      const category = getEntryCategory(entry, accountMap);
      const formatted = formatSignedAmount(amount, currency, category);
      const accountNames = Array.from(
        new Set(
          entry.lines.map(
            (line) => accountMap.get(line.accountId)?.name ?? line.accountId,
          ),
        ),
      );
      return {
        id: entry.id,
        date: entry.date,
        description: entry.description,
        payee: entry.payee,
        tags: entry.tags,
        category,
        currency,
        amount,
        formattedAmount: formatted,
        accounts: accountNames,
        lineCount: entry.lines.length,
      };
    });
}

export function buildPeriodSummary(
  ledger: LedgerData,
  dateRange: DateRange,
): PeriodSummary {
  const currency = ledger.defaultCurrency;
  const summary = calculatePeriodSummary(ledger, dateRange);
  return {
    income: {
      currency,
      amount: summary.income,
      formatted: formatAmount(summary.income, currency),
    },
    expenses: {
      currency,
      amount: summary.expenses,
      formatted: formatAmount(summary.expenses, currency),
    },
    netChange: {
      currency,
      amount: summary.netChange,
      formatted: formatAmount(summary.netChange, currency),
    },
  };
}

export function getCurrentMonthRange(now: Date = new Date()): DateRange {
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end = now.toISOString().split("T")[0];
  return { start, end };
}

function formatSignedAmount(
  amount: number,
  currency: CurrencyCode,
  category: EntryRow["category"],
): string {
  const formatted = formatAmount(amount, currency);
  if (category === "expense") return `-${formatted}`;
  if (category === "income") return `+${formatted}`;
  return formatted;
}
