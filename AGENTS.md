# Repository Guidelines

## Project Structure & Module Organization
- `app/` is the main React Router v7 app.
  - `app/routes/` contains route modules and API handlers.
  - `app/components/` contains reusable UI components.
  - `app/lib/` contains shared logic (Firebase, accounting, storage, i18n).
- `docs/` holds design and architecture notes.
- `public/` is for static assets.
- `build/` is the production output (generated).
- Tests live under `app/**/__tests__/` (example: `app/lib/double-entry/__tests__`).

## Build, Test, and Development Commands
- `pnpm dev` — start the local dev server (React Router dev).
- `pnpm build` — build the production bundle.
- `pnpm start` — serve the built app from `build/`.
- `pnpm test` / `pnpm test:run` — run Vitest (watch / single run).
- `pnpm typecheck` — run React Router typegen + TypeScript.
- `pnpm format` / `pnpm format:check` — format code with `oxfmt`.

## Coding Style & Naming Conventions
- TypeScript + React, ES modules.
- Indentation: 2 spaces; strings use double quotes (match existing files).
- Components: PascalCase (`BookSelector`), files: kebab-case (`book-selector.tsx`).
- Routes: `app/routes/*.tsx` or `app/routes/api.*.ts`.
- Use `oxfmt` for formatting and keep imports sorted as-is.

## Testing Guidelines
- Framework: Vitest.
- Tests in `__tests__` directories with `*.test.ts` naming.
- Add/adjust tests when changing accounting or storage logic.
- Run `pnpm test:run` before larger refactors.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (e.g., `feat: ...`, `fix: ...`, `refactor: ...`, `chore: ...`, `docs: ...`).
- PRs should include: summary, relevant screenshots for UI changes, and test notes (what was run).

## Configuration & Security Notes
- Client Firebase config uses Vite env vars in `.env`:
  - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
    `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- Server auth uses admin creds (see `app/lib/firebase/admin.server.ts`):
  - `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_PRIVATE_KEY`, `VITE_FIREBASE_CLIENT_EMAIL`.

## Firebase Indexes
- Firestore will surface index errors at runtime with a console link. Use that link to create the required composite index.
- Inbox queries use the top-level `invites` collection (by `inviteeEmail`) to avoid collection-group index requirements.
- If you add new queries with multiple `where` + `orderBy`, expect a new index; capture the index link in the PR description.
