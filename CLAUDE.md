# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack React application for US stock tracking and personal accounting. Combines real-time stock quotes via Yahoo Finance with a double-entry bookkeeping system.

## Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server (localhost:5173)
pnpm build      # Build for production (React Router SSR)
pnpm start      # Run production build
pnpm typecheck  # Run TypeScript checks
pnpm format     # Format code with oxfmt
pnpm format:check  # Check formatting
```

## Architecture

**Framework:** React Router v7 with SSR (via `@react-router/node`)
**UI:** Base-UI + Tailwind CSS 4.x + shadcn/ui-style components
**Data:** Firebase Firestore for data persistence, Firebase Auth for authentication

### Directory Structure

```
app/
├── components/           # React components (ui/, quote-table/, records/)
├── lib/                  # Business logic
│   ├── accounting/       # Accounting constants
│   ├── double-entry/     # Core bookkeeping (Books, Ledgers, Accounts, Journal Entries)
│   ├── firebase/         # Firebase integration
│   │   ├── config.ts     # Firebase initialization
│   │   ├── auth-context.tsx  # Auth context and hooks
│   │   ├── repository/   # Repository interfaces and implementations
│   │   │   ├── types.ts      # Repository interface definitions
│   │   │   ├── firestore-repository.ts  # Firestore implementation
│   │   │   └── groups-repository.ts     # Stock groups repository
│   │   └── services/     # Business services
│   │       └── book-service.ts  # Book/ledger operations
│   └── storage/types.ts  # Shared types
├── locales/              # i18n configuration
└── routes/               # Pages + API endpoints (api.*.ts)
```

### Key Patterns

**Data Fetching:** API routes use `export async function loader({ request })` pattern; client components fetch via `useEffect` + `fetch()`.

**State Management:** Auth/i18n use React Context; data uses Repository pattern with Firestore.

**UI Components:** shadcn/ui style with `cva` for variants, `clsx` + `tailwind-merge` for class composition.

**Money/Accounting:** Stored in smallest units as integers; use `fromMainUnit()` / `toMainUnit()` / `formatMoney()` helpers.

**Authentication:** Firebase Auth with GitHub provider. See `app/lib/firebase/auth-context.tsx` and `app/lib/firebase/config.ts`.

**Path Alias:** `~/*` maps to `./app/*` (e.g., `import { useBook } from "~/lib/accounting/use-book"`)

## API Routes

- `/api/quote` - Stock quotes from Yahoo Finance
- `/api/search` - Stock symbol search
- `/api/auth/me` - Get current user (supports both GitHub OAuth and Firebase)
- `/api/auth/firebase` - Firebase token management

## Firebase Setup

Required environment variables in `.env`:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Firestore data structure:

```
users/{userId}/
  meta/
    book        # Book metadata
    groups      # Stock groups data
  ledgers/{ledgerId}/
    accounts/   # Subcollection
    entries/    # Subcollection (分录)
```
