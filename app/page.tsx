"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const HERO_CARDS = [
  { id: 89631139, name: "Blue-Eyes White Dragon", tilt: "-10deg", y: 14 },
  { id: 46986414, name: "Dark Magician", tilt: "-4deg", y: 0 },
  { id: 10000000, name: "Obelisk the Tormentor", tilt: "4deg", y: 0 },
  { id: 78193831, name: "Red-Eyes B. Dragon", tilt: "10deg", y: 14 },
];

const FEATURES = [
  {
    title: "Live Price Tracking",
    desc: "TCGplayer market prices on every card. Know what your binder is worth at a glance.",
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Visual Vault",
    desc: "Your collection as a cinematic card-art grid with holographic hover physics — not a spreadsheet.",
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <rect x="4" y="3" width="12" height="17" rx="2" />
        <path d="M8 3v17M4 8h4" strokeLinecap="round" />
        <rect x="13" y="7" width="8" height="14" rx="2" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    title: "Deck Builder",
    desc: "Build tournament-legal decks with banlist warnings and one-click .ydk export for EDOPro.",
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Card Scanner",
    desc: "Snap a photo of a card and free on-device OCR identifies it. No paid APIs, ever.",
    glyph: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    ),
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?name=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="pt-6 sm:pt-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink/80 px-6 py-14 sm:px-12 sm:py-20">
        <div className="orb left-[8%] top-[-10%] h-72 w-72 bg-foil-violet/25" />
        <div className="orb right-[6%] top-[30%] h-80 w-80 bg-foil-cyan/15 [animation-delay:-4s]" />
        <div className="orb bottom-[-20%] left-[40%] h-64 w-64 bg-foil-pink/15 [animation-delay:-7s]" />
        {/* faint grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)",
          }}
          aria-hidden
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="eyebrow mb-4 flex items-center gap-2"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-foil-cyan shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
              The collector's vault for !Yu-Gi-Oh
            </motion.p>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-paper sm:text-6xl xl:text-7xl"
            >
              Every card.
              <br />
              Every price.
              <br />
              <span className="text-foil-animated">One vault.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="mt-5 max-w-lg text-base leading-relaxed text-fog sm:text-lg"
            >
              Track your collection in cinematic card-art, watch its value move with live market
              prices, build tournament-legal decks, and scan cards with your camera — free forever.
            </motion.p>

            <motion.form
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={3}
              onSubmit={submit}
              className="mt-8 flex max-w-xl gap-2"
              role="search"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search 10,000+ cards… try “Blue-Eyes”"
                aria-label="Search cards"
                className="field min-w-0 flex-1 px-4 py-3.5 text-paper"
              />
              <button type="submit" className="btn-foil shrink-0 px-6 sm:px-8">
                Search
              </button>
            </motion.form>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={4}
              className="mt-6 flex flex-wrap items-center gap-2"
            >
              {["No signup to browse", "$0 forever", "Private to your account", "Mobile-first"].map(
                (t) => (
                  <span key={t} className="chip">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-foil-cyan" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t}
                  </span>
                )
              )}
            </motion.div>
          </div>

          {/* fanned card art */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto hidden w-full max-w-md select-none sm:block"
            aria-hidden
          >
            <div className="flex items-end justify-center">
              {HERO_CARDS.map((c, i) => (
                <div
                  key={c.id}
                  className="relative w-1/4 shrink-0"
                  style={{
                    transform: `rotate(${c.tilt}) translateY(${c.y}px)`,
                    zIndex: 10 - Math.abs(1.5 - i),
                  }}
                >
                  <motion.div
                    className="overflow-hidden rounded-lg border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 5.5, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
                  >
                    <div className="relative aspect-[3/4.4]">
                      <Image
                        src={`https://images.ygoprodeck.com/images/cards_small/${c.id}.jpg`}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="160px"
                        priority={i < 2}
                      />
                    </div>
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(115deg, transparent 55%, rgba(255,255,255,0.14) 75%, transparent 90%)",
                      }}
                    />
                  </motion.div>
                </div>
              ))}
            </div>
            <div
              className="mx-auto mt-[-8px] h-10 w-3/4 rounded-[100%] bg-black/70 blur-2xl"
              aria-hidden
            />
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mt-10 sm:mt-14">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Why Card Vault</p>
            <h2 className="font-display mt-1 text-2xl font-bold text-paper sm:text-3xl">
              Built like a <span className="text-foil">secret rare</span>
            </h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="panel panel-hover group p-5 sm:p-6"
            >
              <div
                className="mb-4 grid h-11 w-11 place-items-center rounded-xl text-foil-violet transition-transform duration-300 group-hover:scale-110"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(167,139,250,0.16), rgba(103,232,249,0.10))",
                  boxShadow: "inset 0 0 0 1px rgba(167,139,250,0.25)",
                }}
              >
                {f.glyph}
              </div>
              <h3 className="font-display font-bold text-paper">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fog">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="mt-10 grid gap-4 sm:mt-14 md:grid-cols-3">
        {[
          { href: "/vault", title: "Open My Vault", desc: "Build collections, track quantities, rarities and total value." },
          { href: "/decks", title: "Build a Deck", desc: "Main, Extra and Side decks with banlist legality checks and .ydk export." },
          { href: "/scanner", title: "Scan a Card", desc: "Photograph a card and let free on-device OCR identify it for you." },
        ].map((l, i) => (
          <motion.div
            key={l.href}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={l.href}
              className="panel panel-hover group block h-full p-6 sm:p-7"
            >
              <h3 className="font-display text-xl font-bold text-paper transition-colors group-hover:text-foil-violet">
                {l.title}
                <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5" aria-hidden>
                  →
                </span>
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fog">{l.desc}</p>
            </Link>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
