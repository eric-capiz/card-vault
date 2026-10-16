"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  imageSmall,
  tcgPrice,
  formatMoney,
  type YGOCard,
} from "@/lib/ygoprodeck";
import { useAuth } from "@/components/AuthProvider";
import { fetchVault, saveVault, type VaultCard } from "@/lib/api";

interface AddToVaultModalProps {
  card: YGOCard;
  onClose: () => void;
  onAdded?: () => void;
}

export default function AddToVaultModal({ card, onClose, onAdded }: AddToVaultModalProps) {
  const { user, loading: authLoading, configured } = useAuth();
  const [qty, setQty] = useState(1);
  const [setIndex, setSetIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sets = useMemo(() => card.card_sets ?? [], [card]);
  const chosen = sets[setIndex];

  // lock body scroll + close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handleAdd = async () => {
    setBusy(true);
    setError("");
    try {
      const cards = await fetchVault();
      const existing = cards.find((c) => c.ygoId === card.id);
      const entry: VaultCard = {
        ygoId: card.id,
        name: card.name,
        qty: qty + (existing?.qty ?? 0),
        setCode: chosen?.set_code,
        rarity: chosen?.set_rarity,
        price: tcgPrice(card),
        imageSmall: imageSmall(card),
        cardType: card.type,
        frameType: card.frameType,
        attribute: card.attribute,
        race: card.race,
        archetype: card.archetype,
        setName: chosen?.set_name,
      };
      const next = existing
        ? cards.map((c) => (c.ygoId === card.id ? entry : c))
        : [...cards, entry];
      await saveVault(next);
      setDone(true);
      onAdded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the card.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${card.name} to vault`}
    >
      <motion.div
        className="panel w-full max-w-md p-5 shadow-[0_30px_80px_rgba(0,0,0,0.7)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 14 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        {!configured || (!authLoading && !user) ? (
          <div className="py-6 text-center">
            <div
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-2xl text-obsidian"
              style={{
                background:
                  "linear-gradient(135deg,#c4b5fd,#a78bfa 35%,#67e8f9 70%,#f9a8d4)",
              }}
              aria-hidden
            >
              ◆
            </div>
            <h3 className="font-display text-lg font-bold text-paper">
              {!configured ? "Accounts aren't set up yet" : "Log in to save cards"}
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-fog">
              {!configured
                ? "This deployment doesn't have its database keys configured yet (MONGODB_URI and SESSION_SECRET). Card search and details still work — saving will be available once setup is finished."
                : "Your vault is private to your account. Log in or create a free account to start collecting."}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={onClose} className="btn-ghost px-5 py-2.5 text-sm">
                Close
              </button>
              {configured && (
                <Link href="/login" className="btn-foil px-5 py-2.5 text-sm">
                  Log In
                </Link>
              )}
            </div>
          </div>
        ) : done ? (
          <div className="py-8 text-center">
            <motion.div
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-400/15 text-3xl text-emerald-300"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              aria-hidden
            >
              ✓
            </motion.div>
            <h3 className="font-display text-lg font-bold text-paper">Added to your vault</h3>
            <p className="mt-1 text-sm text-fog">
              {qty}× {card.name}
            </p>
            <button onClick={onClose} className="btn-foil mt-6 px-8 py-2.5 text-sm">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10">
                <Image src={imageSmall(card)} alt={card.name} fill className="object-cover" sizes="56px" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-display font-bold text-paper">{card.name}</h3>
                <p className="text-xs text-fog">{card.type}</p>
                <p className="text-sm font-extrabold text-value">{formatMoney(tcgPrice(card))}</p>
              </div>
            </div>

            {authLoading ? (
              <p className="py-4 text-center text-sm text-fog">Loading…</p>
            ) : (
              <>
                {sets.length > 0 && (
                  <>
                    <label className="eyebrow mb-1.5 block" htmlFor="av-printing">
                      Printing / rarity
                    </label>
                    <select
                      id="av-printing"
                      value={setIndex}
                      onChange={(e) => setSetIndex(Number(e.target.value))}
                      className="field mb-3 w-full px-3 py-2.5 text-sm"
                    >
                      {sets.map((s, i) => (
                        <option key={`${s.set_code}-${i}`} value={i}>
                          {s.set_rarity} — {s.set_code}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <span className="eyebrow mb-1.5 block" id="av-qty-label">
                  Quantity
                </span>
                <div className="mb-5 flex items-center gap-3" role="group" aria-labelledby="av-qty-label">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="btn-ghost grid h-9 w-9 place-items-center text-lg"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-display text-lg font-extrabold text-paper" aria-live="polite">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(Math.min(99, qty + 1))}
                    className="btn-ghost grid h-9 w-9 place-items-center text-lg"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {error && (
                  <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button onClick={onClose} className="btn-ghost flex-1 px-4 py-2.5 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={busy}
                    className="btn-foil flex-1 px-4 py-2.5 text-sm"
                  >
                    {busy ? "Adding…" : "Add to Vault"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
