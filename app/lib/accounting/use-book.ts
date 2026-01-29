import { useEffect, useMemo, useState } from "react";
import type { BookData } from "~/lib/double-entry/types";
import { useAuth } from "~/lib/firebase/auth-context";
import {
  acceptBookInvite,
  createBookForUser,
  fetchBookSnapshot,
  listInvitesForUser,
  listUserBooks,
  type BookInvite,
  type BookSummary,
  createBookInvite,
} from "~/lib/firebase/repository";
import { createDemoBook } from "./demo-book";

export type BookSource = "cloud" | "demo" | "empty";

type BookState = {
  book: BookData | null;
  isLoading: boolean;
  error: string | null;
  source: BookSource;
  books: BookSummary[];
  selectedBookId: string | null;
  invites: BookInvite[];
};

const BOOK_SELECTION_KEY = "selectedBookId";

function loadStoredBookId(userId: string): string | null {
  try {
    const value = localStorage.getItem(`${BOOK_SELECTION_KEY}:${userId}`);
    return value || null;
  } catch {
    return null;
  }
}

function storeBookId(userId: string, bookId: string) {
  try {
    localStorage.setItem(`${BOOK_SELECTION_KEY}:${userId}`, bookId);
  } catch {
    // ignore
  }
}

export function useBookData() {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<BookState>({
    book: null,
    isLoading: true,
    error: null,
    source: "demo",
    books: [],
    selectedBookId: null,
    invites: [],
  });

  const loadBooks = async (active: { current: boolean }) => {
    if (!user) return;
    try {
      const books = await listUserBooks(user.id);
      if (!active.current) return;

      const storedId = loadStoredBookId(user.id);
      const nextId =
        storedId && books.some((b) => b.id === storedId)
          ? storedId
          : books[0]?.id ?? null;

      if (nextId) {
        storeBookId(user.id, nextId);
      }

      setState((prev) => ({
        ...prev,
        books,
        selectedBookId: nextId,
        book: nextId ? prev.book : null,
        isLoading: false,
        source: nextId ? prev.source : "empty",
      }));
    } catch (error) {
      if (!active.current) return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load books",
      }));
    }
  };

  const loadInvites = async (active: { current: boolean }) => {
    if (!user?.email) return;
    try {
      const pending = await listInvitesForUser(user.email);
      if (!active.current) return;
      setState((prev) => ({ ...prev, invites: pending }));
    } catch (error) {
      if (!active.current) return;
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to load invites",
      }));
    }
  };

  const loadBook = async (active: { current: boolean }, bookId: string) => {
    if (!user) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const book = await fetchBookSnapshot(user.id, bookId);
      if (!active.current) return;
      if (book) {
        setState((prev) => ({
          ...prev,
          book,
          isLoading: false,
          error: null,
          source: "cloud",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          book: null,
          isLoading: false,
          error: "Book not found",
          source: "empty",
        }));
      }
    } catch (error) {
      if (!active.current) return;
      setState((prev) => ({
        ...prev,
        book: createDemoBook(),
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load book",
        source: "demo",
      }));
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const active = { current: true };

    if (!user) {
      setState((prev) => ({
        ...prev,
        book: createDemoBook(),
        isLoading: false,
        error: null,
        source: "demo",
        books: [],
        selectedBookId: null,
        invites: [],
      }));
      return () => {
        active.current = false;
      };
    }

    void loadBooks(active);
    void loadInvites(active);

    return () => {
      active.current = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!user || !state.selectedBookId) return;
    const active = { current: true };
    void loadBook(active, state.selectedBookId);
    return () => {
      active.current = false;
    };
  }, [user, state.selectedBookId]);

  const selectBook = (bookId: string) => {
    if (!user) return;
    storeBookId(user.id, bookId);
    setState((prev) => ({ ...prev, selectedBookId: bookId }));
  };

  const createBookForCurrentUser = async (params: {
    name: string;
    defaultCurrency?: BookData["defaultCurrency"];
  }) => {
    if (!user) {
      throw new Error("Login required");
    }
    const created = await createBookForUser(user.id, params);
    setState((prev) => ({
      ...prev,
      books: [created, ...prev.books],
      selectedBookId: created.id,
    }));
    storeBookId(user.id, created.id);
    return created;
  };

  const sendInvite = async (params: { bookId: string; email: string }) => {
    if (!user) {
      throw new Error("Login required");
    }
    return createBookInvite(user.id, {
      bookId: params.bookId,
      inviteeEmail: params.email,
      role: "editor",
    });
  };

  const acceptInvite = async (invite: BookInvite) => {
    if (!user) {
      throw new Error("Login required");
    }
    await acceptBookInvite(user.id, invite);
    const active = { current: true };
    await loadBooks(active);
    await loadInvites(active);
  };

  const reload = async () => {
    if (!user || !state.selectedBookId) return;
    const active = { current: true };
    await loadBook(active, state.selectedBookId);
  };

  const hasBooks = useMemo(() => state.books.length > 0, [state.books.length]);

  return {
    ...state,
    hasBooks,
    selectBook,
    createBook: createBookForCurrentUser,
    sendInvite,
    acceptInvite,
    reload,
  };
}
