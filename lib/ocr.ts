// Client-side OCR for image blocks (Tesseract.js, runs in the browser).
// The extracted text is stored hidden on the block and exists only so the
// search field can match words inside screenshots — it is never shown in
// the UI. Lazy-loaded so the OCR code stays out of the main bundle until
// an image actually needs reading.

type WorkerLike = {
  recognize: (image: string) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};

let workerPromise: Promise<WorkerLike> | null = null;

async function getWorker(): Promise<WorkerLike> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return (await createWorker("eng")) as unknown as WorkerLike;
    })();
    // A failed load must not poison later attempts.
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
}

/**
 * Reads the text out of an image (base64 data URL).
 * Returns the text with whitespace collapsed, "" when the image holds no
 * readable text, and null when OCR itself failed (so the caller can retry
 * later instead of marking the image as done).
 */
export async function extractImageText(dataUrl: string): Promise<string | null> {
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(dataUrl);
    return (data.text ?? "").replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
}
