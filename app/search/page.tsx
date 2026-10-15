"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  CARD_TYPE_OPTIONS,
  imageSmall,
  searchCards,
  tcgPrice,
  type YGOCard,
} from "@/lib/ygoprodeck";
import CardTile from "@/components/CardTile";
import AddToVaultModal from "@/components/AddToVaultModal";

function SearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [archetype, setArchetype] = useState(searchParams.get("archetype") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [results, setResults] = useState<YGOCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [addCard, setAddCard] = useState<YGOCard | null>(null);

  const runSearch = useCallback(async (n: string, a: string, t: string) => {
    if (!n.trim() && !a.trim() && !t) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const cards = await searchCards({ name: n, archetype: a, type: t });
      setResults(cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed. Try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // run once from URL params
  useEffect(() => {
    const n = searchParams.get("name") ?? "";
    const a = searchParams.get("archetype") ?? "";
    const t = searchParams.get("type") ?? "";
    setName(n);
    setArchetype(a);
    setType(t);
    if (n || a || t) runSearch(n, a, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (name.trim()) q.set("name", name.trim());
    if (archetype.trim()) q.set("archetype", archetype.trim());
    if (type) q.set("type", type);
    router.replace(`/search?${q.toString()}`, { scroll: false });
    runSearch(name, archetype, type);
  };

  return (
    <div className="pt-8 sm:pt-10">
      <p className="eyebrow">Database</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-paper sm:text-4xl">
        Card <span className="text-foil">Search</span>
      </h1>
      <p className="mt-1.5 text-sm text-fog">
        Powered by the free YGOPRODeck database — 10,000+ cards.
      </p>

      <form
        onSubmit={submit}
        className="panel mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:p-5"
        role="search"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Card name (fuzzy)"
          aria-label="Card name"
          className="field px-3.5 py-2.5 text-sm"
        />
        <input
          value={archetype}
          onChange={(e) => setArchetype(e.target.value)}
          placeholder="Archetype — e.g. Blue-Eyes"
          aria-label="Archetype"
          className="field px-3.5 py-2.5 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Card type"
          className="field px-3.5 py-2.5 text-sm"
        >
          <option value="">All types</option>
          {CARD_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading} className="btn-foil px-7 py-2.5 text-sm">
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton aspect-[3/4.4]" />
              <div className="skeleton mt-2 h-4 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="rise-in mx-auto mt-16 max-w-sm text-center">
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-foil-violet"
            style={{ background: "rgba(167,139,250,0.1)", boxShadow: "inset 0 0 0 1px rgba(167,139,250,0.25)" }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="font-display mt-4 text-xl font-bold text-paper">No cards found</h2>
          <p className="mt-1 text-sm text-fog">
            Try a shorter or differently-spelled name — the search is fuzzy.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="mt-8 text-sm text-fog">
            <span className="font-display text-lg font-bold text-foil-violet">{results.length}</span>{" "}
            result{results.length === 1 ? "" : "s"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {results.map((c, i) => (
              <CardTile
                key={c.id}
                index={i}
                imageSmall={imageSmall(c)}
                name={c.name}
                type={c.type}
                price={tcgPrice(c)}
                onClick={() => router.push(`/card/${c.id}`)}
                action={
                  <button
                    onClick={() => setAddCard(c)}
                    className="btn-value w-full py-1.5 text-xs"
                    aria-label={`Add ${c.name} to vault`}
                  >
                    + Vault
                  </button>
                }
              />
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {addCard && <AddToVaultModal card={addCard} onClose={() => setAddCard(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-3 pt-16 sm:grid-cols-5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4.4]" />
          ))}
        </div>
      }
    >
      <SearchInner />
    </Suspense>
  );
}
