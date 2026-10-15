"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  imageSmall,
  tcgPrice,
  formatMoney,
  type YGOCard,
} from "@/lib/ygoprodeck";
import {
  loadCollections,
  saveCollections,
  uid,
  type Collection,
  type VaultCard,
} from "@/lib/storage";

interface AddToVaultModalProps {
  card: YGOCard;
  onClose: () => void;
  onAdded?: (collectionId: string) => void;
}

export default function AddToVaultModal({ card, onClose, onAdded }: AddToVaultModalProps) {
  const [collections, setCollections] = useState<Collection[]>(() => loadCollections());
  const [selectedId, setSelectedId] = useState<string>(collections[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [qty, setQty] = useState(1);
  const [setIndex, setSetIndex] = useState(0);
  const [done, setDone] = useState(false);

  const sets = useMemo(() => card.card_sets ?? [], [card]);
  const chosen = sets[setIndex];

  const handleAdd = () => {
    let targetId = selectedId;
    let next = [...collections];
    if (!targetId) {
      const name = newName.trim() || "My Collection";
      const created: Collection = {
        id: uid(),
        name,
        description: "",
        cards: [],
        createdAt: Date.now(),
      };
      next = [created, ...next];
      targetId = created.id;
    }
    const price = tcgPrice(card);
    next = next.map((c) => {
      if (c.id !== targetId) return c;
      const existingIdx = c.cards.findIndex(
        (vc) =>
          vc.cardId === card.id &&
          (vc.setCode ?? "") === (chosen?.set_code ?? "") &&
          (vc.rarity ?? "") === (chosen?.set_rarity ?? "")
      );
      const entry: VaultCard = {
        cardId: card.id,
        name: card.name,
        type: card.type,
        frameType: card.frameType,
        attribute: card.attribute,
        race: card.race,
        archetype: card.archetype,
        imageSmall: imageSmall(card),
        setCode: chosen?.set_code,
        setName: chosen?.set_name,
        rarity: chosen?.set_rarity,
        price,
        qty,
      };
      if (existingIdx >= 0) {
        const cards = [...c.cards];
        cards[existingIdx] = { ...cards[existingIdx], qty: cards[existingIdx].qty + qty };
        return { ...c, cards };
      }
      return { ...c, cards: [...c.cards, entry] };
    });
    setCollections(next);
    saveCollections(next);
    setDone(true);
    onAdded?.(targetId);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[rgba(255,215,0,0.2)] bg-[#0c1327] p-5 shadow-2xl rise-in"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[rgba(255,215,0,0.15)] text-3xl text-[#ffd700]">
              ✓
            </div>
            <h3 className="text-lg font-bold text-white">Added to your vault</h3>
            <p className="mt-1 text-sm text-slate-400">
              {qty}× {card.name}
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-[#ffd700] px-6 py-2.5 font-bold text-black transition hover:bg-[#ffe44d]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md border border-[rgba(255,215,0,0.2)]">
                <Image src={imageSmall(card)} alt={card.name} fill className="object-cover" sizes="56px" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-bold text-white">{card.name}</h3>
                <p className="text-xs text-slate-400">{card.type}</p>
                <p className="text-sm font-bold text-[#ffd700]">{formatMoney(tcgPrice(card))}</p>
              </div>
            </div>

            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Collection
            </label>
            {collections.length > 0 ? (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mb-3 w-full rounded-lg border border-white/10 bg-[#121b36] px-3 py-2.5 text-sm text-white outline-none focus:border-[#ffd700]"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.cards.reduce((n, x) => n + x.qty, 0)} cards)
                  </option>
                ))}
                <option value="">+ New collection…</option>
              </select>
            ) : null}
            {(selectedId === "" || collections.length === 0) && (
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New collection name"
                className="mb-3 w-full rounded-lg border border-white/10 bg-[#121b36] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
              />
            )}

            {sets.length > 0 && (
              <>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Printing / rarity
                </label>
                <select
                  value={setIndex}
                  onChange={(e) => setSetIndex(Number(e.target.value))}
                  className="mb-3 w-full rounded-lg border border-white/10 bg-[#121b36] px-3 py-2.5 text-sm text-white outline-none focus:border-[#ffd700]"
                >
                  {sets.map((s, i) => (
                    <option key={`${s.set_code}-${i}`} value={i}>
                      {s.set_rarity} — {s.set_code}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Quantity
            </label>
            <div className="mb-5 flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-lg font-bold text-white hover:bg-white/10"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-extrabold text-white">{qty}</span>
              <button
                onClick={() => setQty(Math.min(99, qty + 1))}
                className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-lg font-bold text-white hover:bg-white/10"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 rounded-lg bg-[#ffd700] px-4 py-2.5 font-bold text-black transition hover:bg-[#ffe44d]"
              >
                Add to Vault
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
