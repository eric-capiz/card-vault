"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { downloadFile, loadDecks, saveDecks, type Deck, type DeckCard } from "@/lib/storage";
import { exportYdk, parseYdk, toDeckCard } from "@/lib/ydk";
import {
  getCardsByIds,
  imageSmall,
  isExtraDeckCard,
  searchCards,
  type YGOCard,
} from "@/lib/ygoprodeck";

type Section = "main" | "extra" | "side";
const LIMITS: Record<Section, { min: number; max: number; label: string }> = {
  main: { min: 40, max: 60, label: "Main Deck" },
  extra: { min: 0, max: 15, label: "Extra Deck" },
  side: { min: 0, max: 15, label: "Side Deck" },
};

const BAN_STYLES: Record<string, string> = {
  Forbidden: "bg-red-500/85 text-white",
  Limited: "bg-orange-500/85 text-white",
  "Semi-Limited": "bg-yellow-500/85 text-black",
};

async function hydrateDeck(row: { id: string; name: string; main: number[]; extra: number[]; side: number[] }): Promise<Deck> {
  const allIds = [...row.main, ...row.extra, ...row.side];
  const byId = new Map<number, DeckCard>();
  if (allIds.length > 0) {
    const cards = await getCardsByIds(allIds);
    for (const c of cards) byId.set(c.id, toDeckCard(c));
  }
  const pick = (ids: number[]): DeckCard[] =>
    ids.map(
      (id) =>
        byId.get(id) ?? {
          cardId: id,
          name: `Unknown card (${id})`,
          type: "",
          frameType: "",
          imageSmall: "",
        }
    );
  return {
    id: row.id,
    name: row.name,
    main: pick(row.main),
    extra: pick(row.extra),
    side: pick(row.side),
    updatedAt: Date.now(),
  };
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function DecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<YGOCard[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addSection, setAddSection] = useState<Section>("main");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDecks(loadDecks());
    setLoaded(true);
  }, []);

  const active: Deck | null = useMemo(
    () => decks.find((d) => d.id === activeId) ?? decks[0] ?? null,
    [decks, activeId]
  );

  /** Persist decks to localStorage; keeps state in sync. */
  const persistDecks = (next: Deck[]) => {
    setDecks(next);
    saveDecks(next);
  };

  const persistDeck = (deck: Deck): Deck => {
    const next: Deck = { ...deck, updatedAt: Date.now() };
    persistDecks(
      decks.some((d) => d.id === deck.id)
        ? decks.map((d) => (d.id === deck.id ? next : d))
        : [next, ...decks]
    );
    return next;
  };

  const updateActive = (fn: (d: Deck) => Deck) => {
    if (!active) return;
    persistDeck(fn(active));
  };

  const createDeck = () => {
    const name = newName.trim();
    if (!name) return;
    const d: Deck = { id: uid(), name, main: [], extra: [], side: [], updatedAt: Date.now() };
    persistDecks([d, ...decks]);
    setActiveId(d.id);
    setNewName("");
  };

  const deleteDeck = (id: string) => {
    if (!window.confirm("Delete this deck?")) return;
    persistDecks(decks.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const copiesInDeck = (deck: Deck, cardId: number): number =>
    deck.main.filter((c) => c.cardId === cardId).length +
    deck.extra.filter((c) => c.cardId === cardId).length +
    deck.side.filter((c) => c.cardId === cardId).length;

  const addCard = (card: YGOCard, section: Section) => {
    if (!active) return;
    const limit = LIMITS[section];
    if (active[section].length >= limit.max) {
      window.alert(`${limit.label} is full (max ${limit.max}).`);
      return;
    }
    const copies = copiesInDeck(active, card.id);
    const ban = card.banlist_info?.ban_tcg;
    const maxCopies = ban === "Forbidden" ? 0 : ban === "Limited" ? 1 : ban === "Semi-Limited" ? 2 : 3;
    if (copies >= maxCopies) {
      window.alert(
        ban === "Forbidden"
          ? `${card.name} is Forbidden — it can't be in a tournament deck.`
          : `You already have the maximum ${maxCopies} ${ban ? `(${ban}) ` : ""}copies of ${card.name}.`
      );
      return;
    }
    if (section === "extra" && !isExtraDeckCard(card)) {
      window.alert("Only Fusion, Synchro, Xyz and Link monsters can go in the Extra Deck.");
      return;
    }
    if (section === "main" && isExtraDeckCard(card)) {
      window.alert("That card belongs in the Extra Deck, not the Main Deck.");
      return;
    }
    const dc = toDeckCard(card);
    updateActive((d) => ({ ...d, [section]: [...d[section], dc] }));
  };

  const removeCard = (section: Section, index: number) => {
    updateActive((d) => ({ ...d, [section]: d[section].filter((_, i) => i !== index) }));
  };

  const runAddSearch = async () => {
    if (!addQuery.trim()) return;
    setAddLoading(true);
    try {
      setAddResults(await searchCards({ name: addQuery.trim(), limit: 24 }));
    } catch {
      setAddResults([]);
    } finally {
      setAddLoading(false);
    }
  };

  const exportActive = () => {
    if (!active) return;
    downloadFile(`${active.name.replace(/[^a-z0-9-_]+/gi, "_")}.ydk`, exportYdk(active), "text/plain");
  };

  const importYdkFile = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseYdk(text);
      const allIds = [...parsed.main, ...parsed.extra, ...parsed.side];
      if (allIds.length === 0) throw new Error("empty");
      const cards = await getCardsByIds(allIds);
      const byId = new Map(cards.map((c) => [c.id, c]));
      const name = file.name.replace(/\.ydk$/i, "") || "Imported Deck";
      const push = (ids: number[]): DeckCard[] => {
        const out: DeckCard[] = [];
        for (const id of ids) {
          const c = byId.get(id);
          if (c) out.push(toDeckCard(c));
        }
        return out;
      };
      const mainIds = parsed.main.slice(0, 60);
      const extraIds = parsed.extra.slice(0, 15);
      const sideIds = parsed.side.slice(0, 15);
      const missing = allIds.length - (mainIds.length + extraIds.length + sideIds.length);
      const d: Deck = {
        id: uid(),
        name,
        main: push(mainIds),
        extra: push(extraIds),
        side: push(sideIds),
        updatedAt: Date.now(),
      };
      persistDecks([d, ...decks]);
      setActiveId(d.id);
      window.alert(
        missing > 0
          ? `Imported "${name}" (${d.main.length + d.extra.length + d.side.length} cards). ${missing} card(s) couldn't be matched.`
          : `Imported "${name}" with ${d.main.length + d.extra.length + d.side.length} cards.`
      );
    } catch {
      window.alert("Couldn't parse that .ydk file.");
    } finally {
      setImporting(false);
    }
  };

  const composition = useMemo(() => {
    if (!active) return null;
    let monsters = 0,
      spells = 0,
      traps = 0;
    const all = [...active.main, ...active.extra, ...active.side];
    for (const c of all) {
      if (c.type.includes("Spell")) spells++;
      else if (c.type.includes("Trap")) traps++;
      else monsters++;
    }
    return { monsters, spells, traps, total: all.length };
  }, [active]);

  const sectionStatus = (s: Section) => {
    if (!active) return null;
    const n = active[s].length;
    const { min, max } = LIMITS[s];
    const ok = n >= min && n <= max;
    return (
      <span className={`font-sans text-xs font-bold ${ok ? "text-emerald-300" : "text-amber-300"}`}>
        {n}/{max}
        {s === "main" && n < min ? ` (need ${min - n} more)` : ""}
      </span>
    );
  };

  if (!loaded) {
    return (
      <div className="pt-10" aria-hidden>
        <div className="skeleton h-9 w-48" />
        <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4.4]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Strategy</p>
          <h1 className="font-display mt-1 text-3xl font-bold text-paper sm:text-4xl">
            Deck <span className="text-foil">Builder</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-fog">
            Tournament-legal deck building with banlist checks and .ydk export for EDOPro / DuelingBook.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".ydk"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importYdkFile(f);
              e.target.value = "";
            }}
          />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-ghost px-4 py-2 text-sm">
            {importing ? "Importing…" : "Import .ydk"}
          </button>
          {active && (
            <button onClick={exportActive} className="btn-foil px-4 py-2 text-sm">
              Export .ydk
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {/* new deck */}
      <div className="mt-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createDeck()}
          placeholder="New deck name — e.g. “Blue-Eyes 2026”"
          aria-label="New deck name"
          className="field max-w-sm flex-1 px-3.5 py-2.5 text-sm"
        />
        <button onClick={createDeck} disabled={!newName.trim()} className="btn-value px-5 py-2.5 text-sm">
          Create Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="panel mt-10 border-dashed border-foil-violet/25! p-10 text-center sm:p-14"
        >
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-foil-violet"
            style={{ background: "rgba(167,139,250,0.1)", boxShadow: "inset 0 0 0 1px rgba(167,139,250,0.25)" }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
              <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-display mt-4 text-2xl font-bold text-paper">No decks yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-fog">
            Create a deck above, then add cards from the search panel. Banlist warnings keep you
            tournament-legal, and .ydk export drops straight into EDOPro.
          </p>
        </motion.div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* deck list */}
          <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start" aria-label="Decks">
            {decks.map((d) => {
              const isActive = active?.id === d.id;
              const n = d.main.length + d.extra.length + d.side.length;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveId(d.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative w-full overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-200 ${
                    isActive
                      ? "border-foil-violet/40 bg-gradient-to-r from-foil-violet/12 to-foil-cyan/8"
                      : "border-white/8 bg-ink/70 hover:border-white/20 hover:bg-panel"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="deck-active-bar"
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ background: "linear-gradient(180deg,#a78bfa,#67e8f9,#f9a8d4)" }}
                    />
                  )}
                  <p className="truncate text-sm font-bold text-paper">{d.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-dim">
                    {d.main.length}/{d.extra.length}/{d.side.length} · {n} cards
                  </p>
                </button>
              );
            })}
          </aside>

          {active && composition && (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-paper">{active.name}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fog">
                  <span><b className="text-[#e8a33d]">{composition.monsters}</b> Monsters</span>
                  <span><b className="text-[#2e9e5b]">{composition.spells}</b> Spells</span>
                  <span><b className="text-foil-pink">{composition.traps}</b> Traps</span>
                  <button
                    onClick={() => deleteDeck(active.id)}
                    className="rounded-lg border border-red-500/30 px-2.5 py-1 font-semibold text-red-300 transition hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* add cards */}
              <div className="panel mt-4 p-4">
                <p className="eyebrow mb-2.5">Add cards to deck</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex gap-1 rounded-xl bg-black/40 p-1 ring-1 ring-white/10" role="tablist" aria-label="Deck section">
                    {(Object.keys(LIMITS) as Section[]).map((s) => (
                      <button
                        key={s}
                        role="tab"
                        aria-selected={addSection === s}
                        onClick={() => setAddSection(s)}
                        className={`relative rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                          addSection === s ? "text-obsidian" : "text-fog hover:text-paper"
                        }`}
                      >
                        {addSection === s && (
                          <motion.span
                            layoutId="deck-section-pill"
                            className="absolute inset-0 rounded-lg"
                            style={{ background: "linear-gradient(135deg,#c4b5fd,#67e8f9)" }}
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          />
                        )}
                        <span className="relative">{LIMITS[s].label.replace(" Deck", "")}</span>
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      runAddSearch();
                    }}
                    role="search"
                  >
                    <input
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder="Search cards to add…"
                      aria-label="Search cards to add"
                      className="field min-w-0 flex-1 px-3 py-2 text-sm"
                    />
                    <button type="submit" disabled={addLoading} className="btn-foil px-5 py-2 text-sm">
                      {addLoading ? "…" : "Go"}
                    </button>
                  </form>
                </div>
                {addResults.length > 0 && (
                  <div className="mt-3 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
                    {addResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => addCard(c, addSection)}
                        className="group relative overflow-hidden rounded-lg border border-white/10 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-foil-violet/50 hover:shadow-[0_10px_28px_rgba(0,0,0,0.5)]"
                        title={`Add to ${LIMITS[addSection].label}`}
                        aria-label={`Add ${c.name} to ${LIMITS[addSection].label}`}
                      >
                        <div className="relative aspect-[3/4.4]">
                          <Image src={imageSmall(c)} alt={c.name} fill sizes="120px" className="object-cover" loading="lazy" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-black/75 px-1.5 py-1 text-[10px] font-bold text-paper opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                          + {LIMITS[addSection].label}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* sections */}
              {(Object.keys(LIMITS) as Section[]).map((s) => (
                <div key={s} className="mt-7">
                  <div className="mb-2.5 flex items-center justify-between">
                    <h3 className="font-display font-bold text-paper">
                      {LIMITS[s].label} {sectionStatus(s)}
                    </h3>
                  </div>
                  {active[s].length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-dim">
                      Empty — search above and click a card to add it here.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                      {active[s].map((c, i) => (
                        <motion.div
                          key={`${c.cardId}-${i}`}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="group relative"
                        >
                          <div className="relative aspect-[3/4.4] overflow-hidden rounded-lg border border-white/10 transition-colors group-hover:border-foil-violet/40">
                            <Image
                              src={c.imageSmall}
                              alt={c.name}
                              fill
                              sizes="100px"
                              className="object-cover"
                              loading="lazy"
                              title={c.name}
                            />
                          </div>
                          {c.banTcg && (
                            <span
                              className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-black uppercase ${BAN_STYLES[c.banTcg] ?? "bg-white/20 text-white"}`}
                              title={`TCG: ${c.banTcg}`}
                            >
                              {c.banTcg === "Semi-Limited" ? "Semi" : c.banTcg}
                            </span>
                          )}
                          <button
                            onClick={() => removeCard(s, i)}
                            className="absolute right-1 top-1 rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-bold text-red-300 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            title={`Remove ${c.name}`}
                            aria-label={`Remove ${c.name}`}
                          >
                            ✕
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
