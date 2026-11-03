import { redirect, notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { Notebook } from "@/models/Notebook";
import { Chapter } from "@/models/Chapter";
import { Page } from "@/models/Page";
import { PageItem } from "@/models/PageItem";
import { PrintButton } from "@/components/PrintButton";

export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  await connectDB();
  const userId = session.userId;
  const nb = await Notebook.findOne({ _id: id, userId, deletedAt: null });
  if (!nb) notFound();
  const chapters = await Chapter.find({ notebookId: nb._id, userId, deletedAt: null }).sort({
    order: 1,
    createdAt: 1,
  });
  const printData: {
    chapterTitle: string;
    chapterId: string;
    pages: {
      pageId: string;
      pageTitle: string;
      items: { id: string; type: string; text: string; dataUrl: string; fileName: string }[];
    }[];
  }[] = [];
  for (const ch of chapters) {
    const pages = await Page.find({ chapterId: ch._id, userId, deletedAt: null }).sort({
      order: 1,
      createdAt: 1,
    });
    const pageData = [];
    for (const pg of pages) {
      const items = await PageItem.find({ pageId: pg._id, userId }).sort({
        order: 1,
        createdAt: 1,
      });
      pageData.push({
        pageId: String(pg._id),
        pageTitle: pg.title,
        items: items.map((it) => ({
          id: String(it._id),
          type: it.type,
          text: it.text ?? "",
          dataUrl: it.dataUrl ?? "",
          fileName: it.fileName ?? "",
        })),
      });
    }
    printData.push({ chapterTitle: ch.title, chapterId: String(ch._id), pages: pageData });
  }
  return (
    <div className="stack">
      <PrintButton />
      <h1>{nb.title}</h1>
      {printData.map((ch) => (
        <section key={ch.chapterId}>
          <h2>{ch.chapterTitle}</h2>
          {ch.pages.map((pg) => (
            <section key={pg.pageId}>
              <h3>{pg.pageTitle || "Untitled page"}</h3>
              {pg.items.map((it) =>
                it.type === "note" ? (
                  <div key={it.id} dangerouslySetInnerHTML={{ __html: it.text }} />
                ) : it.type === "image" ? (
                  <div key={it.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.dataUrl} alt={it.fileName} style={{ maxWidth: "100%", borderRadius: 8 }} />
                  </div>
                ) : (
                  <div key={it.id}>[File: {it.fileName}]</div>
                ),
              )}
            </section>
          ))}
        </section>
      ))}
    </div>
  );
}
