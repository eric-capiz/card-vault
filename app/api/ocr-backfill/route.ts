import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { PageItem } from "@/models/PageItem";

/**
 * Backfill source for image OCR: returns image blocks that have never been
 * read (ocrDone is false), in small batches so the base64 payloads stay
 * manageable. The browser OCRs each one and PATCHes it back with the text.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(parseInt(params.get("limit") ?? "3", 10) || 3, 1), 10);
  const skip = Math.max(parseInt(params.get("skip") ?? "0", 10) || 0, 0);
  await connectDB();
  const filter = { userId: session.userId, type: "image", ocrDone: { $ne: true } };
  const total = await PageItem.countDocuments(filter);
  const docs = await PageItem.find(filter)
    .select("_id pageId dataUrl")
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);
  return Response.json({
    total,
    items: docs.map((d) => ({
      _id: String(d._id),
      pageId: String(d.pageId),
      dataUrl: d.dataUrl,
    })),
  });
}
