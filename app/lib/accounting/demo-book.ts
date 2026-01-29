import type { BookData } from "~/lib/double-entry/types";
import { AccountType } from "~/lib/double-entry/types";
import { createSimpleEntry } from "~/lib/double-entry/entry";
import {
  addAccount,
  addEntry,
  createBook,
  getRootAccount,
} from "~/lib/double-entry/book";

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

export function createDemoBook(): BookData {
  let book = createBook({ name: "Personal", defaultCurrency: "CNY" });

  const assetsRoot = getRootAccount(book, AccountType.ASSETS)!;
  const liabilitiesRoot = getRootAccount(book, AccountType.LIABILITIES)!;
  const equityRoot = getRootAccount(book, AccountType.EQUITY)!;
  const incomeRoot = getRootAccount(book, AccountType.INCOME)!;
  const expensesRoot = getRootAccount(book, AccountType.EXPENSES)!;

  book = addAccount(book, { name: "Cash", parentId: assetsRoot.id });
  book = addAccount(book, { name: "Bank", parentId: assetsRoot.id });
  book = addAccount(book, {
    name: "Credit Card",
    parentId: liabilitiesRoot.id,
  });
  book = addAccount(book, { name: "Opening", parentId: equityRoot.id });
  book = addAccount(book, { name: "Salary", parentId: incomeRoot.id });
  book = addAccount(book, { name: "Food", parentId: expensesRoot.id });
  book = addAccount(book, { name: "Transport", parentId: expensesRoot.id });

  const cash = book.accounts.find((a) => a.path === "assets:cash")!;
  const bank = book.accounts.find((a) => a.path === "assets:bank")!;
  const creditCard = book.accounts.find(
    (a) => a.path === "liabilities:credit-card",
  )!;
  const opening = book.accounts.find((a) => a.path === "equity:opening")!;
  const salary = book.accounts.find((a) => a.path === "income:salary")!;
  const food = book.accounts.find((a) => a.path === "expenses:food")!;
  const transport = book.accounts.find(
    (a) => a.path === "expenses:transport",
  )!;

  const openingEntry = createSimpleEntry({
    date: dateDaysAgo(25),
    description: "Opening balance",
    debitAccountId: cash.id,
    creditAccountId: opening.id,
    amount: 120000,
    tags: ["initial"],
  });

  const salaryEntry = createSimpleEntry({
    date: dateDaysAgo(20),
    description: "Salary",
    debitAccountId: bank.id,
    creditAccountId: salary.id,
    amount: 800000,
    tags: ["income"],
  });

  const lunchEntry = createSimpleEntry({
    date: dateDaysAgo(6),
    description: "Lunch",
    debitAccountId: food.id,
    creditAccountId: cash.id,
    amount: 4500,
    tags: ["food"],
  });

  const metroEntry = createSimpleEntry({
    date: dateDaysAgo(2),
    description: "Metro",
    debitAccountId: transport.id,
    creditAccountId: cash.id,
    amount: 1200,
    tags: ["transport"],
  });

  const cardEntry = createSimpleEntry({
    date: dateDaysAgo(1),
    description: "Grocery",
    debitAccountId: food.id,
    creditAccountId: creditCard.id,
    amount: 3200,
    tags: ["food"],
  });

  book = addEntry(book, openingEntry);
  book = addEntry(book, salaryEntry);
  book = addEntry(book, lunchEntry);
  book = addEntry(book, metroEntry);
  book = addEntry(book, cardEntry);

  return book;
}
