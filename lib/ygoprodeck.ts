// Free YGOPRODeck API v7 client — no key required.
// Docs: https://ygoprodeck.com/api-guide/

export interface YGOCardSet {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code: string;
  set_price: string;
}

export interface YGOCardImage {
  id: number;
  image_url: string;
  image_url_small: string;
  image_url_cropped: string;
}

export interface YGOCardPrices {
  cardmarket_price: string;
  tcgplayer_price: string;
  ebay_price: string;
  amazon_price: string;
  coolstuffinc_price: string;
}

export interface YGOBanlist {
  ban_tcg?: string;
  ban_ocg?: string;
  ban_goat?: string;
}

export interface YGOCard {
  id: number;
  name: string;
  type: string;
  humanReadableCardType: string;
  frameType: string;
  desc: string;
  race?: string;
  atk?: number;
  def?: number;
  level?: number;
  attribute?: string;
  archetype?: string;
  scale?: number;
  linkval?: number;
  linkmarkers?: string[];
  card_sets?: YGOCardSet[];
  card_images: YGOCardImage[];
  card_prices: YGOCardPrices[];
  banlist_info?: YGOBanlist;
}

const API = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

export class YGOApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchCards(url: string): Promise<YGOCard[]> {
  const res = await fetch(url);
  if (res.status === 400) return []; // API returns 400 when nothing matches
  if (!res.ok) throw new YGOApiError(`YGOPRODeck request failed (${res.status})`, res.status);
  const json = await res.json();
  return (json?.data ?? []) as YGOCard[];
}

export interface SearchParams {
  name?: string;
  archetype?: string;
  type?: string;
  limit?: number;
}

/** Fuzzy name search + optional archetype/type filters. */
export async function searchCards({ name, archetype, type, limit = 60 }: SearchParams): Promise<YGOCard[]> {
  const q = new URLSearchParams();
  if (name?.trim()) q.set("fname", name.trim());
  if (archetype?.trim()) q.set("archetype", archetype.trim());
  if (type?.trim()) q.set("type", type.trim());
  q.set("num", String(limit));
  q.set("offset", "0");
  return fetchCards(`${API}?${q.toString()}`);
}

/** Exact card lookup by passcode id. */
export async function getCard(id: string | number): Promise<YGOCard | null> {
  const cards = await fetchCards(`${API}?id=${encodeURIComponent(String(id))}`);
  return cards[0] ?? null;
}

/** Batch lookup by passcode ids. The API accepts comma-delimited ids. */
export async function getCardsByIds(ids: number[]): Promise<YGOCard[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const out: YGOCard[] = [];
  // chunk to stay safely under URL limits
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    const cards = await fetchCards(`${API}?id=${chunk.join(",")}`);
    out.push(...cards);
  }
  return out;
}

export function parsePrice(v: string | undefined): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

export function tcgPrice(card: YGOCard): number {
  return parsePrice(card.card_prices?.[0]?.tcgplayer_price);
}

export function cardmarketPrice(card: YGOCard): number {
  return parsePrice(card.card_prices?.[0]?.cardmarket_price);
}

export function imageSmall(card: YGOCard): string {
  return card.card_images?.[0]?.image_url_small ?? "";
}

export function imageFull(card: YGOCard): string {
  return card.card_images?.[0]?.image_url ?? "";
}

const EXTRA_DECK_FRAMES = new Set(["fusion", "synchro", "xyz", "link"]);

export function isExtraDeckCard(card: { frameType: string }): boolean {
  return EXTRA_DECK_FRAMES.has(card.frameType);
}

export function banStatus(card: { banlist_info?: YGOBanlist }): string | null {
  return card.banlist_info?.ban_tcg ?? null;
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Common card-type values accepted by the API `type` filter. */
export const CARD_TYPE_OPTIONS = [
  "Effect Monster",
  "Normal Monster",
  "Flip Effect Monster",
  "Tuner Monster",
  "Fusion Monster",
  "Synchro Monster",
  "XYZ Monster",
  "Link Monster",
  "Ritual Monster",
  "Pendulum Effect Monster",
  "Spell Card",
  "Trap Card",
  "Skill Card",
] as const;

export const ATTRIBUTE_COLORS: Record<string, string> = {
  LIGHT: "#f5d76e",
  DARK: "#9b59b6",
  FIRE: "#e74c3c",
  WATER: "#3498db",
  EARTH: "#a0824e",
  WIND: "#2ecc71",
  DIVINE: "#f1c40f",
};
