import Link from "next/link";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { Notebook } from "@/models/Notebook";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { normalizeTag } from "@/lib/tags";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { tag } = await searchParams;
  await connectDB();
  const userId = session.userId;

  if (tag) {
    const t = normalizeTag(tag);
    const pages = await Page.find({ userId, tags: t, deletedAt: null }).sort({ updatedAt: -1 });
    const chapters = await Chapter.find({
      _id: { $in: pages.map((p) => p.chapterId) },
      userId,
    });
    const chapterById = new Map(chapters.map((c) => [String(c._id), c]));
    const notebooks = await Notebook.find({
      _id: { $in: chapters.map((c) => c.notebookId) },
      userId,
    });
    const notebookById = new Map(notebooks.map((n) => [String(n._id), n.title]));
    return (
      <div className="stack">
        <h1>#{t}</h1>
        <Link href="/tags">← All tags</Link>
        {pages.length === 0 && <p className="muted">No pages with this tag.</p>}
        <div className="stack">
          {pages.map((p) => {
            const ch = chapterById.get(String(p.chapterId));
            return (
              <div key={String(p._id)} className="card">
                <Link href={`/pages/${p._id}`}>{p.title}</Link>
                <span className="muted">
                  {" "}
                  · {ch ? notebookById.get(String(ch.notebookId)) ?? "" : ""} ·{" "}
                  {ch?.title ?? ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const pages = await Page.find({ userId, deletedAt: null }).select("tags");
  const counts = new Map<string, number>();
  for (const p of pages) {
    for (const t of p.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return (
    <div className="stack">
      <h1>Tags</h1>
      {sorted.length === 0 && (
        <p className="muted">
          No tags yet. Add tags on any page and they will show up here.
        </p>
      )}
      <div className="stack">
        {sorted.map(([t, n]) => (
          <div key={t} className="card row" style={{ justifyContent: "space-between" }}>
            <Link href={`/tags?tag=${encodeURIComponent(t)}`}>#{t}</Link>
            <span className="muted">
              {n} {n === 1 ? "page" : "pages"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
