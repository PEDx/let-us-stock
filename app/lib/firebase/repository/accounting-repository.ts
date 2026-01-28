/**
 * Accounting repository
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  writeBatch,
  Timestamp,
  type Firestore,
} from "firebase/firestore";
import { getApps } from "firebase/app";
import type {
  AccountData,
  JournalEntryData,
  LedgerData,
} from "~/lib/double-entry/types";
import { AccountType, LedgerType } from "~/lib/double-entry/types";
import { createLedger } from "~/lib/double-entry/ledger";
import { createAccount, isDebitIncreaseAccount } from "~/lib/double-entry/account";
import { fromMainUnit } from "~/lib/double-entry/money";
import { createEntry } from "~/lib/double-entry/entry";

let db: Firestore | null = null;

function getDB(): Firestore {
  if (!db) {
    const app = getApps()[0];
    db = getFirestore(app);
  }
  return db;
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return undefined;
}

function normalizeDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString().split("T")[0];
  }
  if (typeof value === "string") return value;
  return undefined;
}

async function getBookIdForUser(userId: string): Promise<string> {
  const db = getDB();
  const metaRef = doc(db, `users/${userId}/meta`, "accounting");
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists()) {
    const data = metaSnap.data() as { bookId?: string };
    if (data.bookId) return data.bookId;
  }
  return userId;
}

async function getMainLedgerId(bookId: string): Promise<string> {
  const db = getDB();
  const bookRef = doc(db, "books", bookId);
  const bookSnap = await getDoc(bookRef);
  if (bookSnap.exists()) {
    const data = bookSnap.data() as { mainLedgerId?: string };
    if (data.mainLedgerId) return data.mainLedgerId;
  }
  return "main";
}

async function resolveLedger(userId: string, ledgerId?: string) {
  const bookId = await getBookIdForUser(userId);
  const resolvedLedgerId = ledgerId ?? (await getMainLedgerId(bookId));
  return { bookId, ledgerId: resolvedLedgerId };
}

export async function initializeAccounting(userId: string): Promise<{
  bookId: string;
  ledgerId: string;
}> {
  const db = getDB();
  const bookId = await getBookIdForUser(userId);
  const bookRef = doc(db, "books", bookId);
  const bookSnap = await getDoc(bookRef);
  if (bookSnap.exists()) {
    const data = bookSnap.data() as { mainLedgerId?: string };
    const existingLedgerId = data.mainLedgerId ?? "main";
    const ledgerRef = doc(db, `books/${bookId}/ledgers`, existingLedgerId);
    const ledgerSnap = await getDoc(ledgerRef);
    if (ledgerSnap.exists()) {
      return { bookId, ledgerId: existingLedgerId };
    }
    return createMissingLedger(bookId, existingLedgerId);
  }

  const ledgerId = "main";
  await createBookWithLedger(bookId, ledgerId, userId);
  return { bookId, ledgerId };
}

async function createBookWithLedger(
  bookId: string,
  ledgerId: string,
  userId: string,
) {
  const db = getDB();
  const ledger = createLedger({
    name: "Main",
    type: LedgerType.MAIN,
    defaultCurrency: "CNY",
  });
  ledger.id = ledgerId;

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  const bookRef = doc(db, "books", bookId);
  batch.set(bookRef, {
    mainLedgerId: ledgerId,
    commonTags: [],
    exchangeRates: [],
    createdAt: now,
    updatedAt: now,
  });

  const ledgerRef = doc(db, `books/${bookId}/ledgers`, ledgerId);
  batch.set(ledgerRef, {
    name: ledger.name,
    type: ledger.type,
    description: ledger.description ?? null,
    defaultCurrency: ledger.defaultCurrency,
    icon: ledger.icon ?? null,
    archived: ledger.archived ?? false,
    createdAt: now,
    updatedAt: now,
  });

  for (const account of ledger.accounts) {
    const accountRef = doc(
      db,
      `books/${bookId}/ledgers/${ledgerId}/accounts`,
      account.id,
    );
    batch.set(accountRef, {
      ...account,
    });
  }

  const memberRef = doc(db, `books/${bookId}/members`, userId);
  batch.set(memberRef, {
    role: "owner",
    joinedAt: now,
    status: "active",
  });

  const metaRef = doc(db, `users/${userId}/meta`, "accounting");
  batch.set(metaRef, { bookId, updatedAt: now });

  await batch.commit();
}

async function createMissingLedger(bookId: string, ledgerId: string) {
  const db = getDB();
  const ledger = createLedger({
    name: "Main",
    type: LedgerType.MAIN,
    defaultCurrency: "CNY",
  });
  ledger.id = ledgerId;

  const now = new Date().toISOString();
  const batch = writeBatch(db);
  const ledgerRef = doc(db, `books/${bookId}/ledgers`, ledgerId);
  batch.set(ledgerRef, {
    name: ledger.name,
    type: ledger.type,
    description: ledger.description ?? null,
    defaultCurrency: ledger.defaultCurrency,
    icon: ledger.icon ?? null,
    archived: ledger.archived ?? false,
    createdAt: now,
    updatedAt: now,
  });

  for (const account of ledger.accounts) {
    const accountRef = doc(
      db,
      `books/${bookId}/ledgers/${ledgerId}/accounts`,
      account.id,
    );
    batch.set(accountRef, {
      ...account,
    });
  }

  await batch.commit();
  return { bookId, ledgerId };
}

function normalizeAccountDoc(
  id: string,
  data: Record<string, unknown>,
): AccountData {
  const now = new Date().toISOString();
  return {
    id,
    name: String(data.name ?? "Account"),
    type: (data.type as AccountData["type"]) ?? AccountType.ASSETS,
    currency: (data.currency as AccountData["currency"]) ?? "CNY",
    parentId: (data.parentId as string | null) ?? null,
    path: (data.path as string) ?? String(data.type ?? AccountType.ASSETS),
    balance: typeof data.balance === "number" ? data.balance : 0,
    icon: data.icon as string | undefined,
    note: data.note as string | undefined,
    archived: data.archived as boolean | undefined,
    createdAt: normalizeTimestamp(data.createdAt) ?? now,
    updatedAt: normalizeTimestamp(data.updatedAt) ?? now,
  };
}

function normalizeEntryDoc(
  id: string,
  data: Record<string, unknown>,
): JournalEntryData {
  const now = new Date().toISOString();
  return {
    id,
    date: normalizeDate(data.date) ?? now.split("T")[0],
    description: String(data.description ?? ""),
    lines: Array.isArray(data.lines) ? (data.lines as JournalEntryData["lines"]) : [],
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    payee: data.payee as string | undefined,
    note: data.note as string | undefined,
    createdAt: normalizeTimestamp(data.createdAt) ?? now,
    updatedAt: normalizeTimestamp(data.updatedAt) ?? now,
  };
}

export async function fetchLedgerSnapshot(
  userId: string,
  ledgerId?: string,
): Promise<LedgerData | null> {
  const db = getDB();
  const bookId = await getBookIdForUser(userId);
  const resolvedLedgerId = ledgerId ?? (await getMainLedgerId(bookId));

  const ledgerRef = doc(db, `books/${bookId}/ledgers`, resolvedLedgerId);
  const ledgerSnap = await getDoc(ledgerRef);

  if (!ledgerSnap.exists()) {
    return null;
  }

  const ledgerData = ledgerSnap.data() as Record<string, unknown>;
  const accountsSnap = await getDocs(
    collection(db, `books/${bookId}/ledgers/${resolvedLedgerId}/accounts`),
  );
  const entriesSnap = await getDocs(
    query(
      collection(db, `books/${bookId}/ledgers/${resolvedLedgerId}/entries`),
      orderBy("date", "desc"),
      limit(200),
    ),
  );

  const accounts = accountsSnap.docs.map((docItem) =>
    normalizeAccountDoc(docItem.id, docItem.data()),
  );
  const entries = entriesSnap.docs.map((docItem) =>
    normalizeEntryDoc(docItem.id, docItem.data()),
  );

  const now = new Date().toISOString();
  return {
    id: ledgerSnap.id,
    name: String(ledgerData.name ?? "Main"),
    type: (ledgerData.type as LedgerData["type"]) ?? LedgerType.MAIN,
    description: ledgerData.description as string | undefined,
    accounts,
    entries,
    defaultCurrency: (ledgerData.defaultCurrency as LedgerData["defaultCurrency"]) ?? "CNY",
    icon: ledgerData.icon as string | undefined,
    archived: ledgerData.archived as boolean | undefined,
    createdAt: normalizeTimestamp(ledgerData.createdAt) ?? now,
    updatedAt: normalizeTimestamp(ledgerData.updatedAt) ?? now,
  };
}

export async function createAccountForLedger(
  userId: string,
  params: {
    ledgerId?: string;
    name: string;
    parentId: string;
    icon?: string;
    note?: string;
  },
): Promise<AccountData> {
  const db = getDB();
  let { bookId, ledgerId } = await resolveLedger(userId, params.ledgerId);

  let ledgerRef = doc(db, `books/${bookId}/ledgers`, ledgerId);
  const ledgerSnap = await getDoc(ledgerRef);
  if (!ledgerSnap.exists()) {
    await initializeAccounting(userId);
    ({ bookId, ledgerId } = await resolveLedger(userId, params.ledgerId));
    ledgerRef = doc(db, `books/${bookId}/ledgers`, ledgerId);
  }

  const parentRef = doc(
    db,
    `books/${bookId}/ledgers/${ledgerId}/accounts`,
    params.parentId,
  );
  const parentSnap = await getDoc(parentRef);
  if (!parentSnap.exists()) {
    throw new Error("Parent account not found");
  }
  const parent = normalizeAccountDoc(parentSnap.id, parentSnap.data());

  const account = createAccount({
    name: params.name,
    type: parent.type,
    currency: parent.currency,
    parentId: parent.id,
    parentPath: parent.path,
  });
  if (params.icon) account.icon = params.icon;
  if (params.note) account.note = params.note;

  const now = new Date().toISOString();
  const accountRef = doc(
    db,
    `books/${bookId}/ledgers/${ledgerId}/accounts`,
    account.id,
  );
  await setDoc(accountRef, { ...account, updatedAt: now, createdAt: now });

  await setDoc(ledgerRef, { updatedAt: now }, { merge: true });

  return account;
}

export async function createSimpleEntryForLedger(
  userId: string,
  params: {
    ledgerId?: string;
    date: string;
    description: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    tags?: string[];
    payee?: string;
    note?: string;
  },
): Promise<JournalEntryData> {
  const db = getDB();
  let { bookId, ledgerId } = await resolveLedger(userId, params.ledgerId);

  let ledgerRef = doc(db, `books/${bookId}/ledgers`, ledgerId);
  const ledgerSnap = await getDoc(ledgerRef);
  if (!ledgerSnap.exists()) {
    await initializeAccounting(userId);
    ({ bookId, ledgerId } = await resolveLedger(userId, params.ledgerId));
    ledgerRef = doc(db, `books/${bookId}/ledgers`, ledgerId);
  }

  const debitRef = doc(
    db,
    `books/${bookId}/ledgers/${ledgerId}/accounts`,
    params.debitAccountId,
  );
  const creditRef = doc(
    db,
    `books/${bookId}/ledgers/${ledgerId}/accounts`,
    params.creditAccountId,
  );
  const entryRef = doc(
    collection(db, `books/${bookId}/ledgers/${ledgerId}/entries`),
  );

  const now = new Date().toISOString();

  return await runTransaction(db, async (tx) => {
    const debitSnap = await tx.get(debitRef);
    const creditSnap = await tx.get(creditRef);
    if (!debitSnap.exists() || !creditSnap.exists()) {
      throw new Error("Account not found");
    }

    const debitAccount = normalizeAccountDoc(debitSnap.id, debitSnap.data());
    const creditAccount = normalizeAccountDoc(creditSnap.id, creditSnap.data());

    if (debitAccount.currency !== creditAccount.currency) {
      throw new Error("Cross-currency entry is not supported");
    }
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const amount = fromMainUnit(params.amount, debitAccount.currency).amount;
    const entry = createEntry({
      date: params.date,
      description: params.description,
      tags: params.tags,
      payee: params.payee,
      note: params.note,
    });
    entry.id = entryRef.id;
    entry.lines = [
      {
        accountId: debitAccount.id,
        amount,
        type: "debit",
      },
      {
        accountId: creditAccount.id,
        amount,
        type: "credit",
      },
    ];
    entry.createdAt = now;
    entry.updatedAt = now;

    const debitDelta = isDebitIncreaseAccount(debitAccount.type)
      ? amount
      : -amount;
    const creditDelta = isDebitIncreaseAccount(creditAccount.type)
      ? -amount
      : amount;

    const entryData: Record<string, unknown> = {
      ...entry,
      currency: debitAccount.currency,
    };
    if (!entry.tags || entry.tags.length === 0) {
      delete entryData.tags;
    }
    if (!entry.payee) {
      delete entryData.payee;
    }
    if (!entry.note) {
      delete entryData.note;
    }

    tx.set(entryRef, entryData);
    tx.update(debitRef, {
      balance: debitAccount.balance + debitDelta,
      updatedAt: now,
    });
    tx.update(creditRef, {
      balance: creditAccount.balance + creditDelta,
      updatedAt: now,
    });
    tx.set(ledgerRef, { updatedAt: now }, { merge: true });

    return entry;
  });
}
