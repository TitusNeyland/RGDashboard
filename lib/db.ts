import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/drizzle/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

function createDb(): Db {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (see .env.example)");
  }
  return drizzle(neon(process.env.DATABASE_URL), { schema });
}

let _db: Db | undefined;

// Lazy: Next.js imports this module while collecting page data at build
// time, before env vars are necessarily available, so the connection can't
// be created eagerly at module scope without breaking `next build`.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!_db) _db = createDb();
    return Reflect.get(_db, prop, receiver);
  },
});
