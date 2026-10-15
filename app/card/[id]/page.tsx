"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
    <div className="rounded-xl border border-white/8 bg-black/30 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-white">{value}</p>
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
      <div className="grid gap-8 pt-10 md:grid-cols-[320px_1fr]">
        <div className="aspect-[3/4.4] animate-pulse rounded-2xl bg-white/5" />
        <div className="space-y-3">
          <div className="h-8 w-2/3 animate-pulse rounded bg-white/5" />
          <div className="h-24 animate-pulse rounded bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="pt-24 text-center">
        <div className="text-5xl">🃏</div>
        <h1 className="mt-4 text-xl font-bold text-white">{error || "Card not found"}</h1>
        <button
          onClick={() => router.push("/search")}
          className="mt-6 rounded-lg bg-[#ffd700] px-6 py-2.5 font-bold text-black hover:bg-[#ffe44d]"
        >
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
    <div className="pt-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm font-semibold text-slate-400 transition hover:text-[#ffd700]"
      >
        ← Back
      </button>

      <div className="grid gap-8 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
        {/* Card art */}
        <div className="tilt-stage mx-auto w-full max-w-[300px]">
          <div className="tilt-card holo overflow-hidden rounded-2xl border border-[rgba(255,215,0,0.25)] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
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
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-white sm:text-4xl">{card.name}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {card.humanReadableCardType}
                {card.archetype ? ` · ${card.archetype}` : ""}
                {card.race ? ` · ${card.race}` : ""}
              </p>
            </div>
            {ban && (
              <span
                className={`rounded-lg px-3 py-1.5 text-sm font-extrabold uppercase tracking-wide ${
                  ban === "Forbidden"
                    ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/50"
                    : ban === "Limited"
                      ? "bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/50"
                      : "bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/50"
                }`}
              >
                {ban} (TCG)
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {card.attribute && (
              <Stat
                label="Attribute"
                value={<span style={{ color: attrColor }}>{card.attribute}</span>}
              />
            )}
            {typeof card.level === "number" && <Stat label="Level / Rank" value={`★ ${card.level}`} />}
            {typeof card.atk === "number" && <Stat label="ATK" value={card.atk} />}
            {typeof card.def === "number" && <Stat label="DEF" value={card.def} />}
            {typeof card.linkval === "number" && <Stat label="Link" value={`↗ ${card.linkval}`} />}
            {typeof card.scale === "number" && <Stat label="Scale" value={card.scale} />}
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/30 p-4">
            <p className="text-sm leading-relaxed text-slate-300">{card.desc}</p>
          </div>

          {/* Prices */}
          <h2 className="mt-6 text-lg font-extrabold text-white">Market Prices</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="TCGplayer" value={formatMoney(tcgPrice(card))} />
            <Stat label="Cardmarket" value={`€${cardmarketPrice(card).toFixed(2)}`} />
            <Stat label="eBay" value={formatMoney(parsePrice(prices?.ebay_price))} />
            <Stat label="Amazon" value={formatMoney(parsePrice(prices?.amazon_price))} />
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="pulse-gold mt-6 w-full rounded-xl bg-[#ffd700] py-3.5 text-base font-extrabold text-black transition hover:bg-[#ffe44d] sm:w-auto sm:px-10"
          >
            + Add to My Vault
          </button>

          {/* Printings */}
          {sets.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-extrabold text-white">
                Printings <span className="text-sm font-normal text-slate-500">({sets.length})</span>
              </h2>
              <div className="mt-2 overflow-hidden rounded-2xl border border-white/8">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-white/5 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 font-bold">Set</th>
                      <th className="px-4 py-3 font-bold">Code</th>
                      <th className="px-4 py-3 font-bold">Rarity</th>
                      <th className="px-4 py-3 text-right font-bold">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((s, i) => (
                      <tr key={`${s.set_code}-${i}`} className="border-t border-white/5 hover:bg-white/[0.03]">
                        <td className="px-4 py-2.5 text-slate-200">{s.set_name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{s.set_code}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-md bg-[rgba(255,215,0,0.1)] px-2 py-0.5 text-xs font-semibold text-[#ffd700]">
                            {s.set_rarity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-white">
                          {formatMoney(parsePrice(s.set_price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showAdd && <AddToVaultModal card={card} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
