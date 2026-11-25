"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Results = {
  notebooks: { _id: string; title: string; color: string }[];
  chapters: { _id: string; title: string; notebookId: string }[];
  pages: { _id: string; title: string; chapterId: string; notebookId: string }[];
  notes: { _id: string; snippet: string; pageId: string; pageTitle: string; notebookId: string }[];
  images: { _id: string; snippet: string; pageId: string; pageTitle: string; notebookId: string }[];
};

type BackfillItem = { _id: string; dataUrl: string };

export function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [results, setResults] = useState<Results | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [backfill, setBackfill] = useState({
    running: false,
    done: 0,
    total: 0,
    error: "",
  });

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then(setResults)
      .catch(() => setResults(null));
  }, [q]);

  async function refreshPending() {
    try {
      const r = await fetch("/api/ocr-backfill?limit=1");
      const d = await r.json();
      setPending(typeof d.total === "number" ? d.total : 0);
    } catch {
      setPending(0);
    }
  }

  useEffect(() => {
    void refreshPending();
  }, []);

  // Reads the text out of every older image that has never been OCR'd, so
  // those screenshots become searchable too. Runs in the browser, a few
  // images at a time; an image that can't be read is left for next time.
  async function runBackfill() {
    const total = pending ?? 0;
    if (total <= 0 || backfill.running) return;
    setBackfill({ running: true, done: 0, total, error: "" });
    const { extractImageText } = await import("@/lib/ocr");
    let done = 0;
    let guard = 0;
    while (guard++ < 500) {
      const batchRes = await fetch("/api/ocr-backfill?limit=3&skip=0");
      const batch = await batchRes.json().catch(() => ({ items: [] }));
      const items = (batch.items ?? []) as BackfillItem[];
      if (items.length === 0) break;
      let progressed = 0;
      for (const item of items) {
        const text = await extractImageText(item.dataUrl);
        if (text === null) continue;
        const res = await fetch(`/api/items/${item._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ocrText: text, ocrDone: true }),
        }).catch(() => null);
        if (res && res.ok) {
          done += 1;
          progressed += 1;
          setBackfill((b) => ({ ...b, done }));
        }
      }
      if (progressed === 0) {
        setBackfill((b) => ({
          ...b,
          running: false,
          error: "Some images could not be read — they will be retried next time.",
        }));
        await refreshPending();
        return;
      }
    }
    setBackfill((b) => ({ ...b, running: false }));
    await refreshPending();
  }

  return (
    <div className="stack">
      <form method="get" action="/search" className="row">
        <input
          className="input"
          name="q"
          defaultValue={q}
          placeholder="Search notebooks, chapters, pages, notes, images…"
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary">Search</button>
      </form>
      {pending !== null && pending > 0 && !backfill.running && (
        <p>
          <button className="btn" onClick={() => void runBackfill()}>
            Make older images searchable ({pending} left)
          </button>
        </p>
      )}
      {backfill.running && (
        <p className="muted">
          Reading image text… {backfill.done} of {backfill.total}
        </p>
      )}
      {backfill.error && <p className="muted">{backfill.error}</p>}
      {!backfill.running && backfill.done > 0 && pending === 0 && (
        <p className="muted">All images are searchable now.</p>
      )}
      {!q.trim() && <p className="muted">Type something above to search everything.</p>}
      {q.trim() && results && (
        <>
          {results.notebooks.length === 0 &&
            results.chapters.length === 0 &&
            results.pages.length === 0 &&
            results.notes.length === 0 &&
            results.images.length === 0 && (
              <p className="muted">Nothing found for “{q}”.</p>
            )}
          {results.notebooks.length > 0 && (
            <section className="stack">
              <h2>Notebooks</h2>
              {results.notebooks.map((n) => (
                <div key={n._id} className="card">
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: n.color,
                      marginRight: 8,
                    }}
                  />
                  <Link href={`/notebooks/${n._id}`}>{n.title}</Link>
                </div>
              ))}
            </section>
          )}
          {results.chapters.length > 0 && (
            <section className="stack">
              <h2>Chapters</h2>
              {results.chapters.map((c) => (
                <div key={c._id} className="card">
                  <Link href={`/notebooks/${c.notebookId}#chapter-${c._id}`}>{c.title}</Link>
                </div>
              ))}
            </section>
          )}
          {results.pages.length > 0 && (
            <section className="stack">
              <h2>Pages</h2>
              {results.pages.map((p) => (
                <div key={p._id} className="card">
                  <Link href={`/pages/${p._id}`}>{p.title || "Untitled page"}</Link>
                </div>
              ))}
            </section>
          )}
          {results.notes.length > 0 && (
            <section className="stack">
              <h2>Notes</h2>
              {results.notes.map((n) => (
                <div key={n._id} className="card">
                  <Link href={`/pages/${n.pageId}#block-${n._id}`}>{n.pageTitle || "Untitled page"}</Link>
                  <div className="muted">{n.snippet}</div>
                </div>
              ))}
            </section>
          )}
          {results.images.length > 0 && (
            <section className="stack">
              <h2>Images</h2>
              {results.images.map((img) => (
                <div key={img._id} className="card">
                  <Link href={`/pages/${img.pageId}#block-${img._id}`}>{img.pageTitle || "Untitled page"}</Link>
                  <div className="muted">{img.snippet}</div>
                  <div className="muted">Found in a screenshot on this page.</div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
