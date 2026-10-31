import { redirect, notFound } from "next/navigation";
import { connectDB, toPlain } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { Notebook } from "@/models/Notebook";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { NotebookView } from "@/components/NotebookView";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  await connectDB();
  const nb = await Notebook.findOne({ _id: id, userId: session.userId, deletedAt: null });
  if (!nb) notFound();
  const chapters = await Chapter.find({ notebookId: nb._id, userId: session.userId, deletedAt: null }).sort({
    order: 1,
    createdAt: 1,
  });
  const pagesByChapter: Record<string, unknown[]> = {};
  for (const ch of chapters) {
    const pages = await Page.find({ chapterId: ch._id, userId: session.userId, deletedAt: null }).sort({
      order: 1,
      createdAt: 1,
    });
    pagesByChapter[String(ch._id)] = pages.map(toPlain);
  }
  return (
    <NotebookView
      notebook={toPlain(nb) as { _id: string; title: string; color: string }}
      initialChapters={chapters.map(toPlain) as { _id: string; title: string; order: number }[]}
      initialPages={
        pagesByChapter as Record<string, { _id: string; title: string; order: number; pinned: boolean }[]>
      }
    />
  );
}
