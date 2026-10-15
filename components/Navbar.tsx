"use client";

import Link from "next/link";
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
    <header className="sticky top-0 z-40 border-b border-[rgba(255,215,0,0.14)] bg-[rgba(6,10,21,0.86)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-2 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#ffe44d] to-[#b39700] text-lg font-black text-[#0c1327] shadow-[0_0_18px_rgba(255,215,0,0.35)]">
            ◆
          </span>
          <span className="text-lg font-extrabold tracking-wide">
            <span className="text-gold-grad">CARD VAULT</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[rgba(255,215,0,0.14)] text-[#ffd700]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
