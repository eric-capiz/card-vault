"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { NotConfiguredNotice } from "@/app/login/LoginForm";

export default function SignupPage() {
  const router = useRouter();
  const { configured, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        return;
      }
      await refresh();
      router.push("/vault");
      router.refresh();
    } catch {
      setError("Could not create account. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="orb left-[15%] top-[10%] h-64 w-64 bg-foil-violet/20" aria-hidden />
      <div className="orb right-[12%] bottom-[8%] h-64 w-64 bg-foil-pink/12 [animation-delay:-5s]" aria-hidden />
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
            <span className="text-foil">Join Card Vault</span>
          </h1>
          <p className="mt-1.5 text-sm text-fog">
            Your own private vault, decks and collection stats — on any device.
          </p>
        </div>

        {!configured ? (
          <NotConfiguredNotice />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
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
              <label className="eyebrow mb-1.5 block" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6+ characters"
                className="field w-full px-3.5 py-2.5 text-sm"
              />
            </div>
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300" role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-foil w-full py-3 text-sm">
              {busy ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-fog">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-foil-violet transition hover:text-foil-cyan">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
