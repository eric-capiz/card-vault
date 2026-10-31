"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Results = {
  notebooks: { _id: string; title: string; color: string }[];
  chapters: { _id: string; title: string; notebookId: string }[];
  pages: { _id: string; title: string; chapterId: string; notebookId: string }[];
  notes: { _id: string; snippet: string; pageId: string; pageTitle: string; notebookId: string }[];
};

export function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [results, setResults] = useState<Results | null>(null);

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

  return (
    <div className="stack">
      <form method="get" action="/search" className="row">
        <input
          className="input"
          name="q"
          defaultValue={q}
          placeholder="Search notebooks, chapters, pages, notes…"
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary">Search</button>
      </form>
      {!q.trim() && <p className="muted">Type something above to search everything.</p>}
      {q.trim() && results && (
        <>
          {results.notebooks.length === 0 &&
            results.chapters.length === 0 &&
            results.pages.length === 0 &&
            results.notes.length === 0 && (
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
                  <Link href={`/notebooks/${c.notebookId}`}>{c.title}</Link>
                </div>
              ))}
            </section>
          )}
          {results.pages.length > 0 && (
            <section className="stack">
              <h2>Pages</h2>
              {results.pages.map((p) => (
                <div key={p._id} className="card">
                  <Link href={`/pages/${p._id}`}>{p.title}</Link>
                </div>
              ))}
            </section>
          )}
          {results.notes.length > 0 && (
            <section className="stack">
              <h2>Notes</h2>
              {results.notes.map((n) => (
                <div key={n._id} className="card">
                  <Link href={`/pages/${n.pageId}`}>{n.pageTitle || "Untitled page"}</Link>
                  <div className="muted">{n.snippet}</div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
