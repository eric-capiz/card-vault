/**
 * Client-side data layer — talks to the Next.js API routes (MongoDB backend).
 * Client-side data layer for the MongoDB-backed API.
 */

export interface VaultCard {
  ygoId: number;
  name: string;
  qty: number;
  setCode?: string;
  rarity?: string;
  price: number;
  imageSmall: string;
  cardType: string;
  frameType: string;
  attribute?: string;
  race?: string;
  archetype?: string;
  setName?: string;
}

export interface Deck {
  id: string;
  name: string;
  main: number[];
  extra: number[];
  side: number[];
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchVault(): Promise<VaultCard[]> {
  const data = await req<{ cards: VaultCard[] }>("/api/vault", { cache: "no-store" });
  return data.cards ?? [];
}

export async function saveVault(cards: VaultCard[]): Promise<void> {
  await req("/api/vault", { method: "PUT", body: JSON.stringify({ cards }) });
}

export async function fetchDecks(): Promise<Deck[]> {
  const data = await req<{ decks: Deck[] }>("/api/decks", { cache: "no-store" });
  return data.decks ?? [];
}

export async function createDeck(input: {
  name: string;
  main: number[];
  extra: number[];
  side: number[];
}): Promise<Deck> {
  const data = await req<{ deck: Deck }>("/api/decks", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.deck;
}

export async function updateDeck(
  id: string,
  input: Partial<{ name: string; main: number[]; extra: number[]; side: number[] }>
): Promise<Deck> {
  const data = await req<{ deck: Deck }>(`/api/decks/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return data.deck;
}

export async function deleteDeck(id: string): Promise<void> {
  await req(`/api/decks/${id}`, { method: "DELETE" });
}
