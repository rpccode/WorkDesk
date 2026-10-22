# Repository Guidelines

## Project Structure

WorkDesk is a desktop app built with React, TypeScript, Vite, and Tauri 2. Frontend code lives in `src/`: top-level screens are in `views/`, reusable UI in `components/`, shared state in `store/`, native API wrappers in `api/`, and domain helpers in `utils/` and `services/`. Rust commands and SQLite access are in `src-tauri/src/`; schema changes belong in `src-tauri/src/db/migrations/`. Static assets are in `public/`, and unit tests are in `tests/unit/`.

## Build, Test, and Development

- `npm install` installs the locked frontend dependencies.
- `npm run dev` starts the Vite frontend for browser-side work.
- `npm run tauri dev` runs the desktop app with its Rust backend.
- `npm run build` type-checks with `tsc` and builds the frontend with Vite.
- `npx vitest run` runs the unit test suite once.
- `npm run build:exe:debug` creates an unsigned debug desktop build; release and publish scripts can change versions, sign installers, or publish externally, so use them only for an intentional release.

## Coding Style and Naming

Follow existing patterns: two-space indentation in TypeScript/JSON, PascalCase React components, camelCase functions and variables, kebab-case utility filenames, and snake_case Rust modules/functions. Keep Tauri calls behind `src/api/tauri.ts`; use typed inputs and bound SQL parameters. Reuse CSS design tokens from `src/index.css`. No root lint or formatting script is currently defined.

## Testing

Add or update focused Vitest tests in `tests/unit/` using `<subject>.test.ts`. Cover normal behavior and relevant empty, invalid, or boundary inputs. Run `npx vitest run` and `npm run build` for frontend changes; native command or migration changes also need appropriate Rust-side validation. No coverage threshold is configured.

## Commits and Pull Requests

Recent history uses concise prefixes such as `feat:`, `fix:`, `docs:`, and `chore:`; keep commits focused and describe the change. PRs should summarize behavior and impact, link a related issue when available, list validation performed, and include screenshots for visible UI changes. Call out database, configuration, or release effects.

## Security and Configuration

Keep credentials and signing keys out of source control; use environment configuration based on `.env.example`. Treat local customer data and database migrations as sensitive: parameterize queries, preserve existing records, and explain migration and rollback implications in the PR.
