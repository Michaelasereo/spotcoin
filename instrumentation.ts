/**
 * Next.js instrumentation entry. Keep this file Edge-safe; Node-only logic lives in
 * `instrumentation.node.ts` and is loaded only when `NEXT_RUNTIME` is `nodejs`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerPrismaQueryEngine } = await import("./instrumentation.node");
    registerPrismaQueryEngine();
  }
}
