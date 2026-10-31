"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TrashItem = {
  kind: "notebook" | "chapter" | "page";
  id: string;
  title: string;
  parent: string;
  deletedAt: number;
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const data = await api("/api/trash");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Trash.");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function act(item: TrashItem, action: "restore" | "delete") {
    if (
      action === "delete" &&
      !window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await api("/api/trash", {
        method: "POST",
        body: JSON.stringify({ kind: item.kind, id: item.id, action }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    }
  }

  const groups: { kind: TrashItem["kind"]; label: string }[] = [
    { kind: "notebook", label: "Notebooks" },
    { kind: "chapter", label: "Chapters" },
    { kind: "page", label: "Pages" },
  ];

  return (
    <div className="stack">
      <h1>Trash</h1>
      <p className="muted">
        Items here are permanently deleted after 30 days. Restoring puts everything
        back exactly where it was — same notebook, same chapter, same spot.
      </p>
      {error && <div className="error">{error}</div>}
      {!loaded && <p className="muted">Loading…</p>}
      {loaded && items.length === 0 && <p className="muted">Trash is empty.</p>}
      {groups.map((g) => {
        const list = items.filter((it) => it.kind === g.kind);
        if (list.length === 0) return null;
        return (
          <div key={g.kind}>
            <h2>{g.label}</h2>
            <div className="stack">
              {list.map((it) => (
                <div key={it.id} className="card row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div>{it.title}</div>
                    <div className="muted">
                      {it.parent ? `${it.parent} · ` : ""}
                      Trashed {new Date(it.deletedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="row">
                    <button className="btn btn-small btn-primary" onClick={() => void act(it, "restore")}>
                      Restore
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => void act(it, "delete")}>
                      Delete forever
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <Link href="/">← All notebooks</Link>
    </div>
  );
}
