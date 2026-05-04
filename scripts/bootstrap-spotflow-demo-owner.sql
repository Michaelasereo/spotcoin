-- One-time bootstrap: workspace "Spotflow Demo" + first ADMIN (password: password123)
-- Run in your Postgres SQL editor against the same DATABASE_URL as the deployed app.
-- After login, change the password at /dashboard/settings (Change password).

BEGIN;

INSERT INTO "Workspace" (id, name, "monthlyAllowance", "tokenValueNaira", timezone, "onboardingComplete", "createdAt")
VALUES ('ws_spotflow_demo', 'Spotflow Demo', 5, 1000, 'Africa/Lagos', false, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO "User" (
  id, email, name, "passwordHash", role, "workspaceId",
  "coinsToGive", "spotTokensEarned", "payoutStatus",
  "createdAt", "deletedAt"
)
VALUES (
  'usr_owner_michael',
  'asereopeyemimichael@gmail.com',
  'Michael Asere',
  '$2b$12$RxtfMReKvcVdpn8QKvcOPueXossUk1mAsG/riL4RQ0IXGcwwKA8HS',
  'ADMIN'::"Role",
  'ws_spotflow_demo',
  5, 0, 'PENDING'::"PayoutStatus",
  NOW(), NULL
)
ON CONFLICT (email) DO UPDATE SET
  name           = EXCLUDED.name,
  "passwordHash" = EXCLUDED."passwordHash",
  role           = 'ADMIN'::"Role",
  "workspaceId"  = EXCLUDED."workspaceId",
  "deletedAt"    = NULL;

COMMIT;

-- Sanity check:
-- SELECT u.email, u.role, u."workspaceId", w.name AS workspace
-- FROM "User" u JOIN "Workspace" w ON w.id = u."workspaceId"
-- WHERE u.email = 'asereopeyemimichael@gmail.com';
