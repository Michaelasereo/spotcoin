# SPOTCOIN — CURSOR BUILD PROMPTS
# Next.js only · Netlify deployment · No separate Express server
# Paste spotcoin_design_system.md content at the top of every
# UI prompt. Complete each phase fully before moving to the next.
# ================================================================


# ════════════════════════════════════════════════════════════════
# PHASE 0 — PROJECT SCAFFOLD
# ════════════════════════════════════════════════════════════════

## PROMPT 0.1 — Next.js App Setup

Create a new Next.js 14 App Router project called "spotcoin" with
TypeScript, TailwindCSS, and ESLint. Then install these packages:

```bash
npm install geist prisma @prisma/client zod next-auth@beta
npm install @slack/bolt @slack/web-api
npm install resend ioredis lucide-react
npm install @netlify/functions
npm install -D @types/node
```

Create this folder structure (do not create any files with content yet,
just the folders and empty index files):

```
spotcoin/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── dashboard/
│   ├── admin/
│   └── api/
│       ├── recognitions/
│       ├── users/
│       ├── workspace/
│       ├── admin/
│       └── slack/
│           ├── events/
│           ├── commands/
│           ├── interactions/
│           └── oauth/
├── components/
│   ├── ui/
│   ├── recognition/
│   ├── wallet/
│   ├── analytics/
│   └── admin/
├── lib/
│   ├── services/
│   ├── slack/
│   ├── auth.ts
│   ├── db.ts
│   ├── encryption.ts
│   └── env.ts
├── netlify/
│   └── functions/
├── prisma/
│   └── schema.prisma
└── public/
```

Create .env.local with these empty variables:
```
DATABASE_URL=
REDIS_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_STATE_SECRET=
RESEND_API_KEY=
ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create .env.example as a copy of .env.local.
Create .gitignore covering: .env.local, node_modules, .next, .netlify.


---


## PROMPT 0.2 — Tailwind & Design System Setup

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Set up the design system from above.

In app/globals.css, add ALL the CSS variables from the design system
under :root. Set body background to var(--bg-base) and color to
var(--text-primary). Set box-sizing border-box globally.

In tailwind.config.ts, add the theme extensions from the design system
(colors, fontFamily, borderColor). Enable the JIT compiler.

In app/layout.tsx:
- Import GeistSans and GeistMono from 'geist/font/sans' and 'geist/font/mono'
- Apply GeistSans as the default font via className on <html>
- Apply GeistMono variable for use in mono contexts
- Import globals.css
- Set metadata: title "Spotcoin", description "Peer recognition platform"
- dark theme meta tag: <meta name="color-scheme" content="dark">

In app/not-found.tsx, create a minimal dark 404 page matching the
design system. Plain text, no illustrations.

Do not build any pages or API routes yet.


---


## PROMPT 0.3 — Prisma Schema & Database Client

In prisma/schema.prisma, create this complete schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  EMPLOYEE
  MANAGER
  ADMIN
}

enum PayoutStatus {
  PENDING
  COMPLETED
}

enum CoinTransactionType {
  ALLOWANCE_GRANT
  RECOGNITION_SENT
  RECOGNITION_RECEIVED
  BONUS_GRANT
  PAYOUT
}

model Workspace {
  id                  String   @id @default(cuid())
  name                String
  monthlyAllowance    Int      @default(5)
  tokenValueNaira     Int      @default(1000)
  slackTeamId         String?  @unique
  slackBotToken       String?
  targetChannelId     String?
  recognitionSchedule String   @default("EVERY_MONDAY")
  timezone            String   @default("Africa/Lagos")
  onboardingComplete  Boolean  @default(false)
  createdAt           DateTime @default(now())
  users               User[]
  values              CompanyValue[]
  recognitions        Recognition[]
}

model User {
  id               String       @id @default(cuid())
  email            String       @unique
  name             String
  passwordHash     String
  avatarUrl        String?
  role             Role         @default(EMPLOYEE)
  workspaceId      String
  workspace        Workspace    @relation(fields: [workspaceId], references: [id])
  slackUserId      String?
  coinsToGive      Int          @default(5)
  spotTokensEarned Int          @default(0)
  payoutStatus     PayoutStatus @default(PENDING)
  lastActiveAt     DateTime?
  deletedAt        DateTime?
  createdAt        DateTime     @default(now())
  sentRecognitions     Recognition[] @relation("SentRecognitions")
  receivedRecognitions Recognition[] @relation("ReceivedRecognitions")
  coinTransactions     CoinTransaction[]

  @@index([workspaceId])
}

model CompanyValue {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  name        String
  emoji       String
  isActive    Boolean  @default(true)
  recognitions Recognition[]

  @@index([workspaceId])
}

model Recognition {
  id          String   @id @default(cuid())
  senderId    String
  sender      User     @relation("SentRecognitions", fields: [senderId], references: [id])
  recipientId String
  recipient   User     @relation("ReceivedRecognitions", fields: [recipientId], references: [id])
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  valueId     String
  value       CompanyValue @relation(fields: [valueId], references: [id])
  message     String
  coinAmount  Int
  slackTs     String?
  createdAt   DateTime @default(now())

  @@index([workspaceId])
  @@index([senderId])
  @@index([recipientId])
}

model CoinTransaction {
  id          String              @id @default(cuid())
  userId      String
  user        User                @relation(fields: [userId], references: [id])
  workspaceId String
  type        CoinTransactionType
  amount      Int
  referenceId String?
  createdAt   DateTime            @default(now())

  @@index([userId])
  @@index([workspaceId])
}

model SlackInstallation {
  id            String   @id @default(cuid())
  workspaceId   String   @unique
  slackTeamId   String   @unique
  botToken      String
  botUserId     String
  installedById String
  createdAt     DateTime @default(now())
}
```

Note: DIRECT_URL is needed for Neon (serverless Postgres). Add it to
.env.local and .env.example as DIRECT_URL=

In lib/db.ts, create and export a Prisma singleton:
```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Run: npx prisma generate
Do NOT run migrate yet — we need a real DATABASE_URL first.


---


## PROMPT 0.4 — Shared Utilities

In lib/env.ts, use Zod to validate all env vars on import.
If any required var is missing, throw with a clear message.
Export a typed `env` object used everywhere instead of process.env directly.

Required vars to validate:
DATABASE_URL, NEXTAUTH_SECRET, SLACK_SIGNING_SECRET, SLACK_STATE_SECRET,
ENCRYPTION_KEY, NEXT_PUBLIC_APP_URL.
Optional: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, RESEND_API_KEY, REDIS_URL.

In lib/encryption.ts, implement:
- encrypt(plaintext: string): string  — AES-256-GCM using ENCRYPTION_KEY
- decrypt(ciphertext: string): string

In lib/auth.ts, set up NextAuth v5 with:
- Credentials provider (email + password using bcryptjs)
- JWT strategy
- Session includes: id, email, role, workspaceId, name
- Callbacks that attach user DB fields to the session token

Export auth, signIn, signOut, and handlers from this file.

In app/api/auth/[...nextauth]/route.ts, export GET and POST from
the handlers in lib/auth.ts.

In lib/services/, create empty files for each service:
recognitionService.ts, userService.ts, workspaceService.ts,
analyticsService.ts, payoutService.ts.

Create lib/errors.ts with an AppError class:
```ts
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400
  ) { super(message) }
}
```

Create a helper lib/api.ts with:
- success<T>(data: T, meta?: object) — returns NextResponse JSON
- error(err: unknown) — catches AppError and ZodError, returns
  appropriate NextResponse with { error, code, details } shape.
  Never leaks Prisma internals.


# ════════════════════════════════════════════════════════════════
# PHASE 1 — CORE RECOGNITION ENGINE
# ════════════════════════════════════════════════════════════════

## PROMPT 1.1 — Recognition Service

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE — for context
only, no UI in this prompt]

In lib/services/recognitionService.ts, implement:

### send(senderId, input: SendRecognitionInput)
Validates:
- sender !== recipient (throw AppError)
- recipient exists in same workspace (throw AppError)
- sender coinsToGive >= input.coinAmount (throw AppError)
- valueId exists and is active in workspace (throw AppError)
- message.length >= 10 (throw AppError)

Runs prisma.$transaction():
1. Decrement sender.coinsToGive by coinAmount
2. Increment recipient.spotTokensEarned by coinAmount
3. Create Recognition record
4. Create two CoinTransaction rows:
   { userId: senderId, type: RECOGNITION_SENT, amount: -coinAmount }
   { userId: recipientId, type: RECOGNITION_RECEIVED, amount: coinAmount }
5. Update sender.lastActiveAt = new Date()

Returns the created recognition with sender, recipient, value included.

### getFeed(workspaceId, page, pageSize)
Returns paginated recognitions newest-first.
Include: sender {name, avatarUrl}, recipient {name, avatarUrl},
value {name, emoji}, coinAmount, message, createdAt.

### getUserHistory(userId, workspaceId, filters: {direction?, valueId?, from?, to?})
Returns recognitions filtered by direction (sent|received|both).

In app/api/recognitions/route.ts:
- POST: requireAuth → parse SendRecognitionSchema with Zod → call send
- GET: requireAuth → parse pagination query params → call getFeed

SendRecognitionSchema (Zod):
{ recipientId: string, message: string (min 10), valueId: string, coinAmount: number (min 1) }


---


## PROMPT 1.2 — User & Workspace API Routes

In lib/services/userService.ts implement:

getMe(userId): returns user with both balance fields + workspace name
searchUsers(workspaceId, query): search by name/email (for recipient picker),
  returns id, name, avatarUrl, email. Excludes deleted users.
invite(adminId, email, workspaceId): creates User with temp password,
  sends welcome email via Resend, returns created user.
grantBonusCoins(adminId, targetUserId, workspaceId, amount):
  - Increment coinsToGive
  - Create CoinTransaction BONUS_GRANT
deactivate(adminId, targetUserId, workspaceId):
  - Set deletedAt = new Date()
updateRole(adminId, targetUserId, workspaceId, role):
  - Update user.role

In lib/services/workspaceService.ts implement:
getValues(workspaceId): active CompanyValues
getWorkspace(workspaceId): workspace settings
updateWorkspace(adminId, workspaceId, data): patch workspace fields
createValue(adminId, workspaceId, data): add company value
updateValue(adminId, valueId, workspaceId, data): edit value
toggleValue(adminId, valueId, workspaceId): flip isActive

Add these API routes:
  GET  /api/users/me                    → getMe
  GET  /api/users/search?q=             → searchUsers (requireAuth)
  GET  /api/users/me/recognitions       → getUserHistory
  GET  /api/workspace/values            → getValues (requireAuth)
  GET  /api/admin/workspace             → getWorkspace (requireAdmin)
  PATCH /api/admin/workspace            → updateWorkspace (requireAdmin)
  POST /api/admin/users/invite          → invite (requireAdmin)
  PATCH /api/admin/users/[id]/bonus     → grantBonusCoins (requireAdmin)
  PATCH /api/admin/users/[id]/deactivate → deactivate (requireAdmin)
  PATCH /api/admin/users/[id]/role      → updateRole (requireAdmin)
  POST /api/admin/values                → createValue (requireAdmin)
  PATCH /api/admin/values/[id]          → updateValue (requireAdmin)

Create requireAuth and requireAdmin helper functions in lib/auth.ts
that wrap Next.js route handlers. requireAuth reads the NextAuth
session. requireAdmin additionally checks role === 'ADMIN'.


---


## PROMPT 1.3 — Netlify Scheduled Functions

In netlify/functions/monthly-reset.mts:
```ts
import type { Config } from "@netlify/functions"

export default async () => {
  // 1. Fetch all active workspaces
  // 2. For each workspace, get all active users (deletedAt null)
  // 3. For each user: set coinsToGive = workspace.monthlyAllowance
  // 4. Create CoinTransaction ALLOWANCE_GRANT for each user
  // 5. Log count of users reset
  // NEVER touch spotTokensEarned
}

export const config: Config = {
  schedule: "1 0 1 * *"  // 00:01 on the 1st of every month
}
```

In netlify/functions/recognition-monday.mts:
```ts
import type { Config } from "@netlify/functions"

export default async () => {
  // 1. Get all workspaces with slackTeamId set
  // 2. For each, check if today matches recognitionSchedule:
  //    EVERY_MONDAY: always (this runs every Monday via schedule)
  //    LAST_MONDAY: check if today is last Monday of month
  // 3. If matches: post Recognition Monday prompt to targetChannelId
  //    using the workspace's bot token (decrypt from SlackInstallation)
  // 4. Log each post. Catch per-workspace errors — one failure
  //    must not stop others.
}

export const config: Config = {
  schedule: "0 8 * * 1"  // 8:00 AM every Monday (UTC, = 9AM Lagos WAT)
}
```

Both functions import prisma from lib/db.ts. Both catch all errors
and log them — never crash silently.


# ════════════════════════════════════════════════════════════════
# PHASE 2 — UI: AUTH & EMPLOYEE DASHBOARD
# ════════════════════════════════════════════════════════════════

## PROMPT 2.1 — Login Page

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/(auth)/login/page.tsx.

Full-screen dark page, bg-[--bg-base].
Vertically centered content in a max-w-sm container.

Top: "🪙" emoji or a simple coin icon, followed by "Spotcoin" in
24px GeistSans bold, centered.

Below: a short tagline in --text-secondary, 13px.
"Recognise great work."

Form (no <form> element — use onClick handlers):
- Email input (full width, design system input style)
- Password input (full width, type password)
- "Sign in" button (full width, primary button style)

On error: show a red-bordered info banner below the form:
"Invalid email or password." — no toast, inline.

On success: redirect to /dashboard.

Show a loading spinner inside the Sign in button while submitting.
Spinner: a simple rotating border circle, CSS only, 16px, white.

No "forgot password", no "sign up" link — this is an invite-only
internal tool. Just the form.


---


## PROMPT 2.2 — Bottom Navigation & Dashboard Shell

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Create components/BottomNav.tsx — the fixed bottom navigation bar.
Use the exact pattern from the design system.

Nav items for employees:
  Home      → /dashboard        (House icon)
  Feed      → /dashboard/feed   (Activity icon)
  Recognise → /dashboard/recognise (Heart icon)
  Wallet    → /dashboard/wallet  (Wallet icon)

Nav items for admins: add:
  Admin     → /admin            (Settings icon)

Use usePathname() to determine active state.
Active = white icon + white label. Inactive = --text-tertiary.

Create app/dashboard/layout.tsx:
- Wraps all dashboard pages in a <main> with pb-24 (bottom nav space)
- Renders <BottomNav> at the bottom
- Max width: max-w-lg mx-auto
- Checks auth — redirect to /login if no session

Create app/admin/layout.tsx:
- Same as dashboard layout but also checks role === ADMIN
- Redirect to /dashboard if not admin


---


## PROMPT 2.3 — Home Page (Employee Dashboard)

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/dashboard/page.tsx.

This is a Server Component. Fetch the user's data server-side:
- Current user (name, coinsToGive, spotTokensEarned)
- Workspace (tokenValueNaira, name)

Layout (top to bottom, px-5):

1. Top bar: "Spotcoin" centered, 14px medium, border-b border-[--border].

2. Hero section (mt-6):
   - "LAGOS · [TODAY'S DATE]" — 11px uppercase tracking-widest
     --text-secondary. Date formatted as "25 APR 2026".
   - "Hey [FirstName]." — 34px bold --text-primary
   - "Recognise. Reward. Repeat." — 34px bold --text-secondary
   - Row of green badges below:
     If coinsToGive > 0: show "🪙 [N] coins to give"
     Always show current month name: "April active"

3. Wallet snapshot card (mt-6):
   Full-width card with two columns inside:
   Left:  "COINS TO GIVE" label + large number (coinsToGive)
          "resets 1st of month" in --text-tertiary xs
   Right: "SPOT-TOKENS" label + large number (spotTokensEarned)
          "≈ ₦[X,XXX] at year-end" in --accent xs
   Divider between columns: 1px vertical line in --border.

4. 2×2 grid of feature cards (mt-4, gap-3):
   Card 1: Activity icon    | "Feed"       | "See all recognitions"
   Card 2: Heart icon       | "Recognise"  | "Send a Spotcoin"
   Card 3: Wallet icon      | "My Wallet"  | "Tokens & history"
   Card 4: BarChart2 icon   | "Leaderboard"| "Top this month"
   Each card links to its route. Use the feature card pattern.

5. If coinsToGive === 0, show an info banner below the grid:
   "Your coins refill on the 1st. Check back soon."


---


## PROMPT 2.4 — Recognition Feed Page

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/dashboard/feed/page.tsx.

Page header: back arrow + "Feed" title.

Fetch GET /api/recognitions?page=1&pageSize=20 on load.

Render a scrollable list of recognition cards using the
recognition card pattern from the design system.
Gap between cards: gap-3 (12px). No dividers between cards.

Show a load more button at the bottom (ghost button style) if there
are more pages. Clicking it appends more cards.

Loading state: 5 skeleton cards — use animate-pulse on
bg-[--bg-card-2] blocks inside bg-[--bg-card] rounded-2xl cards.

Empty state: plain text centered, "--text-secondary", "No recognitions
yet. Be the first to recognise someone."

Each recognition card shows:
- Sender name → recipient name (bold names, → in --text-secondary)
- Time ago in --text-tertiary (e.g. "2h ago", "yesterday")
- Coin amount with 🪙 prefix, GeistMono
- Message in quotes
- Value pill (emoji + name)


---


## PROMPT 2.5 — Send Recognition Page

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/dashboard/recognise/page.tsx as a client component.

Page header: back arrow + "Recognise".

If user's coinsToGive === 0, show a full-page info state instead of
the form:
```
🪙
You've used all your coins this month.
They refill on the 1st. Come back then.
```
No form visible at all when balance is 0.

Otherwise show the form:

Step 1 — Recipient search:
  Label: "Who deserves a Spotcoin?" (--text-secondary, 13px)
  Input: search field, placeholder "Search by name..."
  As user types (debounced 300ms), call GET /api/users/search?q=
  Show results as a list below the input: each result is a row with
  name and email. Tap to select. Selected person shows as a green
  pill with their name and an ✕ to clear.

Step 2 — Value:
  Label: "What did they demonstrate?"
  Horizontal scrollable row of value pills.
  Unselected: bg-[--bg-card] border --border text-[--text-secondary]
  Selected: bg-[--accent-bg] border --accent-border text-[--accent]

Step 3 — Message:
  Label: "Tell them why"
  Textarea, 4 rows, design system input style.
  Character count shown bottom-right: "X / 280" in --text-tertiary
  Minimum 10 chars enforced.

Step 4 — Coin amount:
  Label: "How many coins?" + "You have [N] left" right-aligned
  Row of pill buttons: 1, 2, 3, 4, 5 (or up to user's balance)
  Selected coin pill: same green selected style as values.
  If balance = 1, only show "1". If balance = 0, this step hidden.

Send button (full width, primary): "Send Spotcoin 🪙"
Disabled until: recipient selected + value selected + message ≥ 10 chars.

On success:
  - Brief success state (no modal): replace form with
    "🎉 Spotcoin sent to [Name]!" and a "Send another" link.
  - POST to /api/recognitions


---


## PROMPT 2.6 — Wallet Page

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/dashboard/wallet/page.tsx.

Page header: back arrow + "My Wallet".

Section 1 — Balance cards (2 side by side):
Card 1 — Spotcoins to give:
  Label: "COINS TO GIVE" (11px uppercase tracking-widest --text-secondary)
  Number: coinsToGive in 40px bold GeistMono --text-primary
  Sub: "Resets 1st of month" --text-tertiary xs

Card 2 — Spot-tokens earned:
  Label: "SPOT-TOKENS EARNED" (same style)
  Number: spotTokensEarned in 40px bold GeistMono --accent (green!)
  Sub: "≈ ₦[X,XXX] at year-end" --text-secondary xs
  The Naira value = spotTokensEarned × tokenValueNaira, formatted with
  commas: ₦1,000 / ₦12,000 etc.

Section 2 — Transaction history:
Label: "HISTORY" (11px uppercase tracking-widest --text-secondary, mt-6)
Segmented control: "All" | "Received" | "Sent"

List of CoinTransaction rows. Each row:
  Left: icon (ArrowDownLeft for received green, ArrowUpRight for sent grey)
        + description ("From Ade · Ownership", "To Temi · Innovation")
  Right: amount in GeistMono
    Received: "+3" in --accent
    Sent: "−2" in --text-secondary
  Date below description in --text-tertiary xs

Fetch from GET /api/users/me/recognitions. Empty state: plain text.


# ════════════════════════════════════════════════════════════════
# PHASE 3 — SLACK INTEGRATION
# ════════════════════════════════════════════════════════════════

## PROMPT 3.1 — Slack Route Handlers

In app/api/slack/events/route.ts (PUBLIC ROUTE — no auth middleware):
Handle Slack event subscriptions. Use @slack/bolt's receiver pattern
adapted for Next.js edge/serverless. On app_home_opened event,
publish the App Home view.

In app/api/slack/commands/route.ts (PUBLIC ROUTE):
Handle POST from Slack slash commands.
- Verify Slack signature using SLACK_SIGNING_SECRET.
- ack() pattern: immediately return 200, process async.
- /spotcoin command: look up user by slackUserId, open recognition modal.

In app/api/slack/interactions/route.ts (PUBLIC ROUTE):
Handle Slack modal submissions and button clicks.
- Verify signature.
- On submit_recognition callback: validate → call recognitionService.send
  → post to channel → DM recipient → ephemeral confirmation to sender.
- Slack API failures do NOT roll back the DB write. Log and continue.

In app/api/slack/oauth/callback/route.ts (PUBLIC ROUTE):
- Exchange code for bot token using Slack API.
- Encrypt token using encryption.ts.
- Upsert SlackInstallation record.
- Redirect to /admin/settings?slack=connected.

In lib/slack/ create:
- tokenStore.ts: getTokenForTeam(slackTeamId) — decrypt and return bot token
- messageBuilder.ts: all Block Kit message builders (see design system
  Slack templates in .cursorrules)
- verifySignature.ts: verify Slack request signatures

Important: In Next.js API routes, all Slack handlers must:
1. Return 200 immediately (Slack's 3-second rule)
2. Use waitUntil() if available, or fire-and-forget async for slow work


---


## PROMPT 3.2 — App Home Tab & Notifications

In lib/slack/homeView.ts, build the Slack App Home tab view as a
pure function returning Block Kit blocks.

App Home shows:
Section 1: Wallet
  "🪙 Your Spotcoin Wallet"
  Two fields: Coins to Give: N | Spot-tokens Earned: N
  "≈ ₦X,XXX at year-end" below spot-tokens

Section 2: Recent recognitions (last 3)
  Each as a context block: sender → recipient · value emoji · N coins

Section 3: Action button
  "Recognise someone 🪙" → opens recognition modal

In lib/slack/notifier.ts implement:
sendRecipientDM(recognition, sender, recipient, value, workspace)
  - Look up bot token for workspace
  - DM recipient using buildRecipientDM() message
  - Wrap in try/catch. Log failures. Never throw.

sendPublicPost(recognition, sender, recipient, value, workspace)
  - Post to workspace.targetChannelId
  - Wrap in try/catch. Log failures. Never throw.

sendMonthlyRefillDM(user, workspace) — DM refill notification
sendLowBalanceDM(user, workspace) — DM when coinsToGive hits 1

Call sendLowBalanceDM from recognitionService.send() AFTER the
transaction commits, if sender's new balance === 1.
Never call notifier functions inside a prisma.$transaction() block.


# ════════════════════════════════════════════════════════════════
# PHASE 4 — ADMIN DASHBOARD
# ════════════════════════════════════════════════════════════════

## PROMPT 4.1 — Admin Users Page

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/admin/users/page.tsx.

Page header: "Team" (no back arrow — this is a top-level admin page).

Top bar (below header):
  Left: "X members" in --text-secondary
  Right: "Invite" ghost button → opens invite modal

User list: stacked list row cards (full width, gap-2).
Each row:
  Left: avatar circle (initials fallback, 32px, bg-[--bg-card-2])
        + name (14px medium) + email (12px --text-secondary)
  Right: role pill (neutral badge style) + three-dot menu button

Three-dot menu (opens a small dropdown card):
  "Grant bonus coins"
  "Change role"
  "Deactivate"

Invite modal (bottom sheet style, slides up from bottom):
  Title: "Invite someone"
  Email input
  "Send invite" primary button (full width)
  Sends POST /api/admin/users/invite

Grant bonus coins modal:
  "How many bonus coins?" label
  Number input (1–50)
  "Reason" text input (optional)
  "Grant" primary button

Show a green toast notification on success for all actions.
Toast: slides up from bottom above the nav, auto-dismisses in 3s.
Style: bg-[--bg-overlay] border border-[--border-mid] rounded-2xl
px-4 py-3 text-sm text-[--text-primary].


---


## PROMPT 4.2 — Admin Settings Page

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/admin/settings/page.tsx.

Page header: "Settings".

Sections rendered as stacked list row cards grouped under section headers.
Section header: 11px uppercase tracking-widest --text-secondary, mb-2.

Section: General
  "Monthly coins per person" row → opens edit modal (number input)
  "Token value (₦ per Spot-token)" row → opens edit modal
  "Workspace name" row → opens edit modal

Section: Company Values
  Each value as a list row: emoji + name, toggle right side (on/off)
  "Add value" row at bottom → opens add modal
  Modal: emoji picker (simple grid of 20 common emojis) + name input.
  Max 10 active values — show warning if at limit.

Section: Slack
  "Slack workspace" row → shows Connected/Not connected status badge
  If not connected: "Connect Slack" primary button
  If connected: show team name in green badge
  "Recognition channel" row → edit channel ID
  "Recognition Monday" row → segmented control: Every Monday / Last Monday

Section: Danger
  "Export all data" → downloads CSV (calls GET /api/admin/export)
  Style this row in --error colour text.

All settings save on modal confirm, not on blur.
Show save loading state inside each modal's save button.


---


## PROMPT 4.3 — People Analytics Page

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/admin/analytics/page.tsx.

Page header: "Analytics".
Period selector (segmented control): "This month" | "Last month" | "Year"

Section 1 — Summary stats (2×2 grid of stat cards):
  Total recognitions | Total coins given
  Active employees   | Avg per person

Stat card pattern:
```tsx
<div className="bg-[--bg-card] border border-[--border] rounded-2xl p-4">
  <p className="text-[10px] uppercase tracking-widest text-[--text-secondary]">
    {label}
  </p>
  <p className="text-3xl font-bold font-mono text-[--text-primary] mt-1">
    {value}
  </p>
</div>
```

Section 2 — Leaderboard:
Segmented control: "Top senders" | "Top receivers"
List of top 10 users. Each row:
  Rank number (GeistMono, --text-tertiary) + name + count on right
  Top 3 get a subtle green left border accent on the card.

Section 3 — Values breakdown:
Label: "BY VALUE"
For each company value: a row showing value name + emoji + recognition
count + a simple progress bar. Bar uses bg-[--bg-card-2] track and
bg-[--text-primary] fill. Widest bar = 100% fill.

Section 4 — Disengagement flags:
Label: "NEEDS ATTENTION" in --warning colour (amber).
List of users with 0 activity in 30+ days. Each row shows
name + "Last active X days ago". "Nudge" ghost button on right
→ sends a Slack DM to that user.
If empty: "Everyone's active 🎉" in --text-secondary.


---


## PROMPT 4.4 — Year-End Payout Page

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/admin/payout/page.tsx.

Page header: "Year-End Payout".

State A — Payout window NOT open:
  Summary card:
    "Total Spot-tokens across team" + large number
    "Total projected payout" + "₦X,XXX,XXX" in --accent
  Info banner: "Opening the payout window notifies your team and
    generates the Finance CSV. This action cannot be undone."
  "Open Payout Window" primary button (full width, centered).
  Clicking shows a confirmation bottom sheet:
    "Open payout window for [Year]?"
    "This will allow Finance to process ₦X,XXX,XXX across X employees."
    "Confirm" primary button + "Cancel" ghost button

State B — Payout window OPEN:
  Progress bar card:
    "X of Y employees paid out"
    Progress bar: bg-[--bg-card-2] track, bg-[--accent] fill, rounded-full
  "Export CSV" ghost button top-right → GET /api/admin/payout/export-csv

  Employee list: stacked list rows.
  Each row:
    Left: name + email
    Right: "₦X,XXX" in GeistMono + status badge
      PENDING: neutral badge "pending"
      COMPLETED: green badge "paid"
    "Mark paid" ghost button (visible only for PENDING rows)
    Clicking "Mark paid" → confirmation: "Confirm ₦X,XXX payment to [Name]?"
    On confirm → PATCH /api/admin/payout/[userId]/complete

  When ALL employees are COMPLETED:
    Replace list with: "Payout complete 🎉" centered text in --accent.


# ════════════════════════════════════════════════════════════════
# PHASE 5 — ONBOARDING & POLISH
# ════════════════════════════════════════════════════════════════

## PROMPT 5.1 — Admin Onboarding Flow

[PASTE FULL CONTENTS OF spotcoin_design_system.md HERE]

Build app/admin/onboarding/page.tsx.

A 4-step flow. Shows when workspace.onboardingComplete === false.
Step indicator at top: 4 dots, active dot is white, others are
bg-[--bg-card-2]. No numbers.

Step 1 — Welcome:
  Large 🪙 centered.
  "Welcome to Spotcoin" — 28px bold.
  3-line explanation of the product:
  "Every month your team gets 5 Spotcoins to send to colleagues.
   Coins received become Spot-tokens. At year-end, each token
   is worth ₦1,000 in cash."
  "Get started →" primary button full width.

Step 2 — Company values:
  "What does your team stand for?"
  Pre-filled suggestions as toggleable pills:
  Ownership, Collaboration, Innovation, Customer First, Excellence,
  Integrity, Speed, Quality.
  User can toggle each on/off.
  Text input to add a custom value + emoji picker.
  "Must add at least 3" shown as helper text.
  "Continue →" button, disabled until 3+ selected.

Step 3 — Connect Slack (optional):
  "Bring Spotcoin into Slack"
  Short description of Slack benefits.
  "Connect Slack" primary button → starts OAuth.
  "Skip for now" link below (--text-secondary, underline).

Step 4 — Invite your team:
  "Who's on your team?"
  Textarea: one email per line.
  "Send invites" primary button.
  On success: "X invites sent" green badge appears.
  "Go to dashboard →" button → /admin, sets onboardingComplete = true.


---


## PROMPT 5.2 — Payout API Routes

Add these API routes in app/api/admin/payout/:

GET  /api/admin/payout          → getPayoutLedger (requireAdmin)
POST /api/admin/payout/open     → openPayoutWindow (requireAdmin)
PATCH /api/admin/payout/[userId]/complete → markPayoutComplete (requireAdmin)
GET  /api/admin/payout/export-csv → generatePayoutCSV (requireAdmin)

In lib/services/payoutService.ts implement:

openPayoutWindow(adminId, workspaceId):
  Returns all users with spotTokensEarned > 0, their nairaValue.

getPayoutLedger(workspaceId):
  Returns users with payoutStatus PENDING and spotTokensEarned > 0.

markPayoutComplete(adminId, targetUserId, workspaceId):
  prisma.$transaction():
    1. Create CoinTransaction { type: PAYOUT, amount: -spotTokensEarned }
    2. Set spotTokensEarned = 0
    3. Set payoutStatus = COMPLETED
  Send confirmation email via Resend to the employee.

generatePayoutCSV(workspaceId):
  Returns CSV string: Name,Email,Spot-tokens,Naira Value
  Set Content-Disposition: attachment; filename="spotcoin-payout.csv"


---


## PROMPT 5.3 — Analytics API Route

In app/api/admin/analytics/route.ts (requireAdmin):
GET with ?period=this_month|last_month|ytd query param.

In lib/services/analyticsService.ts implement:
getAnalytics(workspaceId, period):
Returns:
  summary: { totalRecognitions, totalCoinsGiven, activeUsers, avgPerUser }
  leaderboard: top 10 senders + top 10 receivers
  valueCounts: [{ valueId, name, emoji, count }]
  disengaged: users with 0 activity in last 30 days
    (0 sent AND 0 received)


---


## PROMPT 5.4 — Error Handling & Loading States

Add these across the app:

1. In every page that fetches data, add a loading.tsx sibling:
   5 skeleton cards using animate-pulse on bg-[--bg-card-2] blocks
   inside bg-[--bg-card] rounded-2xl containers.

2. In every page that fetches data, add an error.tsx sibling:
   "Something went wrong." centered in --text-secondary.
   A "Try again" ghost button that calls router.refresh().

3. Global error toast system:
   Create components/ui/Toast.tsx — a context-based toast provider.
   Toasts slide up from bottom (above nav), auto-dismiss after 3s.
   Types: success (green border), error (red border), info (default).
   Add ToastProvider to app/layout.tsx.

4. Auth error page: app/(auth)/error/page.tsx
   Plain dark page: "Session expired. Please sign in again."
   Link back to /login.

5. Network-offline banner:
   Thin banner at very top of page (above everything):
   bg-[--warning] text-black text-xs text-center py-1.5
   "You're offline. Some features may not be available."
   Shown only when navigator.onLine === false.
   Hide when back online. Client component only.


# ════════════════════════════════════════════════════════════════
# NETLIFY DEPLOYMENT CHECKLIST
# Run these in order after all phases are complete.
# ════════════════════════════════════════════════════════════════

## PROMPT 6.1 — Netlify Config

Create netlify.toml in the project root:
```toml
[build]
  command = "npx prisma generate && next build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

Install the Netlify Next.js plugin:
  npm install -D @netlify/plugin-nextjs

In next.config.ts add:
```ts
const nextConfig = {
  output: 'standalone',
}
```

Create a deploy checklist comment in netlify.toml:
# Before deploying set these env vars in Netlify dashboard:
# DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (prod URL)
# SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET
# SLACK_STATE_SECRET, RESEND_API_KEY, ENCRYPTION_KEY
# NEXT_PUBLIC_APP_URL (prod URL)

## Database (Neon)
# 1. Create account at neon.tech
# 2. Create a new project called "spotcoin"
# 3. Copy the Connection string → DATABASE_URL
# 4. Copy the Direct connection string → DIRECT_URL
# 5. Run: npx prisma migrate deploy

## Redis (Upstash) — optional, for rate limiting
# 1. Create account at upstash.com
# 2. Create a Redis database (free tier)
# 3. Copy REST URL → REDIS_URL


# ════════════════════════════════════════════════════════════════
# QUICK REFERENCE
# ════════════════════════════════════════════════════════════════

# Dev:
#   npm run dev
#
# Generate Prisma client after schema changes:
#   npx prisma generate
#
# Create a migration (local dev with real DB):
#   npx prisma migrate dev --name describe_change
#
# Deploy migrations to production:
#   npx prisma migrate deploy
#
# Open Prisma Studio (local DB browser):
#   npx prisma studio
#
# Generate a random ENCRYPTION_KEY:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#
# Generate a random NEXTAUTH_SECRET:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#
# Generate SLACK_STATE_SECRET (same command):
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
