import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";

/**
 * Next.js dev server and serverless runtimes re-evaluate modules frequently.
 * Cache the connection promise on globalThis so we never open more than one
 * pool per process.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  __mongoose?: MongooseCache;
};

const cache: MongooseCache = globalForMongoose.__mongoose ?? {
  conn: null,
  promise: null,
};
globalForMongoose.__mongoose = cache;

mongoose.set("strictQuery", true);
// Index sync is handled explicitly by `npm run seed` / `npm run db:indexes`
// so that request paths never pay for index builds.
mongoose.set("autoIndex", process.env.NODE_ENV !== "production");

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongodbUri, {
        dbName: env.mongodbDbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        retryWrites: true,
      })
      .then((m) => m);
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

export { mongoose };
