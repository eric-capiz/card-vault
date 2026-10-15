"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CardTile from "@/components/CardTile";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { getCollections, type CollectionWithCards } from "@/lib/db";
import { formatMoney } from "@/lib/ygoprodeck";
import { NotConfiguredNotice } from "@/app/login/LoginForm";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const [collections, setCollections] = useState<CollectionWithCards[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (configured && !authLoading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [configured, authLoading, user, router]);

  useEffect(() => {
    if (!configured || authLoading || !user) {
      if (configured && !authLoading) setPageLoading(false);
      return;
    }
    const client = getSupabaseBrowser();
    if (!client) {
      setPageLoading(false);
      return;
    }
    getCollections(client)
      .then(setCollections)
      .catch(() => setCollections([]))
      .finally(() => setPageLoading(false));
  }, [configured, authLoading, user]);

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

  if (!configured) {
    return (
      <div className="mx-auto max-w-md pt-16">
        <NotConfiguredNotice />
      </div>
    );
  }

  if (authLoading || pageLoading) {
    return <div className="pt-24 text-center text-sm text-slate-400">Loading your stats…</div>;
  }

  if (!user) return null;

  if (collections.length === 0) {
    return (
      <div className="pt-24 text-center">
        <div className="text-6xl">📊</div>
        <h1 className="mt-4 text-2xl font-extrabold text-white">No data yet</h1>
        <p className="mt-2 text-sm text-slate-400">
          Add cards to your vault and this dashboard will show total value, rarity breakdowns and
          your most valuable pulls.
        </p>
        <button
          onClick={() => router.push("/vault")}
          className="mt-6 rounded-xl bg-[#ffd700] px-8 py-3 font-bold text-black transition hover:bg-[#ffe44d]"
        >
          Go to My Vault
        </button>
      </div>
    );
  }

  return (
    <div className="pt-8">
      <h1 className="text-gold-grad text-3xl font-black sm:text-4xl">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Across {collections.length} collection{collections.length === 1 ? "" : "s"} · prices are
        TCGplayer market snapshots from when cards were added
      </p>

      {/* headline stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[rgba(255,215,0,0.25)] bg-gradient-to-br from-[#1a2450] to-[#0c1327] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total value</p>
          <p className="text-gold-grad mt-1 text-3xl font-black">{formatMoney(stats.value)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#0c1327]/80 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total cards</p>
          <p className="mt-1 text-3xl font-black text-white">{stats.units.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#0c1327]/80 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Unique cards</p>
          <p className="mt-1 text-3xl font-black text-white">{stats.unique.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#0c1327]/80 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg. value</p>
          <p className="mt-1 text-3xl font-black text-white">
            {formatMoney(stats.units ? stats.value / stats.units : 0)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* rarity breakdown */}
        <div className="rounded-2xl border border-white/8 bg-[#0c1327]/80 p-5">
          <h2 className="text-lg font-extrabold text-white">Rarity Breakdown</h2>
          <div className="mt-4 space-y-2.5">
            {stats.rarityBreakdown.slice(0, 10).map(([rarity, count]) => (
              <div key={rarity}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">{rarity}</span>
                  <span className="font-bold text-[#ffd700]">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#b39700] to-[#ffd700]"
                    style={{ width: `${(count / stats.maxRarity) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* top archetypes */}
        <div className="rounded-2xl border border-white/8 bg-[#0c1327]/80 p-5">
          <h2 className="text-lg font-extrabold text-white">Top Archetypes</h2>
          {stats.topArchetypes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No archetype-tagged cards yet — scan or add archetype cards to see this.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.topArchetypes.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => router.push(`/search?archetype=${encodeURIComponent(name)}`)}
                  className="rounded-full border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.07)] px-4 py-1.5 text-sm font-semibold text-[#ffd700] transition hover:bg-[rgba(255,215,0,0.15)]"
                >
                  {name} <span className="text-slate-300">×{count}</span>
                </button>
              ))}
            </div>
          )}

          <h2 className="mt-8 text-lg font-extrabold text-white">Collection Composition</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <CompositionStats collections={collections} />
          </div>
        </div>
      </div>

      {/* most valuable */}
      <h2 className="mt-8 text-xl font-extrabold text-white">
        Most Valuable Cards <span className="text-sm font-normal text-slate-500">by total value</span>
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {stats.mostValuable.map((c, i) => (
          <div key={`${c.id}-${i}`} className="relative">
            {i < 3 && (
              <span className="absolute -top-2 left-2 z-10 rounded-md bg-[#ffd700] px-2 py-0.5 text-xs font-black text-black shadow-lg">
                #{i + 1}
              </span>
            )}
            <CardTile
              imageSmall={c.imageSmall}
              name={c.name}
              type={c.type}
              price={c.price * c.qty}
              qty={c.qty}
              badge={c.rarity ?? undefined}
              onClick={() => router.push(`/card/${c.ygoId}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompositionStats({ collections }: { collections: CollectionWithCards[] }) {
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
      { label: "Traps", n: traps, pct: (traps / total) * 100, color: "#c0488a" },
    ];
  }, [collections]);

  return (
    <>
      {comp.map((s) => (
        <div key={s.label} className="rounded-xl bg-black/30 p-3">
          <div
            className="mx-auto mb-2 h-2 w-full overflow-hidden rounded-full bg-white/5"
          >
            <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
          </div>
          <p className="text-lg font-extrabold text-white">{s.n}</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
        </div>
      ))}
    </>
  );
}
