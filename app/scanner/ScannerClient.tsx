"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
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
    <div className="pt-8 sm:pt-10">
      <p className="eyebrow">OCR</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-paper sm:text-4xl">
        Card <span className="text-foil">Scanner</span>
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm text-fog">
        Photograph a card and free on-device OCR reads its name, then verifies it against the card
        database. Nothing uploads anywhere — the photo never leaves your device.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="panel h-fit p-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            aria-label="Card photo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {preview ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10"
            >
              <Image src={preview} alt="Card to scan" fill className="object-contain bg-black" sizes="320px" />
              {busy && (
                <div className="scan-beam pointer-events-none absolute inset-x-0 top-0 h-16" aria-hidden />
              )}
            </motion.div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="grid aspect-[3/4] w-full place-items-center rounded-xl border border-dashed border-foil-violet/30 bg-black/30 text-center transition hover:border-foil-violet/60 hover:bg-foil-violet/5"
            >
              <div>
                <div
                  className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-foil-violet"
                  style={{ background: "rgba(167,139,250,0.1)", boxShadow: "inset 0 0 0 1px rgba(167,139,250,0.25)" }}
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                    <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="3.2" />
                  </svg>
                </div>
                <p className="mt-3 font-display font-bold text-paper">Take / upload a photo</p>
                <p className="mt-1 px-6 text-xs text-fog">
                  Straight-on, good light, card fills the frame
                </p>
              </div>
            </button>
          )}
          <div className="mt-3 flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="btn-ghost flex-1 py-2.5 text-sm">
              {preview ? "Retake" : "Choose photo"}
            </button>
            <button onClick={scan} disabled={!preview || busy} className="btn-foil flex-1 py-2.5 text-sm">
              {busy ? "Scanning…" : "Scan Card"}
            </button>
          </div>
          {busy && (
            <div className="mt-3" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-white/6">
                <div className="h-full w-1/3 rounded-full bar-slide bg-gradient-to-r from-foil-violet via-foil-cyan to-foil-pink" />
              </div>
              <p className="mt-2 text-center text-xs text-fog">{progress}</p>
            </div>
          )}
        </div>

        <div className="min-w-0">
          {error && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200" role="alert">
              {error}
            </div>
          )}

          {phase === "done" && matches.length > 0 && (
            <>
              <h2 className="font-display text-lg font-bold text-paper">
                Matches <span className="font-sans text-sm font-normal text-dim">— confirm the right card</span>
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {matches.map((m, i) => (
                  <motion.div
                    key={`${m.card.id}-${i}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="panel panel-hover flex gap-3 p-3"
                  >
                    <div className="relative h-24 w-[70px] shrink-0 overflow-hidden rounded-lg border border-white/10">
                      <Image src={imageSmall(m.card)} alt={m.card.name} fill className="object-cover" sizes="70px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold text-paper">{m.card.name}</p>
                      <p className="text-xs text-fog">{m.card.type}</p>
                      <p className="mt-0.5 inline-block rounded-md bg-emerald-400/12 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        {m.confidence}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-dim">Read as: “{m.candidate}”</p>
                      <button
                        onClick={() => setAddCard(m.card)}
                        className="btn-value mt-2 px-3 py-1.5 text-xs"
                      >
                        + Vault · {formatMoney(tcgPrice(m.card))}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {rawLines.length > 0 && (
            <details className="panel mt-6 p-4">
              <summary className="cursor-pointer text-sm font-bold text-paper">
                What the OCR read <span className="font-normal text-dim">({rawLines.length} lines)</span>
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-xs text-fog">
                {rawLines.map((l, i) => (
                  <li key={i}>“{l}”</li>
                ))}
              </ul>
            </details>
          )}

          {phase === "idle" && !preview && (
            <div className="panel p-6 text-sm text-fog">
              <h3 className="font-display font-bold text-paper">Tips for a clean scan</h3>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5">
                <li>Hold the phone directly above the card — no angle.</li>
                <li>Bright, even light. Avoid glare on holographic cards.</li>
                <li>The card name at the top is what gets read — keep it sharp.</li>
                <li>You always confirm the match before anything is saved.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {addCard && <AddToVaultModal card={addCard} onClose={() => setAddCard(null)} />}
      </AnimatePresence>
    </div>
  );
}
