"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div className="pt-8">
      <h1 className="text-gold-grad text-3xl font-black sm:text-4xl">Card Search</h1>
      <p className="mt-1 text-sm text-slate-400">
        Powered by the free YGOPRODeck database — 10,000+ cards.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-3 rounded-2xl border border-[rgba(255,215,0,0.14)] bg-[#0c1327]/80 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Card name (fuzzy)"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
        />
        <input
          value={archetype}
          onChange={(e) => setArchetype(e.target.value)}
          placeholder="Archetype — e.g. Blue-Eyes"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ffd700]"
        >
          <option value="">All types</option>
          {CARD_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#ffd700] px-6 py-2.5 font-bold text-black transition hover:bg-[#ffe44d] disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4.4] rounded-xl bg-white/5" />
              <div className="mt-2 h-4 w-3/4 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="mt-16 text-center">
          <div className="text-5xl">🔍</div>
          <h2 className="mt-4 text-xl font-bold text-white">No cards found</h2>
          <p className="mt-1 text-sm text-slate-400">
            Try a shorter or differently-spelled name — the search is fuzzy.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="mt-6 text-sm text-slate-400">
            <span className="font-bold text-[#ffd700]">{results.length}</span> result
            {results.length === 1 ? "" : "s"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {results.map((c) => (
              <CardTile
                key={c.id}
                imageSmall={imageSmall(c)}
                name={c.name}
                type={c.type}
                price={tcgPrice(c)}
                onClick={() => router.push(`/card/${c.id}`)}
                action={
                  <button
                    onClick={() => setAddCard(c)}
                    className="w-full rounded-lg bg-[rgba(255,215,0,0.12)] py-1.5 text-xs font-bold text-[#ffd700] ring-1 ring-[rgba(255,215,0,0.3)] transition hover:bg-[rgba(255,215,0,0.22)]"
                  >
                    + Vault
                  </button>
                }
              />
            ))}
          </div>
        </>
      )}

      {addCard && <AddToVaultModal card={addCard} onClose={() => setAddCard(null)} />}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="pt-16 text-center text-slate-400">Loading search…</div>}>
      <SearchInner />
    </Suspense>
  );
}
