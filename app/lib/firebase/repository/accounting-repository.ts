/**
 * Accounting repository (book-centric)
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
  updateDoc,
  writeBatch,
  Timestamp,
  where,
  type Firestore,
} from "firebase/firestore";
import { getApps } from "firebase/app";
import type {
  AccountData,
  BookData,
  JournalEntryData,
  ExchangeRate,
  CurrencyCode,
} from "~/lib/double-entry/types";
import { AccountType, EntryLineType } from "~/lib/double-entry/types";
import { createBook } from "~/lib/double-entry/book";
import { createAccount, isDebitIncreaseAccount } from "~/lib/double-entry/account";
import { fromMainUnit } from "~/lib/double-entry/money";
import { createEntry } from "~/lib/double-entry/entry";

export type BookRole = "owner" | "editor" | "viewer";

export type BookSummary = {
  id: string;
  name: string;
  role: BookRole;
  archived?: boolean;
  defaultCurrency?: CurrencyCode;
  joinedAt: string;
  updatedAt?: string;
};

export type BookInvite = {
  id: string;
  bookId: string;
  bookName: string;
  inviterId: string;
  inviteeEmail: string;
  role: BookRole;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  acceptedAt?: string;
};

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
    lines: Array.isArray(data.lines)
      ? (data.lines as JournalEntryData["lines"])
      : [],
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    payee: data.payee as string | undefined,
    note: data.note as string | undefined,
    createdBy: data.createdBy as string | undefined,
    updatedBy: data.updatedBy as string | undefined,
    createdAt: normalizeTimestamp(data.createdAt) ?? now,
    updatedAt: normalizeTimestamp(data.updatedAt) ?? now,
  };
}

function normalizeBookSummary(
  id: string,
  data: Record<string, unknown>,
): BookSummary {
  const now = new Date().toISOString();
  return {
    id,
    name: String(data.name ?? "Main"),
    role: (data.role as BookRole) ?? "editor",
    archived: data.archived as boolean | undefined,
    defaultCurrency: data.defaultCurrency as CurrencyCode | undefined,
    joinedAt: normalizeTimestamp(data.joinedAt) ?? now,
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

export async function listUserBooks(userId: string): Promise<BookSummary[]> {
  const db = getDB();
  const snap = await getDocs(collection(db, `users/${userId}/books`));
  return snap.docs.map((docItem) =>
    normalizeBookSummary(docItem.id, docItem.data()),
  );
}

export async function ensureDefaultBook(
  userId: string,
): Promise<BookSummary> {
  const books = await listUserBooks(userId);
  if (books.length > 0) return books[0];
  return createBookForUser(userId, { name: "Main", defaultCurrency: "CNY" });
}

export async function createBookForUser(
  userId: string,
  params: { name: string; defaultCurrency?: CurrencyCode },
): Promise<BookSummary> {
  const db = getDB();
  const bookRef = doc(collection(db, "books"));
  const bookId = bookRef.id;
  const book = createBook({
    name: params.name,
    defaultCurrency: params.defaultCurrency ?? "CNY",
  });
  book.id = bookId;

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  batch.set(bookRef, {
    name: book.name,
    description: book.description ?? null,
    defaultCurrency: book.defaultCurrency,
    exchangeRates: book.exchangeRates,
    commonTags: book.commonTags,
    icon: book.icon ?? null,
    archived: book.archived ?? false,
    createdAt: now,
    updatedAt: now,
  });

  for (const account of book.accounts) {
    const accountRef = doc(db, `books/${bookId}/accounts`, account.id);
    batch.set(accountRef, { ...account });
  }

  const memberRef = doc(db, `books/${bookId}/members`, userId);
  batch.set(memberRef, { role: "owner", status: "active", joinedAt: now });

  const userBookRef = doc(db, `users/${userId}/books`, bookId);
  batch.set(userBookRef, {
    name: book.name,
    role: "owner",
    defaultCurrency: book.defaultCurrency,
    joinedAt: now,
    updatedAt: now,
  });

  await batch.commit();

  return {
    id: bookId,
    name: book.name,
    role: "owner",
    defaultCurrency: book.defaultCurrency,
    joinedAt: now,
    updatedAt: now,
  };
}

export async function fetchBookSnapshot(
  userId: string,
  bookId: string,
): Promise<BookData | null> {
  const db = getDB();
  const memberRef = doc(db, `books/${bookId}/members`, userId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) {
    return null;
  }

  const bookRef = doc(db, "books", bookId);
  const bookSnap = await getDoc(bookRef);
  if (!bookSnap.exists()) {
    return null;
  }

  const bookData = bookSnap.data() as Record<string, unknown>;
  const accountsSnap = await getDocs(
    collection(db, `books/${bookId}/accounts`),
  );
  const entriesSnap = await getDocs(
    query(
      collection(db, `books/${bookId}/entries`),
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
    id: bookSnap.id,
    name: String(bookData.name ?? "Main"),
    description: bookData.description as string | undefined,
    accounts,
    entries,
    defaultCurrency:
      (bookData.defaultCurrency as BookData["defaultCurrency"]) ?? "CNY",
    exchangeRates:
      (bookData.exchangeRates as ExchangeRate[]) ?? ([] as ExchangeRate[]),
    commonTags: (bookData.commonTags as string[]) ?? [],
    icon: bookData.icon as string | undefined,
    archived: bookData.archived as boolean | undefined,
    createdAt: normalizeTimestamp(bookData.createdAt) ?? now,
    updatedAt: normalizeTimestamp(bookData.updatedAt) ?? now,
  };
}

export async function createAccountForBook(
  userId: string,
  params: {
    bookId: string;
    name: string;
    parentId: string;
    icon?: string;
    note?: string;
  },
): Promise<AccountData> {
  const db = getDB();
  const memberRef = doc(db, `books/${params.bookId}/members`, userId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) {
    throw new Error("No access to book");
  }
  const memberData = memberSnap.data() as { role?: BookRole } | undefined;
  const role = memberData?.role ?? "viewer";
  if (role !== "owner" && role !== "editor") {
    throw new Error("Permission denied");
  }

  const parentRef = doc(
    db,
    `books/${params.bookId}/accounts`,
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
    `books/${params.bookId}/accounts`,
    account.id,
  );
  await setDoc(accountRef, { ...account, updatedAt: now, createdAt: now });

  const bookRef = doc(db, "books", params.bookId);
  await updateDoc(bookRef, { updatedAt: now });

  return account;
}

export async function createSimpleEntryForBook(
  userId: string,
  params: {
    bookId: string;
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
  const memberRef = doc(db, `books/${params.bookId}/members`, userId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) {
    throw new Error("No access to book");
  }

  const debitRef = doc(
    db,
    `books/${params.bookId}/accounts`,
    params.debitAccountId,
  );
  const creditRef = doc(
    db,
    `books/${params.bookId}/accounts`,
    params.creditAccountId,
  );
  const entryRef = doc(collection(db, `books/${params.bookId}/entries`));

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
      { accountId: debitAccount.id, amount, type: EntryLineType.DEBIT },
      { accountId: creditAccount.id, amount, type: EntryLineType.CREDIT },
    ];
    entry.createdBy = userId;
    entry.updatedBy = userId;
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
      createdBy: userId,
      updatedBy: userId,
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
    tx.set(doc(db, "books", params.bookId), { updatedAt: now }, { merge: true });

    return entry;
  });
}

export async function createBookInvite(
  userId: string,
  params: { bookId: string; inviteeEmail: string; role?: BookRole },
): Promise<BookInvite> {
  const db = getDB();
  const memberRef = doc(db, `books/${params.bookId}/members`, userId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) {
    throw new Error("No access to book");
  }
  const inviteRef = doc(collection(db, `books/${params.bookId}/invites`));
  const inboxRef = doc(db, "invites", inviteRef.id);
  const bookRef = doc(db, "books", params.bookId);
  const bookSnap = await getDoc(bookRef);
  if (!bookSnap.exists()) {
    throw new Error("Book not found");
  }

  const bookName = String(bookSnap.data().name ?? "Book");
  const now = new Date().toISOString();
  const inviteData = {
    bookId: params.bookId,
    bookName,
    inviterId: userId,
    inviteeEmail: params.inviteeEmail.toLowerCase(),
    role: params.role ?? "editor",
    status: "pending",
    createdAt: now,
  };

  const batch = writeBatch(db);
  batch.set(inviteRef, inviteData);
  batch.set(inboxRef, inviteData);
  await batch.commit();

  return { id: inviteRef.id, ...inviteData };
}

export async function listInvitesForUser(
  email: string,
): Promise<BookInvite[]> {
  const db = getDB();
  const normalized = email.toLowerCase();
  const snap = await getDocs(
    query(collection(db, "invites"), where("inviteeEmail", "==", normalized)),
  );
  return snap.docs
    .map((docItem) => {
      const data = docItem.data() as Record<string, unknown>;
      const now = new Date().toISOString();
      return {
        id: docItem.id,
        bookId: String(data.bookId ?? ""),
        bookName: String(data.bookName ?? "Book"),
        inviterId: String(data.inviterId ?? ""),
        inviteeEmail: String(data.inviteeEmail ?? ""),
        role: (data.role as BookRole) ?? "editor",
        status: (data.status as BookInvite["status"]) ?? "pending",
        createdAt: normalizeTimestamp(data.createdAt) ?? now,
      acceptedAt: normalizeTimestamp(data.acceptedAt),
    };
  })
  .filter((invite) => invite.status === "pending");
}

export async function acceptBookInvite(
  userId: string,
  invite: BookInvite,
): Promise<void> {
  const db = getDB();
  const inviteRef = doc(
    db,
    `books/${invite.bookId}/invites`,
    invite.id,
  );
  const inboxRef = doc(db, "invites", invite.id);
  const memberRef = doc(db, `books/${invite.bookId}/members`, userId);
  const userBookRef = doc(db, `users/${userId}/books`, invite.bookId);

  const now = new Date().toISOString();

  await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) {
      throw new Error("Invite not found");
    }
    const data = inviteSnap.data() as Record<string, unknown>;
    if (String(data.status ?? "") !== "pending") {
      throw new Error("Invite is no longer available");
    }

    const bookName = String(data.bookName ?? "Book");
    const role = (data.role as BookRole) ?? "editor";

    tx.set(memberRef, { role, status: "active", joinedAt: now });
    tx.set(userBookRef, {
      name: bookName,
      role,
      joinedAt: now,
      updatedAt: now,
    });
    tx.update(inviteRef, { status: "accepted", acceptedAt: now });
    tx.update(inboxRef, { status: "accepted", acceptedAt: now });
  });
}
