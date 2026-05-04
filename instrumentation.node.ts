import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Node-only: set Prisma query engine path for Linux serverless (Netlify Lambda).
 * Engines are copied into `public/_prisma/` by `scripts/copy-prisma-engines.mjs` after build.
 */
export function registerPrismaQueryEngine() {
  if (process.platform !== "linux") return;

  const engine = join(
    process.cwd(),
    "public",
    "_prisma",
    "libquery_engine-rhel-openssl-1.0.x.so.node",
  );

  if (existsSync(engine)) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = engine;
  }
}
