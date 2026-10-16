"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/vault", label: "My Vault" },
  { href: "/decks", label: "Decks" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scanner", label: "Scanner" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-obsidian/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="mr-1 flex shrink-0 items-center gap-2.5 rounded-lg"
          aria-label="Card Vault home"
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-base font-black text-obsidian shadow-[0_0_22px_rgba(167,139,250,0.45)]"
            style={{
              background:
                "linear-gradient(135deg,#c4b5fd 0%,#a78bfa 30%,#67e8f9 62%,#f9a8d4 100%)",
            }}
            aria-hidden
          >
            ◆
          </span>
          <span className="font-display hidden text-lg font-bold tracking-[0.18em] min-[420px]:block">
            <span className="text-foil">CARD VAULT</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-0.5 overflow-x-auto" aria-label="Primary">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                  active ? "text-paper" : "text-fog hover:text-paper"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-lg border border-foil-violet/30 bg-gradient-to-r from-foil-violet/15 via-foil-cyan/10 to-foil-pink/15"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
