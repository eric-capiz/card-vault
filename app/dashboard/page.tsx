"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import CardTile from "@/components/CardTile";
import CountUp from "@/components/CountUp";
import { loadCollections, type Collection } from "@/lib/storage";
import { formatMoney } from "@/lib/ygoprodeck";

export default function DashboardPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCollections(loadCollections());
    setLoaded(true);
  }, []);

  const stats = useMemo(() => {
    const all = collections.flatMap((c) => c.cards);
    const units = all.reduce((n, c) => n + c.qty, 0);
    const value = all.reduce((n, c) => n + c.price * c.qty, 0);

    const rarityMap = new Map<string, number>();
    const archetypeMap = new Map<string, number>();
    for (const c of all) {
      const r = c.rarity || "Unknown";
      rarityMap.set(r, (rarityMap.get(r) ?? 0) + c.qty);
      if (c.archetype) archetypeMap.set(c.archetype, (archetypeMap.get(c.archetype) ?? 0) + c.qty);
    }

    const mostValuable = [...all]
      .sort((a, b) => b.price * b.qty - a.price * a.qty)
      .slice(0, 10);
    const topArchetypes = [...archetypeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const rarityBreakdown = [...rarityMap.entries()].sort((a, b) => b[1] - a[1]);
    const maxRarity = Math.max(1, ...rarityBreakdown.map(([, n]) => n));

    return { units, unique: all.length, value, mostValuable, topArchetypes, rarityBreakdown, maxRarity };
  }, [collections]);

  if (!loaded) {
    return (
      <div className="pt-10" aria-hidden>
        <div className="skeleton h-9 w-48" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="pt-24 text-center"
      >
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-foil-violet"
          style={{ background: "rgba(167,139,250,0.1)", boxShadow: "inset 0 0 0 1px rgba(167,139,250,0.25)" }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
            <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display mt-4 text-2xl font-bold text-paper">No data yet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-fog">
          Add cards to your vault and this dashboard will show total value, rarity breakdowns and
          your most valuable pulls.
        </p>
        <button onClick={() => router.push("/vault")} className="btn-foil mt-6 px-8 py-3 text-sm">
          Go to My Vault
        </button>
      </motion.div>
    );
  }

  const headline = [
    {
      label: "Total value",
      node: (
        <CountUp
          value={stats.value}
          format={(n) => formatMoney(n)}
          className="text-foil-animated font-display text-3xl font-bold sm:text-4xl"
        />
      ),
      highlight: true,
    },
    {
      label: "Total cards",
      node: <CountUp value={stats.units} className="font-display text-3xl font-bold text-paper sm:text-4xl" />,
    },
    {
      label: "Unique cards",
      node: <CountUp value={stats.unique} className="font-display text-3xl font-bold text-paper sm:text-4xl" />,
    },
    {
      label: "Avg. value",
      node: (
        <CountUp
          value={stats.units ? stats.value / stats.units : 0}
          format={(n) => formatMoney(n)}
          className="font-display text-3xl font-bold text-paper sm:text-4xl"
        />
      ),
    },
  ];

  return (
    <div className="pt-8 sm:pt-10">
      <p className="eyebrow">Overview</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-paper sm:text-4xl">
        <span className="text-foil">Dashboard</span>
      </h1>
      <p className="mt-1.5 text-sm text-fog">
        Across {collections.length} collection{collections.length === 1 ? "" : "s"} · prices are
        TCGplayer market snapshots from when cards were added
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {headline.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className={`panel p-5 ${s.highlight ? "border-foil-violet/30!" : ""}`}
          >
            <p className="eyebrow">{s.label}</p>
            <div className="mt-1.5">{s.node}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="panel p-5 sm:p-6"
        >
          <h2 className="font-display text-lg font-bold text-paper">Rarity Breakdown</h2>
          <div className="mt-5 space-y-3">
            {stats.rarityBreakdown.slice(0, 10).map(([rarity, count], i) => (
              <div key={rarity}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-paper/85">{rarity}</span>
                  <CountUp value={count} className="font-bold text-foil-violet" />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/6">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#a78bfa,#67e8f9,#f9a8d4)" }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(count / stats.maxRarity) * 100}%` }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.9, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="panel p-5 sm:p-6"
        >
          <h2 className="font-display text-lg font-bold text-paper">Top Archetypes</h2>
          {stats.topArchetypes.length === 0 ? (
            <p className="mt-3 text-sm text-dim">
              No archetype-tagged cards yet — scan or add archetype cards to see this.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.topArchetypes.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => router.push(`/search?archetype=${encodeURIComponent(name)}`)}
                  className="chip border-foil-violet/25! bg-foil-violet/8! text-foil-violet! transition hover:bg-foil-violet/15!"
                >
                  {name} <span className="text-fog">×{count}</span>
                </button>
              ))}
            </div>
          )}

          <h2 className="font-display mt-8 text-lg font-bold text-paper">Collection Composition</h2>
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            <CompositionStats collections={collections} />
          </div>
        </motion.div>
      </div>

      <h2 className="font-display mt-10 text-xl font-bold text-paper">
        Most Valuable Cards{" "}
        <span className="font-sans text-sm font-normal text-dim">by total value</span>
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {stats.mostValuable.map((c, i) => (
          <div key={`${c.cardId}-${i}`} className="relative">
            {i < 3 && (
              <span
                className="absolute -top-2.5 left-2 z-10 rounded-md px-2 py-0.5 font-display text-xs font-bold text-obsidian shadow-lg"
                style={{ background: "linear-gradient(135deg,#c4b5fd,#67e8f9)" }}
              >
                #{i + 1}
              </span>
            )}
            <CardTile
              index={i}
              imageSmall={c.imageSmall}
              name={c.name}
              type={c.type}
              price={c.price * c.qty}
              qty={c.qty}
              badge={c.rarity ?? undefined}
              onClick={() => router.push(`/card/${c.cardId}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompositionStats({ collections }: { collections: Collection[] }) {
  const comp = useMemo(() => {
    const all = collections.flatMap((c) => c.cards);
    let monsters = 0,
      spells = 0,
      traps = 0;
    for (const c of all) {
      if (c.type.includes("Spell")) spells += c.qty;
      else if (c.type.includes("Trap")) traps += c.qty;
      else monsters += c.qty;
    }
    const total = Math.max(1, monsters + spells + traps);
    return [
      { label: "Monsters", n: monsters, pct: (monsters / total) * 100, color: "#e8a33d" },
      { label: "Spells", n: spells, pct: (spells / total) * 100, color: "#2e9e5b" },
      { label: "Traps", n: traps, pct: (traps / total) * 100, color: "#f9a8d4" },
    ];
  }, [collections]);

  return (
    <>
      {comp.map((s, i) => (
        <div key={s.label} className="rounded-xl border border-white/8 bg-black/30 p-3.5">
          <div className="mb-2.5 h-2 w-full overflow-hidden rounded-full bg-white/6">
            <motion.div
              className="h-full rounded-full"
              style={{ background: s.color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${s.pct}%` }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.9, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="font-display text-lg font-bold text-paper">
            <CountUp value={s.n} />
          </p>
          <p className="eyebrow mt-0.5">{s.label}</p>
        </div>
      ))}
    </>
  );
}
