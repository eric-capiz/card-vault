# Card Vault 2.0 — Yu-Gi-Oh! Collection Manager

A ground-up rebuild of the original Card Vault. Sign up for a free account and track your
Yu-Gi-Oh! card collection with live prices, gorgeous card art, deck building with banlist
checks, and free on-device card scanning. Your vault, decks and stats are private to your
account and sync across devices.

**Live:** https://card-vault-ygo.vercel.app/

## Features

- 🔐 **Accounts** — email + password sign up / log in (Supabase Auth, free tier). Each user gets
  a private vault, decks and dashboard. Card search, card detail and the scanner stay public —
  no login required.
- 🔍 **Card search** — fuzzy name search, archetype and type filters across 10,000+ cards
- 🃏 **Card detail** — full art, ATK/DEF, level, attribute, printings with rarities, TCGplayer /
  Cardmarket / eBay / Amazon prices, TCG banlist status
- 🗝️ **My Vault** — unlimited collections with quantities, set/rarity tracking, sort & filter,
  XLSX + JSON export, JSON import. Had cards saved before accounts existed? A banner offers a
  one-click import of your old local data.
- 📊 **Dashboard** — total collection value, rarity breakdown, top archetypes, most valuable cards
- ⚔️ **Deck Builder** — Main (40–60) / Extra (0–15) / Side (0–15) decks, copy-limit + banlist
  legality warnings, **.ydk export** (EDOPro/DuelingBook) and .ydk import
- 📸 **Scanner** — photograph a card; free on-device OCR (tesseract.js) reads the name and
  verifies it against the card database. The photo never leaves your device.

## Tech

- Next.js (App Router) + React + TypeScript + Tailwind CSS
- Auth + database: [Supabase](https://supabase.com) free tier (Postgres + Auth). Row Level
  Security keeps every user to their own rows.
- Card data, images and prices: free [YGOPRODeck API v7](https://ygoprodeck.com/api-guide/)
  (no key needed)
- OCR: [tesseract.js](https://tesseract.projectnaptha.com/) running entirely in the browser
- Excel export: SheetJS
- Still $0 to run: Supabase free tier + Vercel hobby + free card API.

## Supabase setup (one-time, ~5 minutes)

1. Create a free project at https://supabase.com/dashboard.
2. In the project dashboard, open the **SQL Editor** and run the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates the `profiles`, `collections`,
   `collection_cards` and `decks` tables, enables Row Level Security with per-user policies,
   and adds the trigger that creates a profile row on signup.
3. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon `public` key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (The anon key is public-safe — it's designed for browser use and RLS enforces access.)
4. Add both as environment variables in Vercel (**Project → Settings → Environment
   Variables**), then redeploy.

Until the keys are set, the app still builds and runs: search, card detail and the scanner
work normally, while the login/signup/vault/decks/dashboard pages show a friendly
"not configured yet" notice instead of crashing.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. For full functionality locally, create a `.env.local` with the
two `NEXT_PUBLIC_SUPABASE_*` variables above.

## Deploy

Push to GitHub and import the repo in Vercel. Add the two Supabase env vars (see above) —
no other build config needed.

## Legacy code

The `backend/` (Express + MongoDB + Google Vision OCR, formerly on Fly.io) and `frontend/`
(React + MUI) directories are the **original v1 app** and are no longer used. They're kept for
reference only — the v2 app lives at the repo root. (The root `tsconfig.json` excludes them
so they don't break the production build.)

## License

MIT. Unofficial fan project — Yu-Gi-Oh! is a trademark of Konami. Card data/images/prices
courtesy of YGOPRODeck.
