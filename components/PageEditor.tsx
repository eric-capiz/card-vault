"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compress";

export const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#ffeb3b" },
  { name: "Green", value: "#a7f3d0" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Blue", value: "#bfdbfe" },
];

// Note formatting toolbar: label + execCommand + inline label styling.
// execCommand is deprecated but remains the standard contentEditable
// toolbar mechanism and works in every browser; notes already store HTML,
// so its output (<b>, <i>, <u>, <ul>/<ol>) saves like any other note edit.
const FORMAT_BUTTONS = [
  { label: "B", command: "bold", style: { fontWeight: 700 } },
  { label: "I", command: "italic", style: { fontStyle: "italic" } },
  { label: "U", command: "underline", style: { textDecoration: "underline" } },
  { label: "S", command: "strikeThrough", style: { textDecoration: "line-through" } },
  { label: "• Bullets", command: "insertUnorderedList", style: {} },
  { label: "1. Numbered", command: "insertOrderedList", style: {} },
] as const;

// Selection helpers: character offsets into a note editor's text, measured
// with cloneContents().textContent so <br> and block breaks count the same
// on capture and restore (Range.toString() would disagree with the walker).
function selectionOffsets(el: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return null;
  const lenTo = (container: Node, offset: number) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.setEnd(container, offset);
    const tmp = document.createElement("div");
    tmp.appendChild(r.cloneContents());
    return tmp.textContent?.length ?? 0;
  };
  return {
    start: lenTo(range.startContainer, range.startOffset),
    end: lenTo(range.endContainer, range.endOffset),
  };
}

function restoreOffsets(el: HTMLElement, start: number, end: number) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let acc = 0;
  let node: Text | null = null;
  let sNode: Text | null = null;
  let sOff = 0;
  let eNode: Text | null = null;
  let eOff = 0;
  while ((node = walker.nextNode() as Text | null)) {
    const len = node.textContent?.length ?? 0;
    if (!sNode && acc + len >= start) {
      sNode = node;
      sOff = start - acc;
    }
    if (!eNode && acc + len >= end) {
      eNode = node;
      eOff = end - acc;
      break;
    }
    acc += len;
  }
  if (sNode && !eNode) {
    eNode = sNode;
    eOff = sNode.textContent?.length ?? 0;
  }
  const range = document.createRange();
  if (sNode && eNode) {
    range.setStart(sNode, Math.min(sOff, sNode.textContent?.length ?? 0));
    range.setEnd(eNode, Math.min(eOff, eNode.textContent?.length ?? 0));
  } else {
    range.selectNodeContents(el);
    range.collapse(false);
  }
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  el.focus();
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  el.focus();
}

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
  const [slide, setSlide] = useState<Record<string, number>>({});
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Undo history, per note. The browser's native contentEditable undo stack
  // is wiped whenever React rewrites innerHTML (which every save does), so
  // notes keep their own: hist[idx] is the current state, entries before it
  // are undo targets, entries after it are redo targets. Typing commits 1s
  // after a pause, so one undo removes a burst, Word-style, not a char.
  type NoteHistory = { hist: string[]; idx: number };
  const noteHistory = useRef<Record<string, NoteHistory>>({});
  const commitTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Selection to restore after a render rewrites the editor (see useEffect).
  const pendingRestore = useRef<Record<string, { start: number; end: number } | "end">>({});
  const [, setHistVersion] = useState(0);

  useEffect(() => {
    // Runs after any items render (e.g. a save rewrote a note's innerHTML
    // and dropped its selection): restore what the toolbar asked to keep.
    for (const [id, target] of Object.entries(pendingRestore.current)) {
      const el = noteRefs.current[id];
      if (!el) continue;
      if (target === "end") placeCaretAtEnd(el);
      else restoreOffsets(el, target.start, target.end);
    }
    pendingRestore.current = {};
  }, [items]);

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
          ← {prevPage.title || "Untitled page"}
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
          {nextPage.title || "Untitled page"} →
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

  function ensureHistory(item: ItemT, el: HTMLElement): NoteHistory {
    let entry = noteHistory.current[item._id];
    if (!entry) {
      entry = { hist: [el.innerHTML], idx: 0 };
      noteHistory.current[item._id] = entry;
    }
    return entry;
  }

  function clearCommitTimer(id: string) {
    const t = commitTimers.current[id];
    if (t) {
      clearTimeout(t);
      delete commitTimers.current[id];
    }
  }

  function commitHistory(id: string, html: string) {
    const entry = noteHistory.current[id];
    if (!entry || html === entry.hist[entry.idx]) return;
    entry.hist = entry.hist.slice(0, entry.idx + 1);
    entry.hist.push(html);
    entry.idx = entry.hist.length - 1;
    if (entry.hist.length > 100) {
      entry.hist = entry.hist.slice(entry.hist.length - 100);
      entry.idx = entry.hist.length - 1;
    }
    setHistVersion((v) => v + 1);
  }

  async function persistNote(item: ItemT, html: string) {
    try {
      await api(`/api/items/${item._id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: html }),
      });
      setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, text: html } : it)));
      setSaved("Saved.");
    } catch (e) {
      delete pendingRestore.current[item._id];
      setError(e instanceof Error ? e.message : "Could not save note.");
    }
  }

  function undoNote(item: ItemT) {
    const el = noteRefs.current[item._id];
    if (!el) return;
    const entry = ensureHistory(item, el);
    if (el.innerHTML !== entry.hist[entry.idx]) {
      // Uncommitted edits (e.g. mid-typing-burst) become the redo target.
      commitHistory(item._id, el.innerHTML);
    }
    if (entry.idx === 0) return;
    entry.idx -= 1;
    const target = entry.hist[entry.idx];
    el.innerHTML = target;
    placeCaretAtEnd(el);
    pendingRestore.current[item._id] = "end";
    setHistVersion((v) => v + 1);
    void persistNote(item, target);
  }

  function redoNote(item: ItemT) {
    const el = noteRefs.current[item._id];
    if (!el) return;
    const entry = noteHistory.current[item._id];
    if (!entry || entry.idx >= entry.hist.length - 1) return;
    entry.idx += 1;
    const target = entry.hist[entry.idx];
    el.innerHTML = target;
    placeCaretAtEnd(el);
    pendingRestore.current[item._id] = "end";
    setHistVersion((v) => v + 1);
    void persistNote(item, target);
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

  function format(item: ItemT, command: string) {
    const el = noteRefs.current[item._id];
    if (!el) return;
    // Only this note's own selection: without this guard a toolbar click
    // could format another note (or nothing) while saving this one.
    const offsets = selectionOffsets(el);
    if (!offsets) return;
    // Mousedown is prevented on the buttons, so the selection survives the
    // click. execCommand is Word-style here: bold/italic/underline apply to
    // the highlight, bullets/numbers apply per touched paragraph (and toggle
    // back off on a second click); with a bare caret it sets the format for
    // text typed next. The save below rewrites innerHTML and would drop the
    // selection, so it is restored after the render (see useEffect).
    document.execCommand(command);
    clearCommitTimer(item._id);
    commitHistory(item._id, el.innerHTML);
    if (el.innerHTML !== item.text) pendingRestore.current[item._id] = offsets;
    void saveNote(item);
  }

  function highlight(item: ItemT, color: string) {
    const el = noteRefs.current[item._id];
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    const offsets = selectionOffsets(el);
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
    clearCommitTimer(item._id);
    commitHistory(item._id, el.innerHTML);
    if (offsets && el.innerHTML !== item.text) pendingRestore.current[item._id] = offsets;
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

  function blockCard(item: ItemT, gi: number, glen: number) {
    const histEntry = noteHistory.current[item._id];
    const canUndo = !!histEntry && histEntry.idx > 0;
    const canRedo = !!histEntry && histEntry.idx < histEntry.hist.length - 1;
    return (
      <div className="block">
        <div className="block-actions">
          <button
            className="btn btn-small"
            disabled={gi === 0}
            onClick={async () => {
              await move(item._id, "up");
              setSlide((s) => ({ ...s, [item.type]: Math.max(0, gi - 1) }));
            }}
          >
            ↑
          </button>
          <button
            className="btn btn-small"
            disabled={gi === glen - 1}
            onClick={async () => {
              await move(item._id, "down");
              setSlide((s) => ({ ...s, [item.type]: Math.min(glen - 1, gi + 1) }));
            }}
          >
            ↓
          </button>
          <button className="btn btn-small btn-danger" onClick={() => remove(item._id)}>
            Delete
          </button>
        </div>
        {item.type === "note" && (
          <>
            <div className="format-toolbar">
              <span className="muted">Format:</span>
              <button
                type="button"
                className="btn btn-small"
                disabled={!canUndo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => undoNote(item)}
              >
                ↩ Undo
              </button>
              <button
                type="button"
                className="btn btn-small"
                disabled={!canRedo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => redoNote(item)}
              >
                ↪ Redo
              </button>
              {FORMAT_BUTTONS.map((b) => (
                <button
                  key={b.command}
                  type="button"
                  className="btn btn-small"
                  style={b.style}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => format(item, b.command)}
                >
                  {b.label}
                </button>
              ))}
            </div>
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
              onFocus={() => {
                const el = noteRefs.current[item._id];
                if (el) {
                  ensureHistory(item, el);
                  setHistVersion((v) => v + 1);
                }
              }}
              onInput={() => {
                const el = noteRefs.current[item._id];
                if (!el) return;
                ensureHistory(item, el);
                // Debounced commit: fires 1s after typing pauses, so one
                // undo removes the whole burst. Cleared on blur/format.
                clearCommitTimer(item._id);
                commitTimers.current[item._id] = setTimeout(() => {
                  const current = noteRefs.current[item._id];
                  if (current) commitHistory(item._id, current.innerHTML);
                }, 1000);
              }}
              onKeyDown={(e) => {
                if (!(e.ctrlKey || e.metaKey)) return;
                const key = e.key.toLowerCase();
                if (key === "z" && !e.shiftKey) {
                  e.preventDefault();
                  undoNote(item);
                } else if (key === "y" || (key === "z" && e.shiftKey)) {
                  e.preventDefault();
                  redoNote(item);
                }
              }}
              onBlur={() => {
                const el = noteRefs.current[item._id];
                if (el) {
                  clearCommitTimer(item._id);
                  commitHistory(item._id, el.innerHTML);
                }
                void saveNote(item);
              }}
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
    );
  }

  const groups: { type: ItemT["type"]; items: ItemT[] }[] = [];
  for (const it of items) {
    const g = groups.find((x) => x.type === it.type);
    if (g) g.items.push(it);
    else groups.push({ type: it.type, items: [it] });
  }
  const GROUP_LABEL: Record<ItemT["type"], string> = { note: "Notes", image: "Images", file: "Files" };

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
          placeholder="Page title (optional)"
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
            if (!window.confirm(`Move page "${page.title || "Untitled page"}" to Trash? You can restore it from Trash for 30 days.`)) return;
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
      {groups.map((g) => {
        const idx = Math.min(slide[g.type] ?? 0, g.items.length - 1);
        return (
          <div key={g.type} className="stack">
            {g.items.length > 1 && (
              <div className="slide-bar">
                <div className="slide-row">
                  <strong className="slide-title">{GROUP_LABEL[g.type]}</strong>
                  <span className="slide-controls">
                    <button
                      className="btn slide-btn"
                      disabled={idx === 0}
                      onClick={() => setSlide((s) => ({ ...s, [g.type]: idx - 1 }))}
                    >
                      ← Prev
                    </button>
                    <span className="slide-count">
                      {idx + 1} of {g.items.length}
                    </span>
                    <button
                      className="btn slide-btn"
                      disabled={idx === g.items.length - 1}
                      onClick={() => setSlide((s) => ({ ...s, [g.type]: idx + 1 }))}
                    >
                      Next →
                    </button>
                  </span>
                </div>
                <div className="slide-progress">
                  <div className="slide-fill" style={{ width: `${((idx + 1) / g.items.length) * 100}%` }} />
                </div>
              </div>
            )}
            {blockCard(g.items[idx], idx, g.items.length)}
          </div>
        );
      })}
      {addBar}
      {nav}
    </div>
  );
}
