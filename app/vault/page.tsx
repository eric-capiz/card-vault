"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx";
import CardTile from "@/components/CardTile";
import { useAuth } from "@/components/AuthProvider";
import { fetchVault, saveVault, type VaultCard } from "@/lib/api";
import { downloadFile } from "@/lib/storage";
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

function rarityRank(r?: string): number {
  if (!r) return 999;
  const i = RARITY_ORDER.findIndex((x) => r.includes(x));
  return i === -1 ? 500 : i;
}

export default function VaultPage() {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const [cards, setCards] = useState<VaultCard[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [typeFilter, setTypeFilter] = useState("");
  const [attrFilter, setAttrFilter] = useState("");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (configured && !authLoading && !user) {
      router.replace("/login?next=/vault");
    }
  }, [configured, authLoading, user, router]);

  useEffect(() => {
    if (!configured || authLoading || !user) {
      if (configured && !authLoading) setPageLoading(false);
      return;
    }
    (async () => {
      try {
        setCards(await fetchVault());
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load your vault.");
      } finally {
        setPageLoading(false);
      }
    })();
  }, [configured, authLoading, user]);

  const persist = async (next: VaultCard[]) => {
    setCards(next);
    setSaving(true);
    try {
      await saveVault(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCard = (ygoId: number) => {
    if (!window.confirm("Remove this card from your vault?")) return;
    persist(cards.filter((c) => c.ygoId !== ygoId));
  };

  const handleChangeQty = (ygoId: number, delta: number) => {
    persist(
      cards
        .map((c) =>
          c.ygoId === ygoId ? { ...c, qty: Math.max(1, Math.min(99, c.qty + delta)) } : c
        )
        .filter((c) => c.qty >= 1)
    );
  };

  const typeOptions = useMemo(
    () => [...new Set(cards.map((c) => c.cardType).filter(Boolean))].sort(),
    [cards]
  );
  const attrOptions = useMemo(
    () => [...new Set(cards.map((c) => c.attribute).filter(Boolean) as string[])].sort(),
    [cards]
  );

  const visibleCards = useMemo(() => {
    let list = [...cards];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (typeFilter) list = list.filter((c) => c.cardType === typeFilter);
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
  }, [cards, query, typeFilter, attrFilter, sortKey, sortDir]);

  const totals = useMemo(
    () => ({
      units: cards.reduce((n, c) => n + c.qty, 0),
      unique: cards.length,
      value: cards.reduce((n, c) => n + c.price * c.qty, 0),
    }),
    [cards]
  );

  const exportXlsx = () => {
    const rows = cards.map((c) => ({
      Name: c.name,
      Type: c.cardType,
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
    XLSX.utils.book_append_sheet(wb, ws, "Vault");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadFile(
      "card-vault.xlsx",
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  };

  const exportJson = () => {
    downloadFile("card-vault.json", JSON.stringify(cards, null, 2), "application/json");
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list: VaultCard[] = Array.isArray(parsed) ? parsed : parsed.cards ?? [];
      if (!Array.isArray(list)) throw new Error("bad file");
      const merged = new Map<number, VaultCard>();
      for (const c of cards) merged.set(c.ygoId, c);
      for (const c of list) {
        if (typeof c.ygoId !== "number" || !c.name) continue;
        const existing = merged.get(c.ygoId);
        merged.set(c.ygoId, {
          ygoId: c.ygoId,
          name: String(c.name),
          qty: Math.max(1, Number(c.qty) || 1) + (existing?.qty ?? 0),
          setCode: c.setCode,
          rarity: c.rarity,
          price: Number(c.price) || 0,
          imageSmall: String(c.imageSmall ?? ""),
          cardType: String(c.cardType ?? ""),
          frameType: String(c.frameType ?? ""),
          attribute: c.attribute,
          race: c.race,
          archetype: c.archetype,
          setName: c.setName,
        });
      }
      await persist([...merged.values()]);
    } catch {
      window.alert("That file doesn't look like a Card Vault export.");
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
            {totals.unique === 0
              ? "Your cardboard kingdom starts here."
              : `${totals.unique} unique · ${totals.units} cards · private to your account`}
            {saving && <span className="ml-2 text-dim">Saving…</span>}
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

      {cards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="panel mt-10 border-dashed border-foil-violet/25! p-10 text-center sm:p-14"
        >
          <h2 className="font-display mt-4 text-2xl font-bold text-paper">Your vault is empty</h2>
          <div className="mx-auto mt-4 max-w-md space-y-2.5 text-left text-sm text-fog">
            {[
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
        <div className="mt-6">
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
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
            </div>
          </div>

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

          {visibleCards.length === 0 ? (
            <div className="panel mt-6 border-dashed p-10 text-center text-sm text-fog">
              No cards match those filters.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              <AnimatePresence>
                {visibleCards.map((c, i) => (
                  <CardTile
                    key={c.ygoId}
                    index={i}
                    imageSmall={c.imageSmall}
                    name={c.name}
                    type={c.cardType}
                    price={c.price * c.qty}
                    qty={c.qty}
                    badge={c.rarity ?? undefined}
                    onClick={() => router.push(`/card/${c.ygoId}`)}
                    action={
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleChangeQty(c.ygoId, -1)}
                            className="btn-ghost grid h-7 w-7 place-items-center rounded-md! font-bold"
                            aria-label={`Decrease quantity of ${c.name}`}
                          >
                            −
                          </button>
                          <button
                            onClick={() => handleChangeQty(c.ygoId, 1)}
                            className="btn-ghost grid h-7 w-7 place-items-center rounded-md! font-bold"
                            aria-label={`Increase quantity of ${c.name}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveCard(c.ygoId)}
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
  );
}
