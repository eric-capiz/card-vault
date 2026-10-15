"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

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
  const router = useRouter();
  const { user, loading, configured, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

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
        <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-white/10 pl-3">
          {loading ? (
            <span className="px-2 text-xs text-slate-500">…</span>
          ) : !configured ? null : user ? (
            <>
              <span
                className="hidden max-w-[140px] truncate text-xs font-semibold text-slate-300 sm:block"
                title={user.email ?? ""}
              >
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="whitespace-nowrap rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/5"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-white/5"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="whitespace-nowrap rounded-lg bg-[#ffd700] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#ffe44d]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
