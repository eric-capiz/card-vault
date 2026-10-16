import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Not throwing at import time so public pages (search, scanner) work
  // without a database configured. Auth routes check and return 503.
  console.warn("[card-vault] MONGODB_URI is not set — auth and saving are disabled.");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Use a global cache so hot-reloads in dev don't open new connections.
const globalWithMongoose = globalThis as typeof globalThis & {
  __cardVaultMongoose?: MongooseCache;
};

const cached: MongooseCache = globalWithMongoose.__cardVaultMongoose ?? {
  conn: null,
  promise: null,
};
globalWithMongoose.__cardVaultMongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || "card-vault",
      maxPoolSize: 10,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export function isDBConfigured(): boolean {
  return !!MONGODB_URI;
}
