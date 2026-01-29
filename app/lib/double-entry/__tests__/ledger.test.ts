import { describe, expect, it } from "vitest";

import { createSimpleEntry, updateEntry as updateEntryData } from "../entry";
import {
  addAccount,
  addEntry,
  createBook,
  getRootAccount,
  removeEntry,
  updateEntry,
} from "../book";
import { AccountType } from "../types";

function setupBook() {
  let book = createBook({ name: "Test Book", defaultCurrency: "CNY" });
  const assetsRoot = getRootAccount(book, AccountType.ASSETS)!;
  const expensesRoot = getRootAccount(book, AccountType.EXPENSES)!;

  book = addAccount(book, { name: "Cash", parentId: assetsRoot.id });
  book = addAccount(book, { name: "Food", parentId: expensesRoot.id });

  const cash = book.accounts.find((a) => a.path === "assets:cash")!;
  const food = book.accounts.find((a) => a.path === "expenses:food")!;

  return { book, cashId: cash.id, foodId: food.id };
}

describe("book entry posting", () => {
  it("posts balances and can remove entry to revert", () => {
    let { book, cashId, foodId } = setupBook();

    const entry = createSimpleEntry({
      date: "2024-01-01",
      description: "Lunch",
      debitAccountId: foodId,
      creditAccountId: cashId,
      amount: 500,
    });

    book = addEntry(book, entry);

    const cash = book.accounts.find((a) => a.id === cashId)!;
    const food = book.accounts.find((a) => a.id === foodId)!;

    expect(cash.balance).toBe(-500);
    expect(food.balance).toBe(500);

    book = removeEntry(book, entry.id);

    const cashAfter = book.accounts.find((a) => a.id === cashId)!;
    const foodAfter = book.accounts.find((a) => a.id === foodId)!;

    expect(cashAfter.balance).toBe(0);
    expect(foodAfter.balance).toBe(0);
  });

  it("updates entry by reversing old and applying new", () => {
    let { book, cashId, foodId } = setupBook();

    let entry = createSimpleEntry({
      date: "2024-01-01",
      description: "Lunch",
      debitAccountId: foodId,
      creditAccountId: cashId,
      amount: 500,
    });

    book = addEntry(book, entry);

    entry = updateEntryData(entry, {
      lines: entry.lines.map((line) => ({ ...line, amount: 800 })),
    });

    book = updateEntry(book, entry);

    const cash = book.accounts.find((a) => a.id === cashId)!;
    const food = book.accounts.find((a) => a.id === foodId)!;

    expect(cash.balance).toBe(-800);
    expect(food.balance).toBe(800);
  });
});

describe("book currency rules", () => {
  it("rejects cross-currency entries", () => {
    let book = createBook({ name: "Test Book", defaultCurrency: "CNY" });
    const assetsRoot = getRootAccount(book, AccountType.ASSETS)!;

    book = addAccount(book, { name: "CashCNY", parentId: assetsRoot.id });
    book = addAccount(book, {
      name: "WalletUSD",
      parentId: assetsRoot.id,
      currency: "USD",
    });

    const cashCny = book.accounts.find((a) => a.path === "assets:cashcny")!;
    const walletUsd = book.accounts.find(
      (a) => a.path === "assets:walletusd",
    )!;

    const entry = createSimpleEntry({
      date: "2024-01-02",
      description: "Exchange",
      debitAccountId: walletUsd.id,
      creditAccountId: cashCny.id,
      amount: 100,
    });

    expect(() => addEntry(book, entry)).toThrowError(
      /Cross-currency entry is not supported/,
    );
  });
});
