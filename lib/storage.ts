// localStorage persistence — no accounts, no backend, $0 to run.
// Tradeoff: data lives in this browser only. Use JSON export for backups / moving devices.

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

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

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

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — fail silently, data just won't persist
  }
}

export function loadCollections(): Collection[] {
  const c = read<Collection[]>(COLLECTIONS_KEY, []);
  return Array.isArray(c) ? c : [];
}

export function saveCollections(collections: Collection[]): void {
  write(COLLECTIONS_KEY, collections);
}

export function loadDecks(): Deck[] {
  const d = read<Deck[]>(DECKS_KEY, []);
  return Array.isArray(d) ? d : [];
}

export function saveDecks(decks: Deck[]): void {
  write(DECKS_KEY, decks);
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
