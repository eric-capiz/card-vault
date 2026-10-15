"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

export function NotConfiguredNotice() {
  return (
    <div className="panel border-amber-500/30! p-5 text-sm">
      <p className="font-display font-bold text-amber-200">Accounts aren't set up yet</p>
      <p className="mt-1.5 leading-relaxed text-amber-200/75">
        This deployment doesn't have its database keys configured. Search, card details, and the
        scanner all work without an account — log in will be available once setup is finished.
      </p>
    </div>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="orb left-[15%] top-[10%] h-64 w-64 bg-foil-violet/20" aria-hidden />
      <div className="orb right-[12%] bottom-[8%] h-64 w-64 bg-foil-cyan/12 [animation-delay:-5s]" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="panel relative w-full max-w-md p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:p-9"
      >
        <div className="mb-7 text-center">
          <div
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl text-xl font-black text-obsidian shadow-[0_0_28px_rgba(167,139,250,0.4)]"
            style={{
              background: "linear-gradient(135deg,#c4b5fd,#a78bfa 35%,#67e8f9 70%,#f9a8d4)",
            }}
            aria-hidden
          >
            ◆
          </div>
          <h1 className="font-display text-3xl font-bold">
            <span className="text-foil">{title}</span>
          </h1>
          <p className="mt-1.5 text-sm text-fog">{subtitle}</p>
        </div>
        {children}
      </motion.div>
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
    <AuthShell title="Welcome back" subtitle="Log in to open your vault.">
      {!configured ? (
        <NotConfiguredNotice />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field w-full px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field w-full px-3.5 py-2.5 text-sm"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-foil w-full py-3 text-sm">
            {busy ? "Logging in…" : "Log In"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-fog">
        New here?{" "}
        <Link href="/signup" className="font-bold text-foil-violet transition hover:text-foil-cyan">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
