# CLAUDE.md — DolarBlue

> Project context for Claude Code. Loaded at the start of every session.
> Keep this file concise and current — if something here is wrong, fix it here first.

## Overview

DolarBlue is a React Native mobile app for tracking Argentine peso ↔ USD exchange
rates. It shows live quotes (blue, oficial, MEP, CCL, etc.) and historical charts.

- **Live quotes** are scraped from dolarhoy.com (chosen for accuracy) by a Supabase
  Edge Function and stored in Supabase. The client reads from Supabase, **not** by
  scraping HTML directly.
- **Historical data**: `fetchQuoteHistory` in `src/api/quotes.ts` auto-switches to our own
  `quotes_history_daily` once it has ≥30 days of data (`SUPABASE_HISTORY_MIN_DAYS`), falling
  back to argentinadatos.com below that. Crossed the threshold ~2026-07-20 (36+ days of data
  as of writing) — the client is now reading its own history, no code change needed.

## Tech stack

- React Native 0.76.5 + TypeScript 5
- React Navigation
- react-native-gifted-charts (charts)
- Supabase (Postgres + RLS + Edge Functions written in Deno)
- Data sources: dolarhoy.com (live, scraped), argentinadatos.com (historical / cross-validation)

## Architecture / data flow

```
dolarhoy.com ──scrape──> Edge Function (scrape-quotes) ──upsert──> Supabase tables
                              │                                         │
                  cross-validate blue vs                          read via REST
                  argentinadatos (20% threshold)                       │
                                                              React Native client
```

- A `pg_cron` + `pg_net` job triggers `scrape-quotes` every 5 minutes.
- The Edge Function parses dolarhoy.com via `deno-dom`, cross-validates the blue rate
  against argentinadatos with a 20% discrepancy threshold, then upserts results.

## Key client files

- `src/api/supabase.ts` — lightweight REST client (plain `fetch`)
- `src/api/quotes.ts` — `fetchLatestQuotes()` and `fetchQuoteHistory()`
- `src/types.ts` — `QuoteCode`, `QuoteRow`, `QUOTE_CODE_LIST` (static list for pickers)
- `src/settings.ts` — AsyncStorage-backed widget config (`slot1`/`slot2` codes) and push
  preferences (watched code + threshold %)
- `src/widget.ts` — `pushWidgetUpdate()`, shared between `HomeScreen` and the headless task
- `src/widgetRefreshTask.ts` — Headless JS task run by the widget's refresh button (Android)
- `src/HomeScreen.tsx` — latest quotes; also pushes widget data to the native module
  (Android) based on `settings.ts` config
- `src/SettingsScreen.tsx` — pick widget slots + push notification code/threshold
- `src/ChartScreen.tsx` — historical charts
- `src/utils.ts` — chart label index calculation helpers

## Supabase backend

- Project ID: `rvcdqsdtamldqtbgpeka`  (region: `sa-east-1`)
- Edge Function base URL: `https://rvcdqsdtamldqtbgpeka.supabase.co/functions/v1/`
- Tables:
  - `quotes_latest` — current value per quote code
  - `quotes_history` — time series (raw, every ~5 min)
  - `quotes_history_daily` — view: daily AVG aggregates per code (Argentina TZ)
  - `push_tokens` — Expo push tokens + per-device preferences: `watch_code` (default `blue`),
    `threshold_pct` (default `2.0`). Anon may INSERT and UPDATE only `watch_code`/`threshold_pct`
    (column-level grant), scoped by already knowing the token (same trust model as the INSERT
    policy — the token itself is the secret, not a separate user identity).
- RLS: public **reads**, service-role-only **writes** (except `push_tokens`: anon INSERT allowed,
  anon UPDATE of `watch_code`/`threshold_pct` allowed).
- Edge Functions:
  - `scrape-quotes` — scrapes dolarhoy.com, upserts quotes, triggered by pg_cron every 5 min
  - `send-notifications` — groups active tokens by `watch_code`, computes one delta per distinct
    code, sends Expo push to tokens whose own `threshold_pct` is crossed; triggered 1 min after scrape
- pg_cron jobs:
  - `scrape-dolar-quotes`: `*/5 * * * *`
  - `send-notifications-after-scrape`: `1,6,11,16,21,26,31,36,41,46,51,56 * * * *`

### ⚠️ Schema gotchas (read before writing any query)

- In `quotes_history`, the quote-type column is **`code`** (NOT `quote_type`).
- In `quotes_history`, the timestamp column is **`captured_at`** (NOT `recorded_at`).
- Always verify the live schema with `Supabase:list_tables` (`verbose: true`) before
  constructing queries — don't trust memory.

### REST / Edge Function access

- REST API (`/rest/v1/`): the anon key **must** be sent as the `apikey` header.
- Edge Functions (`/functions/v1/`): work without auth headers.
- Never commit keys. Keep the anon key in env / app config, not in source.

## Tracked quote codes

`blue`, `oficial`, `mep`, `ccl`, `tarjeta`, and crypto variants (`cripto` / `digital` / `usdc`).

- `tarjeta` consistently returns `sell = null` — this is expected, not a bug.
- `mayorista` is currently absent from dolarhoy; the scraper will pick it up
  automatically if it reappears.

## Environment variables

`SUPABASE_URL` / `SUPABASE_ANON_KEY` are baked into the client bundle at **build time**
via `react-native-dotenv` (`babel.config.js` → `@env`), not read at runtime. Copy
`.env.example` to `.env` and fill in the anon key before running `npm start` or building
locally. `src/api/supabase.ts` throws a clear error at request time if either is missing —
if the app shows a generic "no se pudieron cargar las cotizaciones" with zero requests
reaching Supabase, check this first.

CI (`.github/workflows/ci.yml`, `android-build` job) generates `.env` from the GitHub
Actions secrets `SUPABASE_URL` / `SUPABASE_ANON_KEY` — if a build produced by that
pipeline can't load quotes, verify those repo secrets are set (Settings → Secrets and
variables → Actions), since an empty/missing secret silently produces an empty `.env`.

## Common commands

> Verify these against `package.json` and update if they differ.

```bash
npm install            # install deps
npm start              # Metro bundler
npm run ios            # run iOS
npm run android        # run Android
npx tsc --noEmit       # type-check
```

Supabase Edge Function deploy (example):
```bash
supabase functions deploy scrape-quotes
```

## Testing

`npm test` (jest) is **not** part of CI (`ci.yml` only runs lint/typecheck/android-build) — it's
a dev-only smoke check. Uses the `jest-expo` preset (must track the installed Expo SDK major
version, currently 52.x) plus `jest.setup.js` (mocks AsyncStorage, disables
`react-native-screens` native components) — `react-native`'s own bare preset doesn't know about
the Expo/`@react-navigation` ecosystem and fails to parse `.png`/ESM assets from those packages.

Known issue: `__tests__/App.test.tsx` ("renders correctly") still crashes with "Element type is
invalid" on the re-render after the mocked query settles — reproducible even with `HomeScreen`'s
body swapped for a trivial `<Text/>`, so it's unrelated to any component code. Looks like a
`@react-navigation/stack` + `react-native-screens` + `react-test-renderer` incompatibility in
this exact dependency combination. Needs dedicated investigation (possibly
`@testing-library/react-native` instead of raw `react-test-renderer`) — not chased further since
it doesn't block CI.

## Deno / TypeScript note

The repo is a Node project, so the Deno Edge Function code triggers
`Cannot find name 'Deno'`. This is resolved by `supabase/functions/deno.json` with
`"lib": ["deno.window"]` and the VS Code Deno extension configured for the
`supabase/functions` path. Don't "fix" this by changing the Node tsconfig.

## Conventions & working style

- **Incremental, milestone-based** development. One scoped milestone at a time.
- Inspect before acting with Supabase MCP: call `list_projects` / `get_organization`
  before creating resources; call `Supabase:confirm_cost` before `create_project`.
- When writing files containing shell-special chars (backticks, `$`), use a quoted
  heredoc (`<< 'EOF'`) to prevent interpolation.
- Give honest trade-off analysis on technical decisions, not just confirmation.

## Roadmap

- M1 — Supabase backend ✅
- M2 — Expo migration (SDK 52 + EAS Build) ✅
- M3 — client refactor ✅ (TanStack Query, UI states, Supabase history with argentinadatos fallback)
- M4 — push notifications ✅ (expo-notifications, push_tokens table, send-notifications Edge Function, pg_cron)
- M5 — Android home screen widget ✅ (SharedPreferences fed from HomeScreen after Supabase
  fetch, no native scraping) — verified on-device. Widget shows 1-2 user-configurable quote
  codes (`SettingsScreen`, default Blue + Oficial), % colored by sign (green/red/gray). Refresh
  button (⟳) runs a Headless JS task (`WidgetRefreshTaskService` → `index.js`
  `registerHeadlessTask('WidgetRefresh', ...)` → `src/widgetRefreshTask.ts`) that re-fetches and
  re-pushes to the widget with no Activity/UI — verified on-device. Tapping the rest of the
  widget just opens the app, which also refetches on foreground (`AppState` listener in
  `HomeScreen.tsx`) as a reliable fallback if the headless task ever gets killed by
  battery-optimization on some OEM. Widget also shows "Actualizado hace Xm/h" (timestamp
  written by `WidgetModule.updateWidget()` on every push, normal or headless).
- M6 — configurable push notifications ✅ (per-device watched code + threshold %, `SettingsScreen`)
- Cross-cutting: quality + UX tracks

## Communication

- The maintainer (Alex) communicates in Russian and prefers direct, technical
  discussion. Default to Russian in responses unless asked otherwise.
