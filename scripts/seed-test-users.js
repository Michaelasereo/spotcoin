/**
 * Seeds test users into Postgres (DATABASE_URL).
 *
 * Default: creates "Spotcoin Test Workspace" if missing, then seeds test users there.
 * `User.workspaceId` is required (FK), so the workspace row always exists before users.
 * Optional: SEED_WORKSPACE_ID to attach test users to an existing workspace instead.
 *
 * Prod manual testing:
 *   SEED_WORKSPACE_ID='<existing-workspace-cuid>' DATABASE_URL='…' node scripts/seed-test-users.js
 */
const fs = require("fs");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");
const { Pool } = require("pg");

function loadEnvLocal() {
  const path = ".env.local";
  if (!fs.existsSync(path)) return;
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const DEFAULT_POSITIONS = [
  "Head of Product",
  "Head of Engineering",
  "Frontend Lead",
  "Backend Lead",
  "Frontend Developer",
  "Backend Developer",
  "Product Designer",
  "Head of Operations",
  "Operations",
  "Marketing",
  "Product Design Intern",
  "Intern",
];

async function ensureDefaultPositions(prisma, workspaceId) {
  const existing = await prisma.position.findMany({
    where: { workspaceId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((item) => item.name.toLowerCase()));

  const toCreate = DEFAULT_POSITIONS
    .map((name, index) => ({ name, sortOrder: index + 1 }))
    .filter((item) => !existingNames.has(item.name.toLowerCase()));

  if (toCreate.length === 0) return;

  await prisma.position.createMany({
    data: toCreate.map((item) => ({
      workspaceId,
      name: item.name,
      sortOrder: item.sortOrder,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

async function main() {
  loadEnvLocal();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required (e.g. in .env.local).");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const passwordHash = await hash("password123", 12);

    const seedWorkspaceId = process.env.SEED_WORKSPACE_ID?.trim();
    let workspace;

    if (seedWorkspaceId) {
      workspace = await prisma.workspace.findUnique({
        where: { id: seedWorkspaceId },
      });
      if (!workspace) {
        throw new Error(
          `SEED_WORKSPACE_ID=${seedWorkspaceId} not found. Run: SELECT id, name FROM "Workspace";`,
        );
      }
      console.error(`[seed-test-users] Using existing workspace: ${workspace.name} (${workspace.id})`);
    } else {
      workspace = await prisma.workspace.findFirst({
        where: { name: "Spotcoin Test Workspace" },
      });

      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: {
            name: "Spotcoin Test Workspace",
            monthlyAllowance: 5,
            tokenValueNaira: 1000,
            timezone: "Africa/Lagos",
          },
        });
        console.error(
          `[seed-test-users] Created workspace "${workspace.name}" (${workspace.id}). Omit SEED_WORKSPACE_ID to always use this path.`,
        );
      } else {
        console.error(
          `[seed-test-users] Reusing existing workspace "${workspace.name}" (${workspace.id}).`,
        );
      }
    }

    await ensureDefaultPositions(prisma, workspace.id);

    const upsertUser = (email, name, role) =>
      prisma.user.upsert({
        where: { email },
        update: {
          name,
          role,
          passwordHash,
          workspaceId: workspace.id,
          deletedAt: null,
          coinsToGive: 5,
        },
        create: {
          email,
          name,
          role,
          passwordHash,
          workspaceId: workspace.id,
          coinsToGive: 5,
        },
      });

    await upsertUser("admin@test.com", "Admin User", "ADMIN");
    await upsertUser("employee-a@test.com", "Employee A", "EMPLOYEE");
    await upsertUser("employee-b@test.com", "Employee B", "EMPLOYEE");

    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ["admin@test.com", "employee-a@test.com", "employee-b@test.com"],
        },
      },
      select: { email: true, role: true, deletedAt: true },
    });

    console.log(
      JSON.stringify(
        {
          workspaceId: workspace.id,
          password: "password123",
          users,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
