// Typed Supabase data layer — per-user vault, cards, and decks.
// All functions take an authenticated browser client; Row Level Security
// on the tables guarantees users only ever touch their own rows.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface VaultCardRow {
  id: string;
  ygoId: number;
  name: string;
  qty: number;
  setCode: string | null;
  rarity: string | null;
  price: number;
  imageSmall: string;
  type: string;
  frameType: string;
  attribute?: string;
  race?: string;
  archetype?: string;
  setName?: string;
}

export interface CollectionWithCards {
  id: string;
  title: string;
  description: string;
  cards: VaultCardRow[];
}

export interface DeckRow {
  id: string;
  name: string;
  main: number[];
  extra: number[];
  side: number[];
}

interface CardMeta {
  type?: string;
  frameType?: string;
  attribute?: string;
  race?: string;
  archetype?: string;
  setName?: string;
}

function mapCard(row: Record<string, unknown>): VaultCardRow {
  const meta = (row.meta ?? {}) as CardMeta;
  return {
    id: row.id as string,
    ygoId: row.ygo_id as number,
    name: row.name as string,
    qty: row.qty as number,
    setCode: (row.set_code as string | null) ?? null,
    rarity: (row.rarity as string | null) ?? null,
    price: Number(row.price ?? 0),
    imageSmall: (row.card_image_url as string | null) ?? "",
    type: meta.type ?? "Unknown",
    frameType: meta.frameType ?? "",
    attribute: meta.attribute,
    race: meta.race,
    archetype: meta.archetype,
    setName: meta.setName,
  };
}

function throwIf(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

function needData<T>(data: T | null, what: string): T {
  if (!data) throw new Error(`${what}: no data returned.`);
  return data;
}

// ------------------------------------------------------------ collections
export async function getCollections(db: SupabaseClient): Promise<CollectionWithCards[]> {
  const { data, error } = await db
    .from("collections")
    .select("id, title, description, created_at, collection_cards(*)")
    .order("created_at", { ascending: false });
  throwIf(error, "Couldn't load collections");
  return (data ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    description: (c.description as string) ?? "",
    cards: ((c.collection_cards as Record<string, unknown>[]) ?? [])
      .sort((a, b) =>
        String(a.added_at ?? "").localeCompare(String(b.added_at ?? ""))
      )
      .map(mapCard),
  }));
}

export async function createCollection(
  db: SupabaseClient,
  title: string,
  description = ""
): Promise<CollectionWithCards> {
  const { data, error } = await db
    .from("collections")
    .insert({ title, description })
    .select("id, title, description")
    .single();
  throwIf(error, "Couldn't create collection");
  const row = needData(data, "Couldn't create collection");
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    cards: [],
  };
}

export async function renameCollection(
  db: SupabaseClient,
  id: string,
  title: string
): Promise<void> {
  const { error } = await db.from("collections").update({ title }).eq("id", id);
  throwIf(error, "Couldn't rename collection");
}

export async function deleteCollection(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("collections").delete().eq("id", id);
  throwIf(error, "Couldn't delete collection");
}

// ------------------------------------------------------------------ cards
export interface NewVaultCard {
  ygoId: number;
  name: string;
  qty: number;
  setCode?: string | null;
  rarity?: string | null;
  price: number;
  imageSmall: string;
  meta: CardMeta;
}

export async function addCard(
  db: SupabaseClient,
  collectionId: string,
  card: NewVaultCard
): Promise<void> {
  const setCode = card.setCode ?? null;
  const rarity = card.rarity ?? null;
  const { data: existing, error: selErr } = await db
    .from("collection_cards")
    .select("id, qty, set_code, rarity")
    .eq("collection_id", collectionId)
    .eq("ygo_id", card.ygoId);
  throwIf(selErr, "Couldn't check existing cards");

  const match = (existing ?? []).find(
    (r) =>
      (r.set_code ?? null) === setCode && (r.rarity ?? null) === rarity
  );
  if (match) {
    const { error } = await db
      .from("collection_cards")
      .update({ qty: (match.qty as number) + card.qty })
      .eq("id", match.id);
    throwIf(error, "Couldn't update quantity");
    return;
  }
  const { error } = await db.from("collection_cards").insert({
    collection_id: collectionId,
    ygo_id: card.ygoId,
    name: card.name,
    qty: card.qty,
    set_code: setCode,
    rarity,
    price: card.price,
    card_image_url: card.imageSmall,
    meta: card.meta,
  });
  throwIf(error, "Couldn't add card");
}

export async function updateCardQty(
  db: SupabaseClient,
  cardRowId: string,
  qty: number
): Promise<void> {
  if (qty <= 0) {
    await removeCard(db, cardRowId);
    return;
  }
  const { error } = await db
    .from("collection_cards")
    .update({ qty })
    .eq("id", cardRowId);
  throwIf(error, "Couldn't update quantity");
}

export async function removeCard(db: SupabaseClient, cardRowId: string): Promise<void> {
  const { error } = await db.from("collection_cards").delete().eq("id", cardRowId);
  throwIf(error, "Couldn't remove card");
}

// ------------------------------------------------------------------ decks
export async function getDecks(db: SupabaseClient): Promise<DeckRow[]> {
  const { data, error } = await db
    .from("decks")
    .select("id, name, main, extra, side")
    .order("updated_at", { ascending: false });
  throwIf(error, "Couldn't load decks");
  return (data ?? []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    main: (d.main as number[]) ?? [],
    extra: (d.extra as number[]) ?? [],
    side: (d.side as number[]) ?? [],
  }));
}

export async function saveDeck(
  db: SupabaseClient,
  deck: { id?: string; name: string; main: number[]; extra: number[]; side: number[] }
): Promise<DeckRow> {
  const payload = {
    name: deck.name,
    main: deck.main,
    extra: deck.extra,
    side: deck.side,
    updated_at: new Date().toISOString(),
  };
  if (deck.id) {
    const { data, error } = await db
      .from("decks")
      .update(payload)
      .eq("id", deck.id)
      .select("id, name, main, extra, side")
      .single();
    throwIf(error, "Couldn't save deck");
    const row = needData(data, "Couldn't save deck");
    return {
      id: row.id as string,
      name: row.name as string,
      main: (row.main as number[]) ?? [],
      extra: (row.extra as number[]) ?? [],
      side: (row.side as number[]) ?? [],
    };
  }
  const { data, error } = await db
    .from("decks")
    .insert(payload)
    .select("id, name, main, extra, side")
    .single();
  throwIf(error, "Couldn't save deck");
  const row2 = needData(data, "Couldn't save deck");
  return {
    id: row2.id as string,
    name: row2.name as string,
    main: (row2.main as number[]) ?? [],
    extra: (row2.extra as number[]) ?? [],
    side: (row2.side as number[]) ?? [],
  };
}

export async function deleteDeck(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from("decks").delete().eq("id", id);
  throwIf(error, "Couldn't delete deck");
}
