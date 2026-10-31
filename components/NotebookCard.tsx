"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TAB_COLORS } from "./ColorPicker";

export function NotebookCard({
  notebook,
  chapterIds,
  pages,
}: {
  notebook: { _id: string; title: string; color: string };
  chapterIds: string[];
  pages: number;
}) {
  const router = useRouter();

  async function remove() {
    if (!window.confirm(`Delete "${notebook.title}" and everything inside it?`)) return;
    const res = await fetch(`/api/notebooks/${notebook._id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="card notebook-card">
      <Link href={`/notebooks/${notebook._id}`} style={{ textDecoration: "none" }}>
        <div className="notebook-cover" style={{ backgroundColor: notebook.color }}>
          {notebook.title}
        </div>
      </Link>
      <div className="notebook-body">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted">
            {chapterIds.length} {chapterIds.length === 1 ? "chapter" : "chapters"} · {pages}{" "}
            {pages === 1 ? "page" : "pages"}
          </span>
          <button className="btn btn-small btn-danger" onClick={remove}>
            Delete
          </button>
        </div>
      </div>
      <div className="book-tabs">
        {chapterIds.slice(0, 8).map((id, i) => (
          <Link
            key={id}
            className="book-tab"
            style={{ backgroundColor: TAB_COLORS[i % TAB_COLORS.length] }}
            href={`/notebooks/${notebook._id}#chapter-${id}`}
          >
            {i + 1}
          </Link>
        ))}
      </div>
    </div>
  );
}
