"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  imageSmall,
  searchCards,
  tcgPrice,
  formatMoney,
  type YGOCard,
} from "@/lib/ygoprodeck";
import AddToVaultModal from "@/components/AddToVaultModal";

interface Match {
  candidate: string;
  card: YGOCard;
  confidence: string;
}

function cleanName(s: string): string {
  return s
    .trim()
    .replace(/\s{2,}/g, " ")
    .replace(/\s+(?<!A|RA|OR|FOR)(?:GE|CE)$/, "")
    .replace(/\s+[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]$/, "");
}

/** Score a verified card against OCR words — mirrors the proven legacy heuristic. */
function scoreCard(cardName: string, ocrWords: string[]): number {
  const lower = cardName.toLowerCase();
  const cardWords = lower.replace(/-/g, " ").split(" ");
  let score = ocrWords.filter((w) => cardWords.includes(w)).length;
  if (lower === ocrWords.join(" ")) score += 10;
  if (lower.includes(ocrWords.join(" "))) score += 5;
  const extra = cardWords.length - ocrWords.length;
  if (extra > 0) score -= extra * 0.5;
  return score;
}

export default function ScannerClient() {
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "reading" | "verifying" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [addCard, setAddCard] = useState<YGOCard | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setMatches([]);
    setRawLines([]);
    setError("");
    setPhase("idle");
  };

  const scan = async () => {
    if (!preview) return;
    setPhase("reading");
    setError("");
    setMatches([]);
    try {
      // lazy-load tesseract only when the user actually scans — keeps every
      // other page's bundle lean. 100% free, runs on-device.
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      setProgress("Reading card text…");
      const {
        data: { text },
      } = await worker.recognize(preview);
      await worker.terminate();

      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 3 && !l.includes("[") && !l.includes("ATK/") && !l.includes("DEF/"));
      setRawLines(lines);

      // candidate name lines: ALL-CAPS lines are usually the card name
      const candidates = lines
        .filter((l) => l === l.toUpperCase())
        .map(cleanName)
        .filter((l) => l.length > 3)
        .slice(0, 4);

      if (candidates.length === 0) {
        setError("Couldn't find a card name in the photo. Try better lighting, straight-on angle, and fill the frame with the card.");
        setPhase("idle");
        return;
      }

      setPhase("verifying");
      const found: Match[] = [];
      for (const candidate of candidates) {
        setProgress(`Checking “${candidate}”…`);
        const firstWord = candidate.split(" ")[0];
        const results = await searchCards({ name: firstWord, limit: 30 });
        const ocrWords = candidate.toLowerCase().split(" ");
        const scored = results
          .map((card) => ({ card, score: scoreCard(card.name, ocrWords) }))
          .sort((a, b) => b.score - a.score);
        if (scored.length > 0 && scored[0].score >= 2) {
          found.push({
            candidate,
            card: scored[0].card,
            confidence: scored[0].score >= 10 ? "Exact match" : scored[0].score >= 5 ? "Strong match" : "Possible match",
          });
        }
      }

      setMatches(found);
      setPhase("done");
      if (found.length === 0) {
        setError("No confident match. The candidates I read are shown below — try retaking the photo.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scanning failed. Try again.");
      setPhase("idle");
    }
  };

  const busy = phase === "reading" || phase === "verifying";

  return (
    <div className="pt-8">
      <h1 className="text-gold-grad text-3xl font-black sm:text-4xl">Card Scanner</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Photograph a card and free on-device OCR reads its name, then verifies it against the card
        database. Nothing uploads anywhere — the photo never leaves your device.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-[rgba(255,215,0,0.14)] bg-[#0c1327]/80 p-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {preview ? (
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10">
              <Image src={preview} alt="Card to scan" fill className="object-contain bg-black" sizes="320px" />
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="grid aspect-[3/4] w-full place-items-center rounded-xl border border-dashed border-[rgba(255,215,0,0.3)] bg-black/30 text-center transition hover:border-[#ffd700]"
            >
              <div>
                <div className="text-5xl">📸</div>
                <p className="mt-3 font-bold text-white">Take / upload a photo</p>
                <p className="mt-1 px-6 text-xs text-slate-400">
                  Straight-on, good light, card fills the frame
                </p>
              </div>
            </button>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              {preview ? "Retake" : "Choose photo"}
            </button>
            <button
              onClick={scan}
              disabled={!preview || busy}
              className="flex-1 rounded-lg bg-[#ffd700] py-2.5 text-sm font-bold text-black transition hover:bg-[#ffe44d] disabled:opacity-40"
            >
              {busy ? "Scanning…" : "Scan Card"}
            </button>
          </div>
          {busy && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-[#ffd700]" />
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">{progress}</p>
            </div>
          )}
        </div>

        <div>
          {error && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              {error}
            </div>
          )}

          {phase === "done" && matches.length > 0 && (
            <>
              <h2 className="text-lg font-extrabold text-white">
                Matches <span className="text-sm font-normal text-slate-500">— confirm the right card</span>
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {matches.map((m, i) => (
                  <div
                    key={`${m.card.id}-${i}`}
                    className="flex gap-3 rounded-2xl border border-[rgba(255,215,0,0.2)] bg-[#0c1327]/80 p-3"
                  >
                    <div className="relative h-24 w-[70px] shrink-0 overflow-hidden rounded-lg">
                      <Image src={imageSmall(m.card)} alt={m.card.name} fill className="object-cover" sizes="70px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{m.card.name}</p>
                      <p className="text-xs text-slate-400">{m.card.type}</p>
                      <p className="text-xs font-semibold text-emerald-300">{m.confidence}</p>
                      <p className="text-xs text-slate-500">Read as: “{m.candidate}”</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => setAddCard(m.card)}
                          className="rounded-lg bg-[rgba(255,215,0,0.14)] px-3 py-1.5 text-xs font-bold text-[#ffd700] ring-1 ring-[rgba(255,215,0,0.3)] hover:bg-[rgba(255,215,0,0.22)]"
                        >
                          + Vault · {formatMoney(tcgPrice(m.card))}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {rawLines.length > 0 && (
            <details className="mt-6 rounded-2xl border border-white/8 bg-black/20 p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-300">
                What the OCR read ({rawLines.length} lines)
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-xs text-slate-400">
                {rawLines.map((l, i) => (
                  <li key={i}>“{l}”</li>
                ))}
              </ul>
            </details>
          )}

          {phase === "idle" && !preview && (
            <div className="rounded-2xl border border-white/8 bg-black/20 p-6 text-sm text-slate-400">
              <h3 className="font-bold text-white">Tips for a clean scan</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Hold the phone directly above the card — no angle.</li>
                <li>Bright, even light. Avoid glare on holographic cards.</li>
                <li>The card name at the top is what gets read — keep it sharp.</li>
                <li>You always confirm the match before anything is saved.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {addCard && <AddToVaultModal card={addCard} onClose={() => setAddCard(null)} />}
    </div>
  );
}
