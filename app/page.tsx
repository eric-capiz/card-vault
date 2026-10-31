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
  const notebooks = await Notebook.find({ userId: session.userId }).sort({ updatedAt: -1 });
  const notebookList = notebooks.map(toPlain) as {
    _id: string;
    title: string;
    color: string;
  }[];
  const counts = new Map<string, { chapters: number; pages: number }>();
  for (const nb of notebookList) {
    const chapters = await Chapter.find({ notebookId: nb._id, userId: session.userId }).select("_id");
    const pages = await Page.countDocuments({
      chapterId: { $in: chapters.map((c) => c._id) },
      userId: session.userId,
    });
    counts.set(nb._id, { chapters: chapters.length, pages });
  }
  const recent = await Page.find({ userId: session.userId })
    .sort({ updatedAt: -1 })
    .limit(8);

  return (
    <div className="stack">
      <h1>Notebooks</h1>
      <NotebookCreator />
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
              chapters={counts.get(nb._id)?.chapters ?? 0}
              pages={counts.get(nb._id)?.pages ?? 0}
            />
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <>
          <h2>Recently updated pages</h2>
          <div className="stack">
            {recent.map((p) => (
              <div key={String(p._id)} className="card">
                <Link href={`/pages/${String(p._id)}`}>{p.title}</Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
