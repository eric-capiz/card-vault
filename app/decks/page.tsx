"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  downloadFile,
  loadDecks,
  saveDecks,
  uid,
  type Deck,
  type DeckCard,
} from "@/lib/storage";
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

function blankDeck(name: string): Deck {
  return { id: uid(), name, main: [], extra: [], side: [], updatedAt: Date.now() };
}

const BAN_COLORS: Record<string, string> = {
  Forbidden: "bg-red-500/20 text-red-300 ring-red-500/50",
  Limited: "bg-orange-500/20 text-orange-300 ring-orange-500/50",
  "Semi-Limited": "bg-yellow-500/20 text-yellow-300 ring-yellow-500/50",
};

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>(() => loadDecks());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<YGOCard[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addSection, setAddSection] = useState<Section>("main");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = (next: Deck[]) => {
    setDecks(next);
    saveDecks(next);
  };

  const active: Deck | null = useMemo(
    () => decks.find((d) => d.id === activeId) ?? decks[0] ?? null,
    [decks, activeId]
  );

  const updateActive = (fn: (d: Deck) => Deck) => {
    if (!active) return;
    persist(decks.map((d) => (d.id === active.id ? { ...fn(d), updatedAt: Date.now() } : d)));
  };

  const createDeck = () => {
    const name = newName.trim();
    if (!name) return;
    const d = blankDeck(name);
    const next = [d, ...decks];
    persist(next);
    setActiveId(d.id);
    setNewName("");
  };

  const deleteDeck = (id: string) => {
    if (!window.confirm("Delete this deck?")) return;
    persist(decks.filter((d) => d.id !== id));
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
      const d = blankDeck(name);
      const push = (ids: number[], section: Section) => {
        for (const id of ids) {
          const c = byId.get(id);
          if (!c) continue;
          d[section].push(toDeckCard(c));
        }
      };
      push(parsed.main.slice(0, 60), "main");
      push(parsed.extra.slice(0, 15), "extra");
      push(parsed.side.slice(0, 15), "side");
      const missing = allIds.length - (d.main.length + d.extra.length + d.side.length);
      const next = [d, ...decks];
      persist(next);
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
      <span className={`text-xs font-bold ${ok ? "text-emerald-300" : "text-amber-300"}`}>
        {n}/{max}
        {s === "main" && n < min ? ` (need ${min - n} more)` : ""}
      </span>
    );
  };

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-gold-grad text-3xl font-black sm:text-4xl">Deck Builder</h1>
          <p className="mt-1 text-sm text-slate-400">
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
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import .ydk"}
          </button>
          {active && (
            <button
              onClick={exportActive}
              className="rounded-lg bg-[#ffd700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ffe44d]"
            >
              Export .ydk
            </button>
          )}
        </div>
      </div>

      {/* new deck */}
      <div className="mt-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createDeck()}
          placeholder="New deck name — e.g. “Blue-Eyes 2026”"
          className="max-w-sm flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
        />
        <button
          onClick={createDeck}
          disabled={!newName.trim()}
          className="rounded-lg bg-[rgba(255,215,0,0.14)] px-4 py-2.5 text-sm font-bold text-[#ffd700] ring-1 ring-[rgba(255,215,0,0.3)] transition hover:bg-[rgba(255,215,0,0.22)] disabled:opacity-40"
        >
          Create Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-[rgba(255,215,0,0.25)] bg-[#0c1327]/60 p-10 text-center">
          <div className="text-6xl">⚔️</div>
          <h2 className="mt-4 text-2xl font-extrabold text-white">No decks yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Create a deck above, then add cards from the search panel. Banlist warnings keep you
            tournament-legal, and .ydk export drops straight into EDOPro.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* deck list */}
          <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start">
            {decks.map((d) => {
              const isActive = active?.id === d.id;
              const n = d.main.length + d.extra.length + d.side.length;
              return (
                <button
                  key={d.id}
                  onClick={() => setActiveId(d.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isActive
                      ? "border-[rgba(255,215,0,0.45)] bg-[rgba(255,215,0,0.08)]"
                      : "border-white/8 bg-[#0c1327]/70 hover:border-white/20"
                  }`}
                >
                  <p className={`truncate text-sm font-bold ${isActive ? "text-[#ffd700]" : "text-white"}`}>
                    {d.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {d.main.length}/{d.extra.length}/{d.side.length} · {n} cards
                  </p>
                </button>
              );
            })}
          </aside>

          {active && composition && (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-extrabold text-white">{active.name}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span><b className="text-[#e8a33d]">{composition.monsters}</b> Monsters</span>
                  <span><b className="text-[#2e9e5b]">{composition.spells}</b> Spells</span>
                  <span><b className="text-[#c0488a]">{composition.traps}</b> Traps</span>
                  <button
                    onClick={() => deleteDeck(active.id)}
                    className="rounded-lg border border-red-500/30 px-2.5 py-1 font-semibold text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* add cards */}
              <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Add cards to deck
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                    {(Object.keys(LIMITS) as Section[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setAddSection(s)}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                          addSection === s ? "bg-[#ffd700] text-black" : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        {LIMITS[s].label.replace(" Deck", "")}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      runAddSearch();
                    }}
                  >
                    <input
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder="Search cards to add…"
                      className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
                    />
                    <button
                      type="submit"
                      disabled={addLoading}
                      className="rounded-lg bg-[#ffd700] px-4 py-2 text-sm font-bold text-black hover:bg-[#ffe44d] disabled:opacity-50"
                    >
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
                        className="group relative overflow-hidden rounded-lg border border-white/10 text-left transition hover:border-[#ffd700]"
                        title={`Add to ${LIMITS[addSection].label}`}
                      >
                        <div className="relative aspect-[3/4.4]">
                          <Image src={imageSmall(c)} alt={c.name} fill sizes="120px" className="object-cover" loading="lazy" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-[10px] font-bold text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                          + {LIMITS[addSection].label}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* sections */}
              {(Object.keys(LIMITS) as Section[]).map((s) => (
                <div key={s} className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-extrabold text-white">
                      {LIMITS[s].label} {sectionStatus(s)}
                    </h3>
                  </div>
                  {active[s].length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">
                      Empty — search above and click a card to add it here.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                      {active[s].map((c, i) => (
                        <div key={`${c.cardId}-${i}`} className="group relative">
                          <div className="relative aspect-[3/4.4] overflow-hidden rounded-lg border border-white/10">
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
                              className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-black uppercase ring-1 ${BAN_COLORS[c.banTcg] ?? "bg-white/10 text-white"}`}
                              title={`TCG: ${c.banTcg}`}
                            >
                              {c.banTcg === "Semi-Limited" ? "Semi" : c.banTcg}
                            </span>
                          )}
                          <button
                            onClick={() => removeCard(s, i)}
                            className="absolute right-1 top-1 hidden rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-red-300 group-hover:block"
                            title={`Remove ${c.name}`}
                          >
                            ✕
                          </button>
                        </div>
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
