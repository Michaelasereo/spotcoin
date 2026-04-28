import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

function withPgBouncerParams(url: string | undefined) {
  if (!url) return undefined;
  if (url.includes("pgbouncer=true") || url.includes("statement_cache_size=0")) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}pgbouncer=true&statement_cache_size=0`;
}

function createPrismaClient() {
  const pooledUrl = withPgBouncerParams(process.env.DATABASE_URL);
  const runtimeUrl = pooledUrl;

  if (!runtimeUrl) {
    return new PrismaClient();
  }

  // App runtime uses pooled URL; pgBouncer-safe params prevent prepared statement errors.
  return new PrismaClient({
    datasources: {
      db: {
        url: runtimeUrl,
      },
    },
  });
}

const runtimeUrlKey = withPgBouncerParams(process.env.DATABASE_URL) || "default";

if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== runtimeUrlKey) {
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaUrl = runtimeUrlKey;
}

export const prisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaUrl = runtimeUrlKey;
}
