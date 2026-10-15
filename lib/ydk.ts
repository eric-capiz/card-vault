// EDOPro / YGOPro .ydk deck format helpers.
import type { Deck, DeckCard } from "./storage";

export function exportYdk(deck: Deck): string {
  const lines: string[] = [];
  lines.push("#created by Card Vault");
  lines.push("#main");
  for (const c of deck.main) lines.push(String(c.cardId));
  lines.push("#extra");
  for (const c of deck.extra) lines.push(String(c.cardId));
  lines.push("!side");
  for (const c of deck.side) lines.push(String(c.cardId));
  lines.push("");
  return lines.join("\n");
}

export interface ParsedYdk {
  main: number[];
  extra: number[];
  side: number[];
}

/** Parse a .ydk file into passcode id lists. Tolerates comments and blank lines. */
export function parseYdk(text: string): ParsedYdk {
  const main: number[] = [];
  const extra: number[] = [];
  const side: number[] = [];
  let section: "main" | "extra" | "side" = "main";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower === "#main") {
      section = "main";
      continue;
    }
    if (lower === "#extra") {
      section = "extra";
      continue;
    }
    if (lower === "!side") {
      section = "side";
      continue;
    }
    if (line.startsWith("#")) continue;
    const id = parseInt(line, 10);
    if (!Number.isFinite(id)) continue;
    if (section === "main") main.push(id);
    else if (section === "extra") extra.push(id);
    else side.push(id);
  }
  return { main, extra, side };
}

export function toDeckCard(card: {
  id: number;
  name: string;
  type: string;
  frameType: string;
  card_images: { image_url_small: string }[];
  banlist_info?: { ban_tcg?: string };
}): DeckCard {
  return {
    cardId: card.id,
    name: card.name,
    type: card.type,
    frameType: card.frameType,
    imageSmall: card.card_images?.[0]?.image_url_small ?? "",
    banTcg: card.banlist_info?.ban_tcg,
  };
}
