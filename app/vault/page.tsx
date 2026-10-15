"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import CardTile from "@/components/CardTile";
import {
  downloadFile,
  loadCollections,
  saveCollections,
  uid,
  type Collection,
  type VaultCard,
} from "@/lib/storage";
import { formatMoney } from "@/lib/ygoprodeck";

type SortKey = "name" | "price" | "qty" | "rarity";

const RARITY_ORDER = [
  "Starlight Rare",
  "Quarter Century Secret Rare",
  "Secret Rare",
  "Ultra Rare",
  "Super Rare",
  "Ultimate Rare",
  "Ghost Rare",
  "Gold Rare",
  "Rare",
  "Common",
];

function rarityRank(r?: string): number {
  if (!r) return 999;
  const i = RARITY_ORDER.findIndex((x) => r.includes(x));
  return i === -1 ? 500 : i;
}

export default function VaultPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>(() => loadCollections());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [typeFilter, setTypeFilter] = useState("");
  const [attrFilter, setAttrFilter] = useState("");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = (next: Collection[]) => {
    setCollections(next);
    saveCollections(next);
  };

  const active: Collection | null = useMemo(
    () => collections.find((c) => c.id === activeId) ?? collections[0] ?? null,
    [collections, activeId]
  );

  const createCollection = () => {
    const name = newName.trim();
    if (!name) return;
    const c: Collection = { id: uid(), name, description: "", cards: [], createdAt: Date.now() };
    const next = [c, ...collections];
    persist(next);
    setActiveId(c.id);
    setNewName("");
  };

  const deleteCollection = (id: string) => {
    if (!window.confirm("Delete this collection and all its cards? This can't be undone.")) return;
    persist(collections.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const renameCollection = () => {
    if (!active || !renameValue.trim()) {
      setRenaming(false);
      return;
    }
    persist(collections.map((c) => (c.id === active.id ? { ...c, name: renameValue.trim() } : c)));
    setRenaming(false);
  };

  const removeCard = (cardId: number, setCode?: string, rarity?: string) => {
    if (!active) return;
    if (!window.confirm("Remove this card from the collection?")) return;
    persist(
      collections.map((c) =>
        c.id === active.id
          ? {
              ...c,
              cards: c.cards.filter(
                (vc) =>
                  !(
                    vc.cardId === cardId &&
                    (vc.setCode ?? "") === (setCode ?? "") &&
                    (vc.rarity ?? "") === (rarity ?? "")
                  )
              ),
            }
          : c
      )
    );
  };

  const changeQty = (vc: VaultCard, delta: number) => {
    if (!active) return;
    const nextQty = vc.qty + delta;
    persist(
      collections.map((c) =>
        c.id === active.id
          ? {
              ...c,
              cards:
                nextQty <= 0
                  ? c.cards.filter((x) => x !== vc)
                  : c.cards.map((x) => (x === vc ? { ...x, qty: nextQty } : x)),
            }
          : c
      )
    );
  };

  const typeOptions = useMemo(
    () => [...new Set((active?.cards ?? []).map((c) => c.type))].sort(),
    [active]
  );
  const attrOptions = useMemo(
    () => [...new Set((active?.cards ?? []).map((c) => c.attribute).filter(Boolean) as string[])].sort(),
    [active]
  );

  const visibleCards = useMemo(() => {
    let list = [...(active?.cards ?? [])];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (typeFilter) list = list.filter((c) => c.type === typeFilter);
    if (attrFilter) list = list.filter((c) => c.attribute === attrFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "price") cmp = a.price * a.qty - b.price * b.qty;
      else if (sortKey === "qty") cmp = a.qty - b.qty;
      else cmp = rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [active, query, typeFilter, attrFilter, sortKey, sortDir]);

  const totals = useMemo(() => {
    const cards = active?.cards ?? [];
    return {
      units: cards.reduce((n, c) => n + c.qty, 0),
      unique: cards.length,
      value: cards.reduce((n, c) => n + c.price * c.qty, 0),
    };
  }, [active]);

  const exportXlsx = () => {
    if (!active) return;
    const rows = active.cards.map((c) => ({
      Name: c.name,
      Type: c.type,
      Attribute: c.attribute ?? "",
      Race: c.race ?? "",
      Archetype: c.archetype ?? "",
      Set: c.setName ?? "",
      "Set Code": c.setCode ?? "",
      Rarity: c.rarity ?? "",
      Quantity: c.qty,
      "Price (USD)": c.price,
      "Total Value (USD)": +(c.price * c.qty).toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collection");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadFile(
      `${active.name.replace(/[^a-z0-9-_]+/gi, "_")}.xlsx`,
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  };

  const exportJson = () => {
    if (!active) return;
    downloadFile(
      `${active.name.replace(/[^a-z0-9-_]+/gi, "_")}.json`,
      JSON.stringify(active, null, 2),
      "application/json"
    );
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Collection;
      if (!parsed || !Array.isArray(parsed.cards)) throw new Error("bad file");
      const imported: Collection = {
        id: uid(),
        name: `${parsed.name ?? "Imported"} (imported)`,
        description: parsed.description ?? "",
        cards: parsed.cards,
        createdAt: Date.now(),
      };
      const next = [imported, ...collections];
      persist(next);
      setActiveId(imported.id);
    } catch {
      window.alert("That file doesn't look like a Card Vault collection export.");
    }
  };

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-gold-grad text-3xl font-black sm:text-4xl">My Vault</h1>
          <p className="mt-1 text-sm text-slate-400">
            {collections.length === 0
              ? "Your cardboard kingdom starts here."
              : `${collections.length} collection${collections.length === 1 ? "" : "s"} · stored locally in this browser`}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            Import JSON
          </button>
          <button
            onClick={() => router.push("/search")}
            className="rounded-lg bg-[#ffd700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ffe44d]"
          >
            + Add Cards
          </button>
        </div>
      </div>

      {/* new collection */}
      <div className="mt-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createCollection()}
          placeholder="New collection name — e.g. “Binder 1”"
          className="max-w-sm flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
        />
        <button
          onClick={createCollection}
          disabled={!newName.trim()}
          className="rounded-lg bg-[rgba(255,215,0,0.14)] px-4 py-2.5 text-sm font-bold text-[#ffd700] ring-1 ring-[rgba(255,215,0,0.3)] transition hover:bg-[rgba(255,215,0,0.22)] disabled:opacity-40"
        >
          Create
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-[rgba(255,215,0,0.25)] bg-[#0c1327]/60 p-10 text-center">
          <div className="text-6xl">🗝️</div>
          <h2 className="mt-4 text-2xl font-extrabold text-white">Your vault is empty</h2>
          <div className="mx-auto mt-4 max-w-md space-y-2 text-left text-sm text-slate-300">
            <p><span className="font-bold text-[#ffd700]">1.</span> Create a collection above (a binder, a deck box, whatever).</p>
            <p><span className="font-bold text-[#ffd700]">2.</span> Search the card database and tap <b>+ Vault</b> on anything you own.</p>
            <p><span className="font-bold text-[#ffd700]">3.</span> Or scan cards with your camera on the <b>Scanner</b> page.</p>
            <p><span className="font-bold text-[#ffd700]">4.</span> Watch your collection value grow on the <b>Dashboard</b>.</p>
          </div>
          <button
            onClick={() => router.push("/search")}
            className="mt-6 rounded-xl bg-[#ffd700] px-8 py-3 font-bold text-black transition hover:bg-[#ffe44d]"
          >
            Find Cards
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* collection list */}
          <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start">
            {collections.map((c) => {
              const isActive = active?.id === c.id;
              const units = c.cards.reduce((n, x) => n + x.qty, 0);
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isActive
                      ? "border-[rgba(255,215,0,0.45)] bg-[rgba(255,215,0,0.08)]"
                      : "border-white/8 bg-[#0c1327]/70 hover:border-white/20"
                  }`}
                >
                  <p className={`truncate text-sm font-bold ${isActive ? "text-[#ffd700]" : "text-white"}`}>
                    {c.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.cards.length} unique · {units} cards
                  </p>
                </button>
              );
            })}
          </aside>

          {/* active collection */}
          {active && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[rgba(255,215,0,0.14)] bg-[#0c1327]/80 p-4">
                <div className="flex min-w-0 items-center gap-2">
                  {renaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameCollection();
                        if (e.key === "Escape") setRenaming(false);
                      }}
                      onBlur={renameCollection}
                      className="rounded-lg border border-[#ffd700] bg-black/40 px-2 py-1 text-lg font-extrabold text-white outline-none"
                    />
                  ) : (
                    <h2
                      className="cursor-pointer truncate text-xl font-extrabold text-white hover:text-[#ffd700]"
                      title="Click to rename"
                      onClick={() => {
                        setRenameValue(active.name);
                        setRenaming(true);
                      }}
                    >
                      {active.name}
                    </h2>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-lg bg-white/5 px-2.5 py-1 font-semibold text-slate-300">
                    {totals.unique} unique
                  </span>
                  <span className="rounded-lg bg-white/5 px-2.5 py-1 font-semibold text-slate-300">
                    {totals.units} cards
                  </span>
                  <span className="rounded-lg bg-[rgba(255,215,0,0.12)] px-2.5 py-1 font-extrabold text-[#ffd700]">
                    {formatMoney(totals.value)}
                  </span>
                  <button
                    onClick={exportXlsx}
                    className="rounded-lg border border-white/15 px-2.5 py-1 font-semibold text-slate-200 hover:bg-white/5"
                    title="Export to Excel"
                  >
                    XLSX
                  </button>
                  <button
                    onClick={exportJson}
                    className="rounded-lg border border-white/15 px-2.5 py-1 font-semibold text-slate-200 hover:bg-white/5"
                    title="Export to JSON"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => deleteCollection(active.id)}
                    className="rounded-lg border border-red-500/30 px-2.5 py-1 font-semibold text-red-300 hover:bg-red-500/10"
                    title="Delete collection"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* sort / filter */}
              {active.cards.length > 0 && (
                <div className="mt-4 grid gap-2 rounded-2xl border border-white/8 bg-black/20 p-3 sm:grid-cols-2 lg:grid-cols-5">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by name…"
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
                  />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#ffd700]"
                  >
                    <option value="">All types</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={attrFilter}
                    onChange={(e) => setAttrFilter(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#ffd700]"
                  >
                    <option value="">All attributes</option>
                    {attrOptions.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#ffd700]"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="price">Sort: Value</option>
                    <option value="qty">Sort: Quantity</option>
                    <option value="rarity">Sort: Rarity</option>
                  </select>
                  <button
                    onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm font-bold text-slate-200 hover:border-[#ffd700]"
                  >
                    {sortDir === "asc" ? "↑ Ascending" : "↓ Descending"}
                  </button>
                </div>
              )}

              {visibleCards.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-400">
                  {active.cards.length === 0 ? (
                    <>
                      <p className="text-base font-bold text-white">Nothing in here yet</p>
                      <p className="mt-1">Search the database or scan cards to start filling this collection.</p>
                      <button
                        onClick={() => router.push("/search")}
                        className="mt-4 rounded-lg bg-[#ffd700] px-6 py-2.5 font-bold text-black hover:bg-[#ffe44d]"
                      >
                        Search Cards
                      </button>
                    </>
                  ) : (
                    "No cards match those filters."
                  )}
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                  {visibleCards.map((c) => (
                    <CardTile
                      key={`${c.cardId}-${c.setCode ?? ""}-${c.rarity ?? ""}`}
                      imageSmall={c.imageSmall}
                      name={c.name}
                      type={c.type}
                      price={c.price * c.qty}
                      qty={c.qty}
                      badge={c.rarity}
                      onClick={() => router.push(`/card/${c.cardId}`)}
                      action={
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => changeQty(c, -1)}
                              className="grid h-7 w-7 place-items-center rounded-md bg-white/5 font-bold text-white hover:bg-white/10"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <button
                              onClick={() => changeQty(c, 1)}
                              className="grid h-7 w-7 place-items-center rounded-md bg-white/5 font-bold text-white hover:bg-white/10"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeCard(c.cardId, c.setCode, c.rarity)}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
