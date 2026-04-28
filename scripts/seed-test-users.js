const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

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

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hash("password123", 12);

    let workspace = await prisma.workspace.findFirst({
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
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
