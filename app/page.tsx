"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FEATURES = [
  {
    title: "Live Price Tracking",
    desc: "TCGplayer market prices on every card. Know what your binder is worth at a glance.",
    icon: "💰",
  },
  {
    title: "Visual Vault",
    desc: "Your collection as a stunning card-art grid with holo hover effects — not a spreadsheet.",
    icon: "🃏",
  },
  {
    title: "Deck Builder",
    desc: "Build tournament-legal decks with banlist warnings and one-click .ydk export for EDOPro.",
    icon: "⚔️",
  },
  {
    title: "Card Scanner",
    desc: "Snap a photo of a card and free on-device OCR identifies it. No paid APIs, ever.",
    icon: "📸",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?name=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-[rgba(255,215,0,0.18)] bg-gradient-to-b from-[#101a3a] to-[#0a0f22] px-6 py-16 text-center sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(600px 300px at 50% 0%, rgba(255,215,0,0.18), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#ffe44d] to-[#b39700] text-3xl font-black text-[#0c1327] shadow-[0_0_40px_rgba(255,215,0,0.4)] pulse-gold">
            ◆
          </div>
          <h1 className="text-gold-grad text-5xl font-black tracking-tight sm:text-7xl">
            CARD VAULT
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
            The premium way to track your Yu-Gi-Oh! collection. Live prices, gorgeous card art,
            deck building and card scanning — free forever, no account needed.
          </p>

          <form onSubmit={submit} className="mx-auto mt-8 flex max-w-xl gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search 10,000+ cards… try “Blue-Eyes”"
              className="h-13 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#ffd700] px-6 font-bold text-black transition hover:bg-[#ffe44d]"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">✓ No signup</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">✓ $0 forever</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">✓ Works on mobile</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">✓ Data stays in your browser</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="rise-in rounded-2xl border border-[rgba(255,215,0,0.12)] bg-[#0c1327]/80 p-5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="mb-3 text-3xl">{f.icon}</div>
            <h3 className="mb-1 font-bold text-white">{f.title}</h3>
            <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* QUICK LINKS */}
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <Link
          href="/vault"
          className="group rounded-2xl border border-[rgba(255,215,0,0.16)] bg-gradient-to-br from-[#14204a] to-[#0c1327] p-6 transition hover:border-[rgba(255,215,0,0.4)]"
        >
          <h3 className="text-xl font-extrabold text-[#ffd700]">Open My Vault →</h3>
          <p className="mt-1 text-sm text-slate-400">
            Build collections, track quantities, rarities and total value.
          </p>
        </Link>
        <Link
          href="/decks"
          className="group rounded-2xl border border-[rgba(255,215,0,0.16)] bg-gradient-to-br from-[#14204a] to-[#0c1327] p-6 transition hover:border-[rgba(255,215,0,0.4)]"
        >
          <h3 className="text-xl font-extrabold text-[#ffd700]">Build a Deck →</h3>
          <p className="mt-1 text-sm text-slate-400">
            Main, Extra and Side decks with banlist legality checks and .ydk export.
          </p>
        </Link>
        <Link
          href="/scanner"
          className="group rounded-2xl border border-[rgba(255,215,0,0.16)] bg-gradient-to-br from-[#14204a] to-[#0c1327] p-6 transition hover:border-[rgba(255,215,0,0.4)]"
        >
          <h3 className="text-xl font-extrabold text-[#ffd700]">Scan a Card →</h3>
          <p className="mt-1 text-sm text-slate-400">
            Photograph a card and let free on-device OCR identify it for you.
          </p>
        </Link>
      </section>
    </div>
  );
}
