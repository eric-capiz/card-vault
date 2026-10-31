import { redirect, notFound } from "next/navigation";
import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { Page } from "@/models/Page";
import { Chapter } from "@/models/Chapter";
import { Notebook } from "@/models/Notebook";
import { PageItem } from "@/models/PageItem";
import { PageEditor } from "@/components/PageEditor";

export default async function PagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  await connectDB();
  const pg = await Page.findOne({ _id: id, userId: session.userId, deletedAt: null });
  if (!pg) notFound();
  const ch = await Chapter.findOne({ _id: pg.chapterId, userId: session.userId, deletedAt: null });
  if (!ch) notFound();
  const nb = await Notebook.findOne({ _id: ch.notebookId, userId: session.userId, deletedAt: null });
  if (!nb) notFound();
  const items = await PageItem.find({ pageId: pg._id, userId: session.userId }).sort({
    order: 1,
    createdAt: 1,
  });
  const allChapters = await Chapter.find({ notebookId: nb._id, userId: session.userId, deletedAt: null }).sort({
    order: 1,
    createdAt: 1,
  });
  const chapterIds = allChapters.map((c) => c._id);
  const allPages = await Page.find({ chapterId: { $in: chapterIds }, userId: session.userId, deletedAt: null });
  const pagesByChapter = new Map<string, typeof allPages>();
  for (const c of allChapters) pagesByChapter.set(String(c._id), []);
  for (const p of allPages) {
    const key = String(p.chapterId);
    if (pagesByChapter.has(key)) pagesByChapter.get(key)!.push(p);
  }
  for (const list of pagesByChapter.values()) {
    list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  }
  const flat: { id: string; title: string }[] = [];
  for (const c of allChapters) {
    for (const p of pagesByChapter.get(String(c._id)) ?? []) {
      flat.push({ id: String(p._id), title: p.title });
    }
  }
  const idx = flat.findIndex((f) => f.id === String(pg._id));
  const prevPage = idx > 0 ? flat[idx - 1] : null;
  const nextPage = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
  const chapterPages = pagesByChapter.get(String(ch._id)) ?? [];
  const position = chapterPages.findIndex((p) => String(p._id) === String(pg._id)) + 1;
  return (
    <PageEditor
      page={toPlain(pg) as { _id: string; title: string; tags: string[]; pinned: boolean }}
      notebookId={String(nb._id)}
      notebookTitle={nb.title}
      chapterId={String(ch._id)}
      chapterTitle={ch.title}
      prevPage={prevPage}
      nextPage={nextPage}
      pagePosition={position}
      chapterPageCount={chapterPages.length}
      chapterCount={allChapters.length}
      initialItems={
        items.map(toPlain) as {
          _id: string;
          type: "note" | "image" | "file";
          text: string;
          dataUrl: string;
          fileName: string;
          mimeType: string;
          size: number;
        }[]
      }
    />
  );
}
