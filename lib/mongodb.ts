import mongoose from "mongoose";

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const cached: Cached = (global as unknown as { mongoose?: Cached }).mongoose ?? {
  conn: null,
  promise: null,
};

if (!(global as unknown as { mongoose?: Cached }).mongoose) {
  (global as unknown as { mongoose?: Cached }).mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

/** JSON-round-trips a Mongoose doc so ObjectIds become plain strings. */
export function toPlain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}
