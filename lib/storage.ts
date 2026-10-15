// Legacy localStorage helpers.
// The vault, decks and dashboard now live in Supabase per user. This module
// remains for two jobs: reading pre-account local data for the one-click
// migration, and the downloadFile helper used by XLSX/JSON/.ydk exports.

export interface VaultCard {
  cardId: number;
  name: string;
  type: string;
  frameType: string;
  attribute?: string;
  race?: string;
  archetype?: string;
  imageSmall: string;
  setCode?: string;
  setName?: string;
  rarity?: string;
  /** TCGplayer market snapshot (USD) captured when the card was added. */
  price: number;
  qty: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  cards: VaultCard[];
  createdAt: number;
}

export interface DeckCard {
  cardId: number;
  name: string;
  type: string;
  frameType: string;
  imageSmall: string;
  banTcg?: string;
}

export interface Deck {
  id: string;
  name: string;
  main: DeckCard[];
  extra: DeckCard[];
  side: DeckCard[];
  updatedAt: number;
}

const COLLECTIONS_KEY = "cardvault.collections.v1";
const DECKS_KEY = "cardvault.decks.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Pre-account local collections (used by the migration banner). */
export function loadCollections(): Collection[] {
  const c = read<Collection[]>(COLLECTIONS_KEY, []);
  return Array.isArray(c) ? c : [];
}

/** Pre-account local decks. */
export function loadDecks(): Deck[] {
  const d = read<Deck[]>(DECKS_KEY, []);
  return Array.isArray(d) ? d : [];
}

/** Wipes the pre-account local data after a successful migration. */
export function clearLocalVaultData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COLLECTIONS_KEY);
    window.localStorage.removeItem(DECKS_KEY);
  } catch {
    // ignore
  }
}

export function downloadFile(filename: string, content: string | Blob, mime = "text/plain"): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
