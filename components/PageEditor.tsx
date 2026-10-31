"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/compress";

export const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#ffeb3b" },
  { name: "Green", value: "#a7f3d0" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Blue", value: "#bfdbfe" },
];

type ItemT = {
  _id: string;
  type: "note" | "image" | "file";
  text: string;
  dataUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
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

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

export function PageEditor({
  page,
  notebookId,
  notebookTitle,
  chapterId,
  chapterTitle,
  prevPage,
  nextPage,
  pagePosition,
  chapterPageCount,
  chapterCount,
  initialItems,
}: {
  page: { _id: string; title: string; tags: string[]; pinned: boolean };
  notebookId: string;
  notebookTitle: string;
  chapterId: string;
  chapterTitle: string;
  prevPage: { id: string; title: string } | null;
  nextPage: { id: string; title: string } | null;
  pagePosition: number;
  chapterPageCount: number;
  chapterCount: number;
  initialItems: ItemT[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [tags, setTags] = useState<string[]>(page.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [pinned, setPinned] = useState(page.pinned ?? false);
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});

  async function saveTags(next: string[]) {
    try {
      const res = await api(`/api/pages/${page._id}`, {
        method: "PATCH",
        body: JSON.stringify({ tags: next }),
      });
      setTags(res.page.tags ?? next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save tags.");
    }
  }

  async function addTag() {
    const t = newTag.trim();
    if (!t) return;
    setNewTag("");
    await saveTags([...tags, t]);
  }

  async function removeTag(t: string) {
    await saveTags(tags.filter((x) => x !== t));
  }

  async function togglePin() {
    try {
      const res = await api(`/api/pages/${page._id}`, {
        method: "PATCH",
        body: JSON.stringify({ pinned: !pinned }),
      });
      setPinned(res.page.pinned ?? !pinned);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change pin.");
    }
  }

  async function createNextChapter() {
    setCreatingChapter(true);
    try {
      const res = await api("/api/chapters", {
        method: "POST",
        body: JSON.stringify({ notebookId, title: `Chapter ${chapterCount + 1}` }),
      });
      router.push(`/notebooks/${notebookId}#chapter-${res.chapter._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create chapter.");
      setCreatingChapter(false);
    }
  }

  const nav = (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
      {prevPage ? (
        <Link
          className="btn"
          href={`/pages/${prevPage.id}`}
          style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          ← {prevPage.title}
        </Link>
      ) : (
        <button className="btn" disabled>
          ← Previous
        </button>
      )}
      <span className="muted">
        {chapterTitle} · Page {pagePosition} of {chapterPageCount}
      </span>
      {nextPage ? (
        <Link
          className="btn"
          href={`/pages/${nextPage.id}`}
          style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {nextPage.title} →
        </Link>
      ) : (
        <button className="btn btn-primary" disabled={creatingChapter} onClick={createNextChapter}>
          {creatingChapter ? "Creating…" : "+ Next chapter"}
        </button>
      )}
    </div>
  );

  const addBar = (
    <div className="card row">
      <button className="btn btn-primary" onClick={addNote}>+ Note</button>
      <label className="btn" style={{ cursor: "pointer" }}>
        + Image
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addImage(f);
            e.target.value = "";
          }}
        />
      </label>
      <label className="btn" style={{ cursor: "pointer" }}>
        + File / PDF
        <input
          type="file"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addFile(f);
            e.target.value = "";
          }}
        />
      </label>
      <span className="muted">Files up to 10 MB. Images are compressed automatically. Tip: paste an image straight from Snipping Tool with Ctrl+V.</span>
    </div>
  );

  async function refresh() {
    const data = await api(`/api/items?pageId=${page._id}`);
    setItems(data.items);
  }

  async function addNote() {
    try {
      await api("/api/items", {
        method: "POST",
        body: JSON.stringify({ pageId: page._id, type: "note", text: "" }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add note.");
    }
  }

  async function addImage(file: File): Promise<boolean> {
    try {
      const dataUrl = await compressImage(file);
      await api("/api/items", {
        method: "POST",
        body: JSON.stringify({
          pageId: page._id,
          type: "image",
          dataUrl,
          fileName: file.name,
          mimeType: "image/jpeg",
          size: dataUrlBytes(dataUrl),
        }),
      });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add image.");
      return false;
    }
  }

  async function handlePaste(e: React.ClipboardEvent) {
    const dt = e.clipboardData;
    const files: File[] = [];
    for (const f of Array.from(dt.files)) {
      if (f.type.startsWith("image/")) files.push(f);
    }
    if (files.length === 0) {
      for (const item of Array.from(dt.items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }
    // No image on the clipboard: leave text pastes alone (notes, title, tags).
    if (files.length === 0) return;
    // Don't let the browser drop a blob-URL image into a note (it wouldn't
    // survive a reload). Upload it as a real image block instead.
    e.preventDefault();
    let ok = false;
    for (const f of files) {
      if (await addImage(f)) ok = true;
    }
    if (ok) setSaved("Image pasted.");
  }

  async function addFile(file: File) {
    try {
      if (file.size > 10 * 1024 * 1024) {
        setError("That file is over the 10 MB limit.");
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Could not read file."));
        r.readAsDataURL(file);
      });
      await api("/api/items", {
        method: "POST",
        body: JSON.stringify({
          pageId: page._id,
          type: "file",
          dataUrl,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add file.");
    }
  }

  async function saveNote(item: ItemT) {
    const el = noteRefs.current[item._id];
    if (!el) return;
    const html = el.innerHTML;
    if (html === item.text) return;
    try {
      await api(`/api/items/${item._id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: html }),
      });
      setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, text: html } : it)));
      setSaved("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note.");
    }
  }

  function highlight(item: ItemT, color: string) {
    const el = noteRefs.current[item._id];
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    const mark = document.createElement("mark");
    mark.setAttribute("data-color", color);
    mark.style.backgroundColor = color;
    mark.style.padding = "0 2px";
    mark.style.borderRadius = "3px";
    try {
      range.surroundContents(mark);
    } catch {
      const frag = range.extractContents();
      mark.appendChild(frag);
      range.insertNode(mark);
    }
    sel.removeAllRanges();
    void saveNote(item);
  }

  async function move(id: string, dir: "up" | "down") {
    await api(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify({ move: dir }) });
    await refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this block?")) return;
    await api(`/api/items/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="stack" onPaste={handlePaste}>
      <div className="muted">
        <Link href={`/notebooks/${notebookId}#chapter-${chapterId}`}>{notebookTitle}</Link> · {chapterTitle}
      </div>
      {nav}
      <div className="row">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1, fontSize: 24, fontWeight: 700 }}
          aria-label="Page title"
        />
        <button
          className="btn btn-primary"
          onClick={async () => {
            await api(`/api/pages/${page._id}`, {
              method: "PATCH",
              body: JSON.stringify({ title }),
            });
            setSaved("Saved.");
          }}
        >
          Save title
        </button>
        <button className="btn" onClick={togglePin}>
          {pinned ? "Unpin" : "Pin"}
        </button>
        <button
          className="btn btn-danger"
          onClick={async () => {
            if (!window.confirm(`Move page "${page.title}" to Trash? You can restore it from Trash for 30 days.`)) return;
            await api(`/api/pages/${page._id}`, { method: "DELETE" });
            router.push(`/notebooks/${notebookId}`);
          }}
        >
          Delete page
        </button>
      </div>
      <div className="card row" style={{ flexWrap: "wrap" }}>
        <span className="muted">Tags:</span>
        {tags.map((t) => (
          <span key={t} className="tag-chip">
            <Link href={`/tags?tag=${encodeURIComponent(t)}`}>{t}</Link>
            <button type="button" onClick={() => void removeTag(t)} aria-label={`Remove tag ${t}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className="input"
          placeholder="Add a tag"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addTag();
            }
          }}
          style={{ flex: 1, minWidth: 120 }}
        />
        <button className="btn" onClick={() => void addTag()}>
          Add
        </button>
      </div>
      {saved && <div className="muted">{saved}</div>}
      {error && <div className="error">{error}</div>}

      {addBar}

      {items.length === 0 && (
        <p className="muted">This page is empty. Add a note, an image, or a file above.</p>
      )}
      {items.map((item) => (
        <div key={item._id} className="block">
          <div className="block-actions">
            <button className="btn btn-small" onClick={() => move(item._id, "up")}>↑</button>
            <button className="btn btn-small" onClick={() => move(item._id, "down")}>↓</button>
            <button className="btn btn-small btn-danger" onClick={() => remove(item._id)}>
              Delete
            </button>
          </div>
          {item.type === "note" && (
            <>
              <div className="highlight-toolbar">
                <span className="muted">Highlight:</span>
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className="highlight-chip"
                    style={{ backgroundColor: c.value }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => highlight(item, c.value)}
                  >
                    {c.name}
                  </button>
                ))}
                <span className="muted">Select text in the note, then pick a color.</span>
              </div>
              <div
                ref={(el) => {
                  noteRefs.current[item._id] = el;
                }}
                className="note-editor"
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Write a note…"
                dangerouslySetInnerHTML={{ __html: item.text }}
                onBlur={() => void saveNote(item)}
              />
            </>
          )}
          {item.type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.dataUrl}
              alt={item.fileName}
              style={{ maxWidth: "100%", borderRadius: 8 }}
            />
          )}
          {item.type === "file" && (
            <div className="stack">
              <div>
                <strong>{item.fileName}</strong>{" "}
                <span className="muted">({Math.round(item.size / 1024)} KB)</span>
              </div>
              {item.mimeType === "application/pdf" && (
                <embed
                  className="file-embed"
                  src={item.dataUrl}
                  type="application/pdf"
                />
              )}
              <a href={item.dataUrl} download={item.fileName} className="btn" style={{ alignSelf: "flex-start" }}>
                Download
              </a>
            </div>
          )}
        </div>
      ))}
      {addBar}
      {nav}
    </div>
  );
}
