"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { NotConfiguredNotice } from "@/app/login/LoginForm";

export default function SignupPage() {
  const router = useRouter();
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const client = getSupabaseBrowser();
    if (!client) return;
    if (password.length < 6) {
      setError("Password needs to be at least 6 characters.");
      return;
    }
    setBusy(true);
    const { data, error } = await client.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/vault");
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  };

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[rgba(255,215,0,0.2)] bg-[#0c1327]/90 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#ffe44d] to-[#b39700] text-2xl font-black text-[#0c1327]">
            ◆
          </div>
          <h1 className="text-gold-grad text-3xl font-black">Join Card Vault</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your own private vault, decks and collection stats — on any device.
          </p>
        </div>

        {!configured ? (
          <NotConfiguredNotice />
        ) : checkEmail ? (
          <div className="rounded-xl border border-[rgba(255,215,0,0.3)] bg-[rgba(255,215,0,0.08)] p-5 text-center">
            <p className="text-lg font-bold text-white">Check your inbox ✉️</p>
            <p className="mt-2 text-sm text-slate-300">
              We sent a confirmation link to <b className="text-white">{email}</b>. Click it, then
              come back and log in.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-lg bg-[#ffd700] px-6 py-2.5 font-bold text-black hover:bg-[#ffe44d]"
            >
              Go to Log In
            </Link>
          </div>
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
                placeholder="6+ characters"
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
              {busy ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#ffd700] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
