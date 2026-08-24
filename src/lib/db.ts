import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  dbInitPromise?: Promise<void>;
};

function createPrisma() {
  const client = new PrismaClient();

  // Optimasi SQLite untuk concurrency + durability (baremetal single-node).
  // Dijalankan sekali per proses, tidak diblok oleh request pertama.
  const initPromise = client
    .$executeRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => client.$executeRawUnsafe("PRAGMA foreign_keys = ON;"))
    .then(() => client.$executeRawUnsafe("PRAGMA synchronous = NORMAL;"))
    .then(() => client.$executeRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .catch((e) => {
      console.warn("[db] PRAGMA init warning:", e);
    })
    .then(() => undefined);

  globalForPrisma.dbInitPromise = initPromise;
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

// Helper untuk menunggu init selesai (dipakai route handler kritis bila perlu)
export function dbReady(): Promise<void> {
  return globalForPrisma.dbInitPromise ?? Promise.resolve();
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
