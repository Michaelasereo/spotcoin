/**
 * After `next build`, copy Linux Prisma query engines into `public/_prisma/`.
 * Netlify's Next server bundle often omits `node_modules/.prisma/client` natives;
 * `public/` is always deployed at `/var/task/public`, and `instrumentation.ts` points
 * Prisma at the RHEL engine on Linux (Lambda).
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const clientDir = join(root, "node_modules", ".prisma", "client");
const outDir = join(root, "public", "_prisma");

const engines = [
  "libquery_engine-rhel-openssl-1.0.x.so.node",
  "libquery_engine-rhel-openssl-3.0.x.so.node",
];

mkdirSync(outDir, { recursive: true });

for (const name of engines) {
  const src = join(clientDir, name);
  const dest = join(outDir, name);
  if (!existsSync(src)) {
    console.warn(`[copy-prisma-engines] skip missing: ${src}`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`[copy-prisma-engines] copied ${name}`);
}
