# CLAUDE.md — DolarBlue

> Project context for Claude Code. Loaded at the start of every session.
> Keep this file concise and current — if something here is wrong, fix it here first.

## Overview

DolarBlue is a React Native mobile app for tracking Argentine peso ↔ USD exchange
rates. It shows live quotes (blue, oficial, MEP, CCL, etc.) and historical charts.

- **Live quotes** are scraped from dolarhoy.com (chosen for accuracy) by a Supabase
  Edge Function and stored in Supabase. The client reads from Supabase, **not** by
  scraping HTML directly.
- **Historical data** currently comes from argentinadatos.com, used until our own
  `quotes_history` table has accumulated enough data to replace it.

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
- `src/types.ts` — `QuoteCode`, `QuoteRow`
- `src/HomeScreen.tsx` — latest quotes
- `src/ChartScreen.tsx` — historical charts
- `src/utils.ts` — chart label index calculation helpers

## Supabase backend

- Project ID: `rvcdqsdtamldqtbgpeka`  (region: `sa-east-1`)
- Edge Function base URL: `https://rvcdqsdtamldqtbgpeka.supabase.co/functions/v1/`
- Tables:
  - `quotes_latest` — current value per quote code
  - `quotes_history` — time series
- RLS: public **reads**, service-role-only **writes**.

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
- M3 — client refactor to read from Supabase (in progress: history still from argentinadatos)
- M4 — push notifications
- M5 — widgets
- Cross-cutting: quality + UX tracks

## Communication

- The maintainer (Alex) communicates in Russian and prefers direct, technical
  discussion. Default to Russian in responses unless asked otherwise.
