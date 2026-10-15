# Card Vault 2.0 — Yu-Gi-Oh! Collection Manager

A ground-up rebuild of the original Card Vault. Track your Yu-Gi-Oh! card collection with live
prices, gorgeous card art, deck building with banlist checks, and free on-device card scanning —
no account, no backend, no cost.

**Live demo:** deploy this repo root on Vercel (zero config — it's a standard Next.js app).

## Features

- 🔍 **Card search** — fuzzy name search, archetype and type filters across 10,000+ cards
- 🃏 **Card detail** — full art, ATK/DEF, level, attribute, printings with rarities, TCGplayer /
  Cardmarket / eBay / Amazon prices, TCG banlist status
- 🗝️ **My Vault** — unlimited collections with quantities, set/rarity tracking, sort & filter,
  XLSX + JSON export, JSON import
- 📊 **Dashboard** — total collection value, rarity breakdown, top archetypes, most valuable cards
- ⚔️ **Deck Builder** — Main (40–60) / Extra (0–15) / Side (0–15) decks, copy-limit + banlist
  legality warnings, **.ydk export** (EDOPro/DuelingBook) and .ydk import
- 📸 **Scanner** — photograph a card; free on-device OCR (tesseract.js) reads the name and
  verifies it against the card database. The photo never leaves your device.

## Tech

- Next.js (App Router) + React + TypeScript + Tailwind CSS
- Card data, images and prices: free [YGOPRODeck API v7](https://ygoprodeck.com/api-guide/)
  (no key needed)
- OCR: [tesseract.js](https://tesseract.projectnaptha.com/) running entirely in the browser
- Excel export: SheetJS
- Persistence: **localStorage** — your data lives in your browser. No accounts, no database,
  $0 to run. Back up with JSON export (My Vault → JSON) before switching devices or clearing
  site data.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

Push to GitHub and import the repo in Vercel — no environment variables, no build config needed.

## Legacy code

The `backend/` (Express + MongoDB + Google Vision OCR, formerly on Fly.io) and `frontend/`
(React + MUI) directories are the **original v1 app** and are no longer used. They're kept for
reference only — the v2 app lives at the repo root.

## License

MIT. Unofficial fan project — Yu-Gi-Oh! is a trademark of Konami. Card data/images/prices
courtesy of YGOPRODeck.
