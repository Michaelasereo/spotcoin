# Spotcoin Product Requirements Document

## 1) Product Overview

Spotcoin is an internal employee recognition platform with a coin economy:
- Employees spend monthly `coinsToGive` to recognize peers.
- Recipients accumulate `spotTokensEarned` for year-end cash payout.
- Recognition works on web and Slack.
- Admins manage users, values, settings, analytics, and payout operations.

## 2) Objectives

- Increase frequent, values-aligned peer recognition.
- Provide transparent recognition history and team-level visibility.
- Keep token accounting accurate and auditable.
- Enable year-end payout workflow with minimal finance friction.

## 3) Non-Negotiable Business Rules

- `coinsToGive` is monthly spend budget for sending recognition.
- `spotTokensEarned` is cumulative received value for payout.
- Monthly reset refills `coinsToGive` only.
- Monthly reset must never mutate `spotTokensEarned`.
- Recognition send must be transactional:
  - sender `coinsToGive -= coinAmount`
  - recipient `spotTokensEarned += coinAmount`
  - create `Recognition`
  - create sender/recipient `CoinTransaction` rows
- Payout completion must:
  - create `PAYOUT` transaction (negative earned amount)
  - set `spotTokensEarned = 0`
  - set `payoutStatus = COMPLETED`

## 4) Users and Roles

- **Employee**: send recognition, view feed, view wallet/history.
- **Manager**: same as employee (can be expanded later).
- **Admin**: full employee features plus user management, workspace settings, analytics, payout processing, Slack configuration.

## 5) Scope and Architecture

Monorepo structure:
- `apps/web`: Next.js app (employee + admin UI)
- `apps/slack-bot`: Slack Bolt app
- `server`: Express API + scheduled jobs
- `packages/db`: Prisma schema + client
- `packages/types`: shared types/contracts
- `packages/api-client`: typed server client for web/slack-bot

## 6) Functional Requirements

### 6.1 Recognition Core
- Send recognition with recipient, message, company value, coin amount.
- Validation:
  - sender != recipient
  - sender/recipient same workspace
  - sender balance >= coin amount
  - value belongs to workspace
- Feed endpoint with pagination and sender/recipient/value metadata.
- User history endpoint filterable by direction, value, date range.

### 6.2 Wallet and Transactions
- Wallet shows:
  - current `coinsToGive` (with reset note)
  - current `spotTokensEarned` and estimated naira value
- Transaction history in reverse-chronological order with type and amount.

### 6.3 Monthly Reset
- Cron at 00:01 on day 1 (`Africa/Lagos`).
- Reset active users `coinsToGive = workspace.monthlyAllowance`.
- Insert `ALLOWANCE_GRANT` transaction per user.
- Never change `spotTokensEarned`.

### 6.4 Slack Integration
- OAuth install flow stores encrypted bot token.
- `/spotcoin` slash command opens recognition modal.
- Modal submit sends recognition through API and triggers notifications.
- App Home shows wallet summary and recent activity.
- Recognition Monday prompt job at 09:00 Mondays (`Africa/Lagos`) with schedule modes:
  - `EVERY_MONDAY`
  - `LAST_MONDAY`

### 6.5 Admin Features
- User management:
  - invite single user
  - bulk invite via CSV
  - change role
  - grant bonus coins
  - deactivate (soft delete)
- Workspace settings:
  - workspace name
  - monthly allowance
  - token naira value
  - values CRUD/toggle (active min 3, max 10)
  - Slack channel, schedule, timezone
- Analytics:
  - summary metrics
  - top senders/receivers
  - value counts
  - disengaged users (30-day inactivity)
  - interaction graph

### 6.6 Year-End Payout
- Open payout window.
- Payout ledger for users with pending status and earned tokens.
- Mark payout complete per user (transactional updates + email).
- CSV export for finance.

### 6.7 Onboarding
- First-run admin onboarding when no company values exist.
- Steps:
  1. Welcome
  2. Set values (min 3)
  3. Connect Slack (optional skip)
  4. Invite team (optional skip)
  5. Complete
- Persist completion with `workspace.onboardingComplete`.

## 7) API and Contract Requirements

- Standard response shape:
  - success: `{ data, meta? }`
  - error: `{ error, code, details? }`
- Validate all inputs with Zod.
- Use typed application errors for business violations.
- Never leak internal/DB error details in responses.

## 8) Security and Compliance

- Validate env vars at startup; fail fast on missing required values.
- Encrypt secrets with AES-256-GCM (`ENCRYPTION_KEY`).
- Decrypt Slack token only at point of use.
- Sanitize recognition messages before DB persistence.
- Enforce auth for protected routes and admin-only checks for admin routes.
- Add route-level rate limits on abuse-prone endpoints.

## 9) Reliability and Operations

- Structured logs for API and jobs.
- Job failures isolated per workspace.
- Health endpoint checks DB and Redis readiness.
- Graceful shutdown on SIGTERM/SIGINT.

## 10) Test Requirements

- Unit tests (Vitest) for service-layer rules with mocked Prisma.
- Required critical test areas:
  - recognition send validations + transaction behavior
  - monthly reset does not touch earned tokens
  - payout completion transactional updates
  - analytics disengagement/value counts
- E2E tests (Playwright):
  - employee sends recognition
  - admin invites user
  - admin marks payout complete

## 11) Delivery Plan (Execution Order)

### Phase 0 — Scaffold
- Monorepo setup, Prisma package, env validation, Express foundation.

### Phase 1 — Recognition Engine
- Recognition service/routes, user/workspace routes, monthly reset, auth/layout, employee pages.

### Phase 2 — Slack
- Slack app foundation, OAuth install flow, slash command + modal submit, App Home, notifications, Recognition Monday job.

### Phase 3 — Admin Dashboard
- User management, workspace settings, analytics page and APIs.

### Phase 4 — Year-End Payout
- Payout service/routes, payout admin page.

### Phase 5 — Polish
- Unit/e2e tests, production hardening, onboarding flow.

## 12) Explicit Out of Scope (Current Release)

- Public recognition marketplace or external partner rewards.
- Multi-currency payouts.
- Native mobile apps.
- Cross-workspace recognition.

## 13) Success Metrics

- Weekly active recognition senders.
- Total recognitions per month.
- Percentage of users with at least one recognition sent/received per month.
- Slack adoption rate (workspace connected + slash command usage).
- Payout completion rate and time-to-complete.
