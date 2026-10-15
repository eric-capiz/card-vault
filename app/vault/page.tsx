"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import CardTile from "@/components/CardTile";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import {
  addCard,
  createCollection as dbCreateCollection,
  deleteCollection as dbDeleteCollection,
  getCollections,
  removeCard as dbRemoveCard,
  renameCollection as dbRenameCollection,
  updateCardQty as dbUpdateCardQty,
  type CollectionWithCards,
  type NewVaultCard,
  type VaultCardRow,
} from "@/lib/db";
import {
  clearLocalVaultData,
  downloadFile,
  loadCollections as loadLocalCollections,
  type Collection as LocalCollection,
} from "@/lib/storage";
import { formatMoney } from "@/lib/ygoprodeck";
import { NotConfiguredNotice } from "@/app/login/LoginForm";

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

function rarityRank(r?: string | null): number {
  if (!r) return 999;
  const i = RARITY_ORDER.findIndex((x) => r.includes(x));
  return i === -1 ? 500 : i;
}

function localCardToNew(c: LocalCollection["cards"][number]): NewVaultCard {
  return {
    ygoId: c.cardId,
    name: c.name,
    qty: c.qty,
    setCode: c.setCode ?? null,
    rarity: c.rarity ?? null,
    price: c.price,
    imageSmall: c.imageSmall,
    meta: {
      type: c.type,
      frameType: c.frameType,
      attribute: c.attribute,
      race: c.race,
      archetype: c.archetype,
      setName: c.setName,
    },
  };
}

export default function VaultPage() {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const [collections, setCollections] = useState<CollectionWithCards[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [typeFilter, setTypeFilter] = useState("");
  const [attrFilter, setAttrFilter] = useState("");
  const [query, setQuery] = useState("");
  const [migrating, setMigrating] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Redirect logged-out users (middleware also guards this route server-side).
  useEffect(() => {
    if (configured && !authLoading && !user) {
      router.replace("/login?next=/vault");
    }
  }, [configured, authLoading, user, router]);

  const refresh = async () => {
    const client = getSupabaseBrowser();
    if (!client) return;
    try {
      const data = await getCollections(client);
      setCollections(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your vault.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (!configured || authLoading || !user) {
      if (configured && !authLoading) setPageLoading(false);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, authLoading, user]);

  // Detect pre-auth localStorage vault data for the one-click migration.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setLocalCount(loadLocalCollections().length);
  }, []);

  const active: CollectionWithCards | null = useMemo(
    () => collections.find((c) => c.id === activeId) ?? collections[0] ?? null,
    [collections, activeId]
  );

  const mutate = async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const handleCreateCollection = () => {
    const name = newName.trim();
    if (!name) return;
    const client = getSupabaseBrowser();
    if (!client) return;
    setNewName("");
    mutate(async () => {
      const created = await dbCreateCollection(client, name);
      setCollections((prev) => [created, ...prev]);
      setActiveId(created.id);
    });
  };

  const handleDeleteCollection = (id: string) => {
    if (!window.confirm("Delete this collection and all its cards? This can't be undone.")) return;
    const client = getSupabaseBrowser();
    if (!client) return;
    if (activeId === id) setActiveId(null);
    mutate(() => dbDeleteCollection(client, id));
  };

  const handleRename = () => {
    if (!active || !renameValue.trim()) {
      setRenaming(false);
      return;
    }
    const client = getSupabaseBrowser();
    if (!client) return;
    const title = renameValue.trim();
    setRenaming(false);
    mutate(() => dbRenameCollection(client, active.id, title));
  };

  const handleRemoveCard = (rowId: string) => {
    if (!window.confirm("Remove this card from the collection?")) return;
    const client = getSupabaseBrowser();
    if (!client) return;
    mutate(() => dbRemoveCard(client, rowId));
  };

  const handleChangeQty = (row: VaultCardRow, delta: number) => {
    const client = getSupabaseBrowser();
    if (!client) return;
    mutate(() => dbUpdateCardQty(client, row.id, row.qty + delta));
  };

  const handleImportLocal = async () => {
    const client = getSupabaseBrowser();
    if (!client) return;
    setMigrating(true);
    setError("");
    try {
      const local = loadLocalCollections();
      for (const lc of local) {
        const created = await dbCreateCollection(client, lc.name, lc.description ?? "");
        for (const c of lc.cards) {
          await addCard(client, created.id, localCardToNew(c));
        }
      }
      clearLocalVaultData();
      setLocalCount(0);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setMigrating(false);
    }
  };

  const typeOptions = useMemo(
    () => [...new Set((active?.cards ?? []).map((c) => c.type))].sort(),
    [active]
  );
  const attrOptions = useMemo(
    () =>
      [...new Set((active?.cards ?? []).map((c) => c.attribute).filter(Boolean) as string[])].sort(),
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
      `${active.title.replace(/[^a-z0-9-_]+/gi, "_")}.xlsx`,
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  };

  const exportJson = () => {
    if (!active) return;
    downloadFile(
      `${active.title.replace(/[^a-z0-9-_]+/gi, "_")}.json`,
      JSON.stringify(active, null, 2),
      "application/json"
    );
  };

  const importJson = async (file: File) => {
    const client = getSupabaseBrowser();
    if (!client) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as LocalCollection;
      if (!parsed || !Array.isArray(parsed.cards)) throw new Error("bad file");
      const created = await dbCreateCollection(
        client,
        `${parsed.name ?? "Imported"} (imported)`,
        parsed.description ?? ""
      );
      for (const c of parsed.cards) {
        await addCard(client, created.id, localCardToNew(c));
      }
      await refresh();
      setActiveId(created.id);
    } catch {
      window.alert("That file doesn't look like a Card Vault collection export.");
    }
  };

  if (!configured) {
    return (
      <div className="mx-auto max-w-md pt-16">
        <NotConfiguredNotice />
      </div>
    );
  }

  if (authLoading || pageLoading) {
    return <div className="pt-24 text-center text-sm text-slate-400">Loading your vault…</div>;
  }

  if (!user) return null;

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-gold-grad text-3xl font-black sm:text-4xl">My Vault</h1>
          <p className="mt-1 text-sm text-slate-400">
            {collections.length === 0
              ? "Your cardboard kingdom starts here."
              : `${collections.length} collection${collections.length === 1 ? "" : "s"} · private to your account`}
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

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {localCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(255,215,0,0.35)] bg-[rgba(255,215,0,0.07)] p-4">
          <p className="text-sm text-slate-200">
            <span className="font-bold text-[#ffd700]">Found {localCount} local collection{localCount === 1 ? "" : "s"}</span>{" "}
            saved in this browser before accounts existed.
          </p>
          <button
            onClick={handleImportLocal}
            disabled={migrating}
            className="rounded-lg bg-[#ffd700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ffe44d] disabled:opacity-50"
          >
            {migrating ? "Importing…" : "Import my local cards"}
          </button>
        </div>
      )}

      {/* new collection */}
      <div className="mt-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
          placeholder="New collection name — e.g. “Binder 1”"
          className="max-w-sm flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
        />
        <button
          onClick={handleCreateCollection}
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
                    {c.title}
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
                        if (e.key === "Enter") handleRename();
                        if (e.key === "Escape") setRenaming(false);
                      }}
                      onBlur={handleRename}
                      className="rounded-lg border border-[#ffd700] bg-black/40 px-2 py-1 text-lg font-extrabold text-white outline-none"
                    />
                  ) : (
                    <h2
                      className="cursor-pointer truncate text-xl font-extrabold text-white hover:text-[#ffd700]"
                      title="Click to rename"
                      onClick={() => {
                        setRenameValue(active.title);
                        setRenaming(true);
                      }}
                    >
                      {active.title}
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
                    onClick={() => handleDeleteCollection(active.id)}
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
                      key={c.id}
                      imageSmall={c.imageSmall}
                      name={c.name}
                      type={c.type}
                      price={c.price * c.qty}
                      qty={c.qty}
                      badge={c.rarity ?? undefined}
                      onClick={() => router.push(`/card/${c.ygoId}`)}
                      action={
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleChangeQty(c, -1)}
                              className="grid h-7 w-7 place-items-center rounded-md bg-white/5 font-bold text-white hover:bg-white/10"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <button
                              onClick={() => handleChangeQty(c, 1)}
                              className="grid h-7 w-7 place-items-center rounded-md bg-white/5 font-bold text-white hover:bg-white/10"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveCard(c.id)}
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
