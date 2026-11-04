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

type Kind = TrashItem["kind"];

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

const keyOf = (kind: Kind, id: string) => `${kind}:${id}`;

const plural: Record<Kind, string> = {
  notebook: "notebooks",
  chapter: "chapters",
  page: "pages",
};

// What else in Trash goes with a delete-forever. Only ever trashed items.
const cascadeNote: Record<Kind, string> = {
  notebook: " Their trashed chapters and pages will also be deleted.",
  chapter: " Their trashed pages will also be deleted.",
  page: "",
};

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  async function refresh() {
    try {
      const data = await api("/api/trash");
      const next: TrashItem[] = data.items ?? [];
      setItems(next);
      // Drop selections for items that are no longer in Trash.
      const alive = new Set(next.map((it) => keyOf(it.kind, it.id)));
      setSelected((prev) => prev.filter((k) => alive.has(k)));
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
      !window.confirm(
        `Permanently delete "${item.title}" forever?${cascadeNote[item.kind]} This cannot be undone.`,
      )
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

  function toggleSelect(item: TrashItem) {
    const k = keyOf(item.kind, item.id);
    setSelected((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  }

  function toggleSelectAll(list: TrashItem[]) {
    const keys = list.map((it) => keyOf(it.kind, it.id));
    setSelected((prev) => {
      const allSelected = keys.every((k) => prev.includes(k));
      return allSelected
        ? prev.filter((k) => !keys.includes(k))
        : [...prev, ...keys.filter((k) => !prev.includes(k))];
    });
  }

  async function deleteSelected(kind: Kind, list: TrashItem[]) {
    const ids = list
      .filter((it) => selected.includes(keyOf(it.kind, it.id)))
      .map((it) => it.id);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${ids.length} selected ${plural[kind]} forever?${cascadeNote[kind]} This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await api("/api/trash", {
        method: "POST",
        body: JSON.stringify({ kind, action: "deleteSelected", ids }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    }
  }

  async function deleteAll(kind: Kind, list: TrashItem[]) {
    if (
      !window.confirm(
        `Permanently delete all ${list.length} trashed ${plural[kind]} forever?${cascadeNote[kind]} This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await api("/api/trash", {
        method: "POST",
        body: JSON.stringify({ kind, action: "deleteAll" }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    }
  }

  const groups: { kind: Kind; label: string }[] = [
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
        Deleting something forever only touches items in Trash — nothing still in
        your notebooks is affected.
      </p>
      {error && <div className="error">{error}</div>}
      {!loaded && <p className="muted">Loading…</p>}
      {loaded && items.length === 0 && <p className="muted">Trash is empty.</p>}
      {groups.map((g) => {
        const list = items.filter((it) => it.kind === g.kind);
        if (list.length === 0) return null;
        const selectedCount = list.filter((it) =>
          selected.includes(keyOf(it.kind, it.id)),
        ).length;
        const allSelected = selectedCount === list.length;
        return (
          <div key={g.kind}>
            <div
              className="row"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <h2>{g.label}</h2>
              <span className="row" style={{ alignItems: "center" }}>
                <label className="row" style={{ alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleSelectAll(list)}
                  />
                  All
                </label>
                {selectedCount > 0 && (
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => void deleteSelected(g.kind, list)}
                  >
                    Delete selected ({selectedCount}) forever
                  </button>
                )}
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => void deleteAll(g.kind, list)}
                >
                  Delete all forever
                </button>
              </span>
            </div>
            <div className="stack">
              {list.map((it) => (
                <div key={it.id} className="card row" style={{ justifyContent: "space-between" }}>
                  <div className="row" style={{ alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(keyOf(it.kind, it.id))}
                      onChange={() => toggleSelect(it)}
                    />
                    <div>
                      <div>{it.title}</div>
                      <div className="muted">
                        {it.parent ? `${it.parent} · ` : ""}
                        Trashed {new Date(it.deletedAt).toLocaleDateString()}
                      </div>
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
