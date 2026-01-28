import type { LedgerData } from "~/lib/double-entry/types";
import { AccountType } from "~/lib/double-entry/types";
import { createSimpleEntry } from "~/lib/double-entry/entry";
import {
  addAccount,
  addEntry,
  createLedger,
  getRootAccount,
} from "~/lib/double-entry/ledger";

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

export function createDemoLedger(): LedgerData {
  let ledger = createLedger({ name: "Personal", defaultCurrency: "CNY" });

  const assetsRoot = getRootAccount(ledger, AccountType.ASSETS)!;
  const liabilitiesRoot = getRootAccount(ledger, AccountType.LIABILITIES)!;
  const equityRoot = getRootAccount(ledger, AccountType.EQUITY)!;
  const incomeRoot = getRootAccount(ledger, AccountType.INCOME)!;
  const expensesRoot = getRootAccount(ledger, AccountType.EXPENSES)!;

  ledger = addAccount(ledger, { name: "Cash", parentId: assetsRoot.id });
  ledger = addAccount(ledger, { name: "Bank", parentId: assetsRoot.id });
  ledger = addAccount(ledger, {
    name: "Credit Card",
    parentId: liabilitiesRoot.id,
  });
  ledger = addAccount(ledger, { name: "Opening", parentId: equityRoot.id });
  ledger = addAccount(ledger, { name: "Salary", parentId: incomeRoot.id });
  ledger = addAccount(ledger, { name: "Food", parentId: expensesRoot.id });
  ledger = addAccount(ledger, {
    name: "Transport",
    parentId: expensesRoot.id,
  });

  const cash = ledger.accounts.find((a) => a.path === "assets:cash")!;
  const bank = ledger.accounts.find((a) => a.path === "assets:bank")!;
  const creditCard = ledger.accounts.find(
    (a) => a.path === "liabilities:credit-card",
  )!;
  const opening = ledger.accounts.find((a) => a.path === "equity:opening")!;
  const salary = ledger.accounts.find((a) => a.path === "income:salary")!;
  const food = ledger.accounts.find((a) => a.path === "expenses:food")!;
  const transport = ledger.accounts.find(
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

  ledger = addEntry(ledger, openingEntry);
  ledger = addEntry(ledger, salaryEntry);
  ledger = addEntry(ledger, lunchEntry);
  ledger = addEntry(ledger, metroEntry);
  ledger = addEntry(ledger, cardEntry);

  return ledger;
}
