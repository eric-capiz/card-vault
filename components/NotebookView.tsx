"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ColorPicker, TAB_COLORS } from "./ColorPicker";

type ChapterT = { _id: string; title: string; order: number };
type PageT = { _id: string; title: string; order: number };
type HighlightT = {
  color: string;
  text: string;
  pageId: string;
  pageTitle: string;
  chapterTitle: string;
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

export function NotebookView({
  notebook,
  initialChapters,
  initialPages,
}: {
  notebook: { _id: string; title: string; color: string };
  initialChapters: ChapterT[];
  initialPages: Record<string, PageT[]>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(notebook.title);
  const [color, setColor] = useState(notebook.color);
  const [chapters, setChapters] = useState(initialChapters);
  const [pages, setPages] = useState(initialPages);
  const [newChapter, setNewChapter] = useState("");
  const [newPage, setNewPage] = useState<Record<string, string>>({});
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [chapterDraft, setChapterDraft] = useState("");
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState("");
  const [highlights, setHighlights] = useState<HighlightT[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function refresh() {
    const ch = await api(`/api/chapters?notebookId=${notebook._id}`);
    setChapters(ch.chapters);
    const grouped: Record<string, PageT[]> = {};
    for (const c of ch.chapters as ChapterT[]) {
      const pg = await api(`/api/pages?chapterId=${c._id}`);
      grouped[c._id] = pg.pages;
    }
    setPages(grouped);
  }

  useEffect(() => {
    fetch(`/api/highlights?notebookId=${notebook._id}`)
      .then((r) => r.json())
      .then((d) => setHighlights(d.highlights ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveNotebook() {
    setError("");
    try {
      await api(`/api/notebooks/${notebook._id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, color }),
      });
      setSaved("Notebook saved.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function deleteNotebook() {
    if (!window.confirm(`Delete "${notebook.title}" and everything inside it?`)) return;
    await api(`/api/notebooks/${notebook._id}`, { method: "DELETE" });
    router.push("/");
  }

  async function addChapter(e: React.FormEvent) {
    e.preventDefault();
    if (!newChapter.trim()) return;
    await api("/api/chapters", {
      method: "POST",
      body: JSON.stringify({ notebookId: notebook._id, title: newChapter }),
    });
    setNewChapter("");
    await refresh();
  }

  async function addPage(e: React.FormEvent, chapterId: string) {
    e.preventDefault();
    const t = (newPage[chapterId] ?? "").trim();
    if (!t) return;
    await api("/api/pages", {
      method: "POST",
      body: JSON.stringify({ chapterId, title: t }),
    });
    setNewPage((p) => ({ ...p, [chapterId]: "" }));
    await refresh();
  }

  async function move(
    kind: "chapters" | "pages",
    id: string,
    dir: "up" | "down",
  ) {
    await api(`/api/${kind}/${id}`, { method: "PATCH", body: JSON.stringify({ move: dir }) });
    await refresh();
  }

  return (
    <div className="stack">
      <Link href="/">← All notebooks</Link>
      <div
        style={{
          backgroundColor: color,
          borderRadius: 12,
          padding: 20,
          color: "#fff",
          textShadow: "0 1px 3px rgba(0,0,0,.35)",
        }}
      >
        <h1 style={{ color: "#fff" }}>{title}</h1>
      </div>

      <div className="card stack">
        <div className="row">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ flex: 1 }}
            aria-label="Notebook title"
          />
          <button className="btn btn-primary" onClick={saveNotebook}>Save</button>
          <button className="btn btn-danger" onClick={deleteNotebook}>Delete notebook</button>
        </div>
        <div>
          <div className="muted" style={{ marginBottom: 6 }}>Cover color (pick anytime)</div>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        {saved && <div className="muted">{saved}</div>}
        {error && <div className="error">{error}</div>}
      </div>

      <form onSubmit={addChapter} className="card row">
        <input
          className="input"
          placeholder="New chapter title"
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary">Add chapter</button>
      </form>

      {chapters.length === 0 && (
        <p className="muted">No chapters yet. Add your first chapter above.</p>
      )}
      {chapters.map((ch, i) => (
        <section key={ch._id} className="card stack chapter-card">
          <span
            className="chapter-tab"
            style={{ backgroundColor: TAB_COLORS[i % TAB_COLORS.length] }}
          />
          <div className="row" style={{ justifyContent: "space-between" }}>
            {editingChapter === ch._id ? (
              <span className="row" style={{ flex: 1 }}>
                <input
                  className="input"
                  value={chapterDraft}
                  onChange={(e) => setChapterDraft(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary btn-small"
                  onClick={async () => {
                    await api(`/api/chapters/${ch._id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ title: chapterDraft }),
                    });
                    setEditingChapter(null);
                    await refresh();
                  }}
                >
                  Save
                </button>
              </span>
            ) : (
              <h3>{ch.title}</h3>
            )}
            <span className="row">
              <button className="btn btn-small" onClick={() => move("chapters", ch._id, "up")}>↑</button>
              <button className="btn btn-small" onClick={() => move("chapters", ch._id, "down")}>↓</button>
              <button
                className="btn btn-small"
                onClick={() => {
                  setEditingChapter(ch._id);
                  setChapterDraft(ch.title);
                }}
              >
                Rename
              </button>
              <button
                className="btn btn-small btn-danger"
                onClick={async () => {
                  if (!window.confirm(`Delete chapter "${ch.title}" and its pages?`)) return;
                  await api(`/api/chapters/${ch._id}`, { method: "DELETE" });
                  await refresh();
                }}
              >
                Delete
              </button>
            </span>
          </div>

          <div className="stack">
            {(pages[ch._id] ?? []).map((pg) => (
              <div key={pg._id} className="row" style={{ justifyContent: "space-between" }}>
                {editingPage === pg._id ? (
                  <span className="row" style={{ flex: 1 }}>
                    <input
                      className="input"
                      value={pageDraft}
                      onChange={(e) => setPageDraft(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-primary btn-small"
                      onClick={async () => {
                        await api(`/api/pages/${pg._id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ title: pageDraft }),
                        });
                        setEditingPage(null);
                        await refresh();
                      }}
                    >
                      Save
                    </button>
                  </span>
                ) : (
                  <Link href={`/pages/${pg._id}`}>{pg.title}</Link>
                )}
                <span className="row">
                  <button className="btn btn-small" onClick={() => move("pages", pg._id, "up")}>↑</button>
                  <button className="btn btn-small" onClick={() => move("pages", pg._id, "down")}>↓</button>
                  <button
                    className="btn btn-small"
                    onClick={() => {
                      setEditingPage(pg._id);
                      setPageDraft(pg.title);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={async () => {
                      if (!window.confirm(`Delete page "${pg.title}"?`)) return;
                      await api(`/api/pages/${pg._id}`, { method: "DELETE" });
                      await refresh();
                    }}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={(e) => addPage(e, ch._id)} className="row">
            <input
              className="input"
              placeholder="New page title"
              value={newPage[ch._id] ?? ""}
              onChange={(e) => setNewPage((p) => ({ ...p, [ch._id]: e.target.value }))}
              style={{ flex: 1 }}
            />
            <button className="btn">Add page</button>
          </form>
        </section>
      ))}

      {highlights.length > 0 && (
        <section className="card stack">
          <h2 style={{ marginTop: 0 }}>Highlights in this notebook</h2>
          {highlights.map((h, i) => (
            <div key={i}>
              <mark style={{ backgroundColor: h.color, padding: "0 2px", borderRadius: 3 }}>
                {h.text}
              </mark>{" "}
              <span className="muted">
                — <Link href={`/pages/${h.pageId}`}>{h.pageTitle}</Link> · {h.chapterTitle}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
