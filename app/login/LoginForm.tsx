"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

export function NotConfiguredNotice() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
      <p className="font-bold">Accounts aren't set up yet</p>
      <p className="mt-1 text-amber-200/80">
        This deployment doesn't have its database keys configured. Search, card details, and the
        scanner all work without an account — log in will be available once setup is finished.
      </p>
    </div>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const next = searchParams.get("next") || "/vault";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const client = getSupabaseBrowser();
    if (!client) return;
    setBusy(true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[rgba(255,215,0,0.2)] bg-[#0c1327]/90 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#ffe44d] to-[#b39700] text-2xl font-black text-[#0c1327]">
            ◆
          </div>
          <h1 className="text-gold-grad text-3xl font-black">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">Log in to open your vault.</p>
        </div>

        {!configured ? (
          <NotConfiguredNotice />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ffd700]"
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#ffd700] py-3 font-bold text-black transition hover:bg-[#ffe44d] disabled:opacity-50"
            >
              {busy ? "Logging in…" : "Log In"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{" "}
          <Link href="/signup" className="font-bold text-[#ffd700] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
