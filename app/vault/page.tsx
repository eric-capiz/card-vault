"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
    return (
      <div className="pt-10" aria-hidden>
        <div className="skeleton h-9 w-48" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4.4]" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="pt-8 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Collection</p>
          <h1 className="font-display mt-1 text-3xl font-bold text-paper sm:text-4xl">
            My <span className="text-foil">Vault</span>
          </h1>
          <p className="mt-1.5 text-sm text-fog">
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
          <button onClick={() => fileRef.current?.click()} className="btn-ghost px-4 py-2 text-sm">
            Import JSON
          </button>
          <button onClick={() => router.push("/search")} className="btn-foil px-4 py-2 text-sm">
            + Add Cards
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {localCount > 0 && (
        <div className="panel mt-4 flex flex-wrap items-center justify-between gap-3 border-foil-violet/30! p-4">
          <p className="text-sm text-paper">
            <span className="font-bold text-foil-violet">Found {localCount} local collection{localCount === 1 ? "" : "s"}</span>{" "}
            <span className="text-fog">saved in this browser before accounts existed.</span>
          </p>
          <button onClick={handleImportLocal} disabled={migrating} className="btn-foil px-4 py-2 text-sm">
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
          aria-label="New collection name"
          className="field max-w-sm flex-1 px-3.5 py-2.5 text-sm"
        />
        <button onClick={handleCreateCollection} disabled={!newName.trim()} className="btn-value px-5 py-2.5 text-sm">
          Create
        </button>
      </div>

      {collections.length === 0 ? (
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
              <rect x="4" y="3" width="12" height="17" rx="2" />
              <path d="M8 3v17" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="font-display mt-4 text-2xl font-bold text-paper">Your vault is empty</h2>
          <div className="mx-auto mt-4 max-w-md space-y-2.5 text-left text-sm text-fog">
            {[
              "Create a collection above (a binder, a deck box, whatever).",
              "Search the card database and tap + Vault on anything you own.",
              "Or scan cards with your camera on the Scanner page.",
              "Watch your collection value grow on the Dashboard.",
            ].map((t, i) => (
              <p key={i} className="flex gap-2.5">
                <span className="font-display font-bold text-foil-violet">{i + 1}.</span> {t}
              </p>
            ))}
          </div>
          <button onClick={() => router.push("/search")} className="btn-foil mt-7 px-8 py-3 text-sm">
            Find Cards
          </button>
        </motion.div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* collection list */}
          <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start" aria-label="Collections">
            {collections.map((c) => {
              const isActive = active?.id === c.id;
              const units = c.cards.reduce((n, x) => n + x.qty, 0);
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative w-full overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-200 ${
                    isActive
                      ? "border-foil-violet/40 bg-gradient-to-r from-foil-violet/12 to-foil-cyan/8"
                      : "border-white/8 bg-ink/70 hover:border-white/20 hover:bg-panel"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="vault-active-bar"
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{ background: "linear-gradient(180deg,#a78bfa,#67e8f9,#f9a8d4)" }}
                    />
                  )}
                  <p className={`truncate text-sm font-bold ${isActive ? "text-paper" : "text-paper/85"}`}>
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-xs text-dim">
                    {c.cards.length} unique · {units} cards
                  </p>
                </button>
              );
            })}
          </aside>

          {/* active collection */}
          {active && (
            <div className="min-w-0">
              <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
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
                      aria-label="Collection name"
                      className="field w-full max-w-xs px-2.5 py-1.5 font-display text-lg font-bold"
                    />
                  ) : (
                    <h2
                      className="font-display cursor-pointer truncate text-xl font-bold text-paper transition-colors hover:text-foil-violet"
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
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip">{totals.unique} unique</span>
                  <span className="chip">{totals.units} cards</span>
                  <span className="chip border-value/30! bg-value/10! text-value! font-extrabold">
                    {formatMoney(totals.value)}
                  </span>
                  <button onClick={exportXlsx} className="btn-ghost px-2.5 py-1.5" title="Export to Excel">
                    XLSX
                  </button>
                  <button onClick={exportJson} className="btn-ghost px-2.5 py-1.5" title="Export to JSON">
                    JSON
                  </button>
                  <button
                    onClick={() => handleDeleteCollection(active.id)}
                    className="rounded-lg border border-red-500/30 px-2.5 py-1.5 font-semibold text-red-300 transition hover:bg-red-500/10"
                    title="Delete collection"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* sort / filter */}
              {active.cards.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by name…"
                    aria-label="Filter by name"
                    className="field col-span-2 px-3 py-2 text-sm sm:col-span-1"
                  />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    aria-label="Filter by type"
                    className="field px-3 py-2 text-sm"
                  >
                    <option value="">All types</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={attrFilter}
                    onChange={(e) => setAttrFilter(e.target.value)}
                    aria-label="Filter by attribute"
                    className="field px-3 py-2 text-sm"
                  >
                    <option value="">All attributes</option>
                    {attrOptions.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    aria-label="Sort by"
                    className="field px-3 py-2 text-sm"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="price">Sort: Value</option>
                    <option value="qty">Sort: Quantity</option>
                    <option value="rarity">Sort: Rarity</option>
                  </select>
                  <button
                    onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                    className="field px-3 py-2 text-sm font-bold text-fog transition hover:text-paper"
                    aria-label="Toggle sort direction"
                  >
                    {sortDir === "asc" ? "↑ Ascending" : "↓ Descending"}
                  </button>
                </div>
              )}

              {visibleCards.length === 0 ? (
                <div className="panel mt-6 border-dashed p-10 text-center text-sm text-fog">
                  {active.cards.length === 0 ? (
                    <>
                      <p className="font-display text-base font-bold text-paper">Nothing in here yet</p>
                      <p className="mt-1">Search the database or scan cards to start filling this collection.</p>
                      <button onClick={() => router.push("/search")} className="btn-foil mt-4 px-6 py-2.5 text-sm">
                        Search Cards
                      </button>
                    </>
                  ) : (
                    "No cards match those filters."
                  )}
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                  <AnimatePresence>
                    {visibleCards.map((c, i) => (
                      <CardTile
                        key={c.id}
                        index={i}
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
                                className="btn-ghost grid h-7 w-7 place-items-center rounded-md! font-bold"
                                aria-label={`Decrease quantity of ${c.name}`}
                              >
                                −
                              </button>
                              <button
                                onClick={() => handleChangeQty(c, 1)}
                                className="btn-ghost grid h-7 w-7 place-items-center rounded-md! font-bold"
                                aria-label={`Increase quantity of ${c.name}`}
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveCard(c.id)}
                              className="rounded-md px-2 py-1 text-xs font-semibold text-red-300/80 transition hover:bg-red-500/10 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
