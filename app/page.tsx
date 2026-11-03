import Link from "next/link";
import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { Notebook } from "@/models/Notebook";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { NotebookCreator } from "@/components/NotebookCreator";
import { NotebookCard } from "@/components/NotebookCard";

function FeatureStrip() {
  return (
    <div className="feature-grid">
      <div className="card">
        <h3>Chapters &amp; pages</h3>
        <p className="muted">
          Every notebook breaks into chapters, and every chapter into pages.
          Organize by subject, your way.
        </p>
      </div>
      <div className="card">
        <h3>Notes, images &amp; files</h3>
        <p className="muted">
          Each page holds text notes, images, and PDFs up to 10 MB.
        </p>
      </div>
      <div className="card">
        <h3>Highlighter</h3>
        <p className="muted">
          Select any text to highlight it in four colors, then revisit every
          highlight from one view.
        </p>
      </div>
      <div className="card">
        <h3>Search everything</h3>
        <p className="muted">
          Search across notebooks, chapters, pages, and note text in one place.
        </p>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="stack">
        <div className="hero stack">
          <h1>Your notebooks, your way.</h1>
          <p className="muted">
            Notebooks for any subject you want. Chapters inside them, pages inside
            those, and on every page: notes, images, files — plus a highlighter
            for what matters most.
          </p>
        </div>
        <FeatureStrip />
      </div>
    );
  }

  await connectDB();
  const notebooks = await Notebook.find({ userId: session.userId, deletedAt: null }).sort({ updatedAt: -1 });
  const notebookList = notebooks.map(toPlain) as {
    _id: string;
    title: string;
    color: string;
  }[];
  const counts = new Map<string, { chapterIds: string[]; pages: number }>();
  for (const nb of notebookList) {
    const chapters = await Chapter.find({ notebookId: nb._id, userId: session.userId, deletedAt: null })
      .select("_id order")
      .sort({ order: 1 });
    const pages = await Page.countDocuments({
      chapterId: { $in: chapters.map((c) => c._id) },
      userId: session.userId,
      deletedAt: null,
    });
    counts.set(nb._id, { chapterIds: chapters.map((c) => String(c._id)), pages });
  }
  const pinnedDocs = await Page.find({ userId: session.userId, pinned: true, deletedAt: null })
    .sort({ updatedAt: -1 })
    .limit(20);
  const pinnedChapters = await Chapter.find({
    _id: { $in: pinnedDocs.map((p) => p.chapterId) },
    userId: session.userId,
  });
  const pinnedChapterById = new Map(pinnedChapters.map((c) => [String(c._id), c]));
  const pinnedNotebooks = await Notebook.find({
    _id: { $in: pinnedChapters.map((c) => c.notebookId) },
    userId: session.userId,
  });
  const pinnedNotebookById = new Map(pinnedNotebooks.map((n) => [String(n._id), n.title]));
  const pinned = pinnedDocs.map((p) => {
    const ch = pinnedChapterById.get(String(p.chapterId));
    return {
      id: String(p._id),
      title: p.title,
      chapterTitle: ch?.title ?? "",
      notebookTitle: ch ? (pinnedNotebookById.get(String(ch.notebookId)) ?? "") : "",
    };
  });

  return (
    <div className="stack">
      <h1>Notebooks</h1>
      <NotebookCreator />
      {pinned.length > 0 && (
        <>
          <h2>Pinned pages</h2>
          <div className="stack">
            {pinned.map((p) => (
              <div key={p.id} className="card">
                <Link href={`/pages/${p.id}`}>{p.title || "Untitled page"}</Link>
                <span className="muted">
                  {" "}
                  · {p.notebookTitle} · {p.chapterTitle}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {notebookList.length === 0 ? (
        <>
          <p className="muted">
            No notebooks yet. Create your first one above — name it any subject you like.
          </p>
          <FeatureStrip />
        </>
      ) : (
        <div className="notebook-grid">
          {notebookList.map((nb) => (
            <NotebookCard
              key={nb._id}
              notebook={nb}
              chapterIds={counts.get(nb._id)?.chapterIds ?? []}
              pages={counts.get(nb._id)?.pages ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
