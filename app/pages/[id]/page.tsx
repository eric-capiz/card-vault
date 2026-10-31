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
  const pg = await Page.findOne({ _id: id, userId: session.userId });
  if (!pg) notFound();
  const ch = await Chapter.findById(pg.chapterId);
  if (!ch) notFound();
  const nb = await Notebook.findById(ch.notebookId);
  if (!nb) notFound();
  const items = await PageItem.find({ pageId: pg._id, userId: session.userId }).sort({
    order: 1,
    createdAt: 1,
  });
  return (
    <PageEditor
      page={toPlain(pg) as { _id: string; title: string }}
      notebookId={String(nb._id)}
      notebookTitle={nb.title}
      chapterTitle={ch.title}
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
