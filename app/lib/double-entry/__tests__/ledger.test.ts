import { describe, expect, it } from "vitest";

import { createSimpleEntry, updateEntry as updateEntryData } from "../entry";
import {
  addAccount,
  addEntry,
  createLedger,
  getRootAccount,
  removeEntry,
  updateEntry,
} from "../ledger";
import { AccountType } from "../types";

function setupLedger() {
  let ledger = createLedger({ name: "Test Ledger", defaultCurrency: "CNY" });
  const assetsRoot = getRootAccount(ledger, AccountType.ASSETS)!;
  const expensesRoot = getRootAccount(ledger, AccountType.EXPENSES)!;

  ledger = addAccount(ledger, { name: "Cash", parentId: assetsRoot.id });
  ledger = addAccount(ledger, { name: "Food", parentId: expensesRoot.id });

  const cash = ledger.accounts.find((a) => a.path === "assets:cash")!;
  const food = ledger.accounts.find((a) => a.path === "expenses:food")!;

  return { ledger, cashId: cash.id, foodId: food.id };
}

describe("ledger entry posting", () => {
  it("posts balances and can remove entry to revert", () => {
    let { ledger, cashId, foodId } = setupLedger();

    const entry = createSimpleEntry({
      date: "2024-01-01",
      description: "Lunch",
      debitAccountId: foodId,
      creditAccountId: cashId,
      amount: 500,
    });

    ledger = addEntry(ledger, entry);

    const cash = ledger.accounts.find((a) => a.id === cashId)!;
    const food = ledger.accounts.find((a) => a.id === foodId)!;

    expect(cash.balance).toBe(-500);
    expect(food.balance).toBe(500);

    ledger = removeEntry(ledger, entry.id);

    const cashAfter = ledger.accounts.find((a) => a.id === cashId)!;
    const foodAfter = ledger.accounts.find((a) => a.id === foodId)!;

    expect(cashAfter.balance).toBe(0);
    expect(foodAfter.balance).toBe(0);
  });

  it("updates entry by reversing old and applying new", () => {
    let { ledger, cashId, foodId } = setupLedger();

    let entry = createSimpleEntry({
      date: "2024-01-01",
      description: "Lunch",
      debitAccountId: foodId,
      creditAccountId: cashId,
      amount: 500,
    });

    ledger = addEntry(ledger, entry);

    entry = updateEntryData(entry, {
      lines: entry.lines.map((line) => ({ ...line, amount: 800 })),
    });

    ledger = updateEntry(ledger, entry);

    const cash = ledger.accounts.find((a) => a.id === cashId)!;
    const food = ledger.accounts.find((a) => a.id === foodId)!;

    expect(cash.balance).toBe(-800);
    expect(food.balance).toBe(800);
  });
});

describe("ledger currency rules", () => {
  it("rejects cross-currency entries", () => {
    let ledger = createLedger({ name: "Test Ledger", defaultCurrency: "CNY" });
    const assetsRoot = getRootAccount(ledger, AccountType.ASSETS)!;

    ledger = addAccount(ledger, { name: "CashCNY", parentId: assetsRoot.id });
    ledger = addAccount(ledger, {
      name: "WalletUSD",
      parentId: assetsRoot.id,
      currency: "USD",
    });

    const cashCny = ledger.accounts.find((a) => a.path === "assets:cashcny")!;
    const walletUsd = ledger.accounts.find(
      (a) => a.path === "assets:walletusd",
    )!;

    const entry = createSimpleEntry({
      date: "2024-01-02",
      description: "Exchange",
      debitAccountId: walletUsd.id,
      creditAccountId: cashCny.id,
      amount: 100,
    });

    expect(() => addEntry(ledger, entry)).toThrowError(
      /Cross-currency entry is not supported/,
    );
  });
});
