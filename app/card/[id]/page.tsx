"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ATTRIBUTE_COLORS,
  banStatus,
  cardmarketPrice,
  formatMoney,
  getCard,
  imageFull,
  parsePrice,
  tcgPrice,
  type YGOCard,
} from "@/lib/ygoprodeck";
import AddToVaultModal from "@/components/AddToVaultModal";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-3.5">
      <p className="eyebrow">{label}</p>
      <p className="font-display mt-1 text-lg font-bold text-paper">{value}</p>
    </div>
  );
}

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<YGOCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let alive = true;
    getCard(params.id)
      .then((c) => {
        if (!alive) return;
        if (!c) setError("Card not found.");
        setCard(c);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load card."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="grid gap-8 pt-10 md:grid-cols-[320px_1fr]" aria-hidden>
        <div className="skeleton mx-auto aspect-[3/4.4] w-full max-w-[320px]" />
        <div className="space-y-3">
          <div className="skeleton h-9 w-2/3" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-28" />
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="pt-24 text-center">
        <h1 className="font-display mt-4 text-xl font-bold text-paper">{error || "Card not found"}</h1>
        <button onClick={() => router.push("/search")} className="btn-foil mt-6 px-8 py-2.5 text-sm">
          Back to Search
        </button>
      </div>
    );
  }

  const ban = banStatus(card);
  const prices = card.card_prices?.[0];
  const sets = card.card_sets ?? [];
  const attrColor = card.attribute ? ATTRIBUTE_COLORS[card.attribute] : undefined;

  return (
    <div className="pt-8 sm:pt-10">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-fog transition hover:text-paper"
      >
        <span aria-hidden>←</span> Back
      </button>

      <div className="grid gap-8 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
        {/* Card art */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotateY: -8 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[300px] lg:max-w-[340px]"
          style={{ perspective: 1000 }}
        >
          <div className="holo group relative overflow-hidden rounded-2xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.65)] transition-transform duration-500 hover:[transform:rotateY(6deg)_rotateX(-3deg)_scale(1.02)]">
            <div className="relative aspect-[3/4.4]">
              <Image
                src={imageFull(card)}
                alt={card.name}
                fill
                sizes="340px"
                className="object-cover"
                priority
              />
            </div>
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background:
                  "linear-gradient(115deg, transparent 45%, rgba(196,181,253,0.12) 50%, rgba(103,232,249,0.14) 55%, transparent 65%)",
              }}
              aria-hidden
            />
          </div>
          <div className="mx-auto mt-[-6px] h-8 w-2/3 rounded-[100%] bg-black/60 blur-xl" aria-hidden />
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
                {card.name}
              </h1>
              <p className="mt-1.5 text-sm text-fog">
                {card.humanReadableCardType}
                {card.archetype ? ` · ${card.archetype}` : ""}
                {card.race ? ` · ${card.race}` : ""}
              </p>
            </div>
            {ban && (
              <span
                className={`rounded-lg px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider ring-1 ${
                  ban === "Forbidden"
                    ? "bg-red-500/15 text-red-300 ring-red-500/40"
                    : ban === "Limited"
                      ? "bg-orange-500/15 text-orange-300 ring-orange-500/40"
                      : "bg-yellow-500/15 text-yellow-300 ring-yellow-500/40"
                }`}
              >
                {ban} · TCG
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {card.attribute && (
              <Stat label="Attribute" value={<span style={{ color: attrColor }}>{card.attribute}</span>} />
            )}
            {typeof card.level === "number" && <Stat label="Level / Rank" value={`★ ${card.level}`} />}
            {typeof card.atk === "number" && <Stat label="ATK" value={card.atk.toLocaleString()} />}
            {typeof card.def === "number" && <Stat label="DEF" value={card.def.toLocaleString()} />}
            {typeof card.linkval === "number" && <Stat label="Link" value={`↗ ${card.linkval}`} />}
            {typeof card.scale === "number" && <Stat label="Scale" value={card.scale} />}
          </div>

          <div className="panel mt-4 p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-paper/85">{card.desc}</p>
          </div>

          {/* Prices */}
          <h2 className="font-display mt-7 text-lg font-bold text-paper">Market Prices</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="TCGplayer" value={formatMoney(tcgPrice(card))} />
            <Stat label="Cardmarket" value={`€${cardmarketPrice(card).toFixed(2)}`} />
            <Stat label="eBay" value={formatMoney(parsePrice(prices?.ebay_price))} />
            <Stat label="Amazon" value={formatMoney(parsePrice(prices?.amazon_price))} />
          </div>

          <button onClick={() => setShowAdd(true)} className="btn-foil mt-7 w-full py-3.5 text-base sm:w-auto sm:px-12">
            + Add to My Vault
          </button>

          {/* Printings */}
          {sets.length > 0 && (
            <>
              <h2 className="font-display mt-9 text-lg font-bold text-paper">
                Printings{" "}
                <span className="font-sans text-sm font-normal text-dim">({sets.length})</span>
              </h2>
              <div className="panel mt-3 overflow-hidden p-0!">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/8 text-[11px] uppercase tracking-wider text-dim">
                        <th className="px-4 py-3 font-bold">Set</th>
                        <th className="px-4 py-3 font-bold">Code</th>
                        <th className="px-4 py-3 font-bold">Rarity</th>
                        <th className="px-4 py-3 text-right font-bold">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sets.map((s, i) => (
                        <tr
                          key={`${s.set_code}-${i}`}
                          className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-2.5 text-paper/90">{s.set_name}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-fog">{s.set_code}</td>
                          <td className="px-4 py-2.5">
                            <span className="chip border-foil-violet/25! bg-foil-violet/10! text-foil-violet!">
                              {s.set_rarity}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-paper">
                            {formatMoney(parsePrice(s.set_price))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showAdd && <AddToVaultModal card={card} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}
