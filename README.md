# Discord Slash-Command Automation Dashboard

A real-world Discord slash command automation platform featuring secure Ed25519 webhook verification, deferred interaction processing, AI issue classification (Google Gemini), second-channel notification mirroring, and an authenticated admin dashboard.

**Stack:** React 19 + Vite (dashboard) · Express + TypeScript (API) · PostgreSQL + Prisma · Google Gemini

---

## Table of Contents

- [Architecture](#architecture)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [First Login (no seed script)](#first-login-no-seed-script)
- [Discord Developer Portal Configuration](#discord-developer-portal-configuration)
- [API Reference](#api-reference)
- [How the Interaction Pipeline Works](#how-the-interaction-pipeline-works)
- [Dashboard Pages](#dashboard-pages)
- [Automated Testing](#automated-testing)
- [End-to-End Verification Checklist](#end-to-end-verification-checklist)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## Architecture

```
                              ┌────────────────────────┐
                              │  Discord Client / App   │
                              └───────────┬────────────┘
                                          │ Slash Command / Component / Modal
                                          ▼
                            ┌─────────────────────────────┐
                            │ Public Endpoint (Render)    │
                            │ POST /api/discord/          │
                            │      interactions           │
                            └──────────────┬──────────────┘
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     │ Express Backend (TypeScript)             │
                     ├───────────────────────────────────────────┤
                     │ 1. Raw body capture (express.json verify)│
                     │ 2. Ed25519 signature verification        │
                     │    - discord-interactions verifyKey()     │
                     │    - tweetnacl redundant fallback         │
                     │ 3. Interaction type routing               │
                     │    - Type 1 (PING) ─► PONG {type:1}      │
                     │      (never touches the database)        │
                     └──────────────┬──────────────────────────┘
                                    ▼
                     ┌──────────────────────────────┐
                     │ Idempotency Check             │
                     │ INSERT ProcessedInteraction   │
                     │ PK = Discord interaction ID  │
                     └──────────────┬───────────────┘
                                    │ P2002 ─► ephemeral "already processed"
                     ┌──────────────┴──────────────────────────────┐
                     │ Response-Type Decision                      │
                     │ /status          ─► Type 4 (inline, fast)  │
                     │ /report no args  ─► Type 9 (modal)         │
                     │ /report + issue  ─► Type 5 (deferred)      │
                     └──────────────┬──────────────────────────────┘
                                    │ setImmediate()
                     ┌──────────────┴──────────────────────────────┐
                     │ Background Pipeline (/report)               │
                     ├───────────────────────────────────────────┤
                     │ 1. Load CommandConfiguration from DB       │
                     │ 2. Honour `enabled` gate                   │
                     │ 3. Create CommandLog (PROCESSING)          │
                     │ 4. AI analysis if `aiProcessing` (Gemini)  │
                     │ 5. PATCH webhook @original if              │
                     │    `replyInDiscord`  (+ Resolve/Dismiss)   │
                     │ 6. Mirror alert if `mirrorNotification`    │
                     │ 7. CommandLog -> SUCCESS                    │
                     └──────────────┬──────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
      ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
      │  PostgreSQL   │     │ Discord REST  │     │  Admin Web    │
      │  (Neon/local) │     │  & Webhooks   │     │  Dashboard    │
      └───────────────┘     └───────────────┘     └───────────────┘
                                                     ▲
                                                     │ JWT (cookie + Bearer)
                                                     │ REST API
                                               ┌─────┴─────┐
                                               │ React App │
                                               │  (Vercel) │
                                               └───────────┘
```

---

## Core Features

- **Ed25519 Signature Verification** — Every interaction is verified against Discord's public key using the `X-Signature-Ed25519` and `X-Signature-Timestamp` headers over the **raw** request body (captured before JSON parsing). Verified by `discord-interactions`' `verifyKey()` with a redundant `tweetnacl` detached-signature check. Requests older than ±300s are rejected.
- **3-Second SLA Compliance** — Fast commands (`/status`) respond inline with Type 4. Slow commands (`/report`) immediately return Type 5 (`DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`) and finish via webhook `PATCH /webhooks/{app_id}/{token}/messages/@original`.
- **Idempotency Protection** — `ProcessedInteraction.id` is the Discord interaction ID and doubles as the primary key, so the unique insert *is* the duplicate check. A replay raises `P2002`, all side effects are skipped, and the user gets an ephemeral notice.
- **AI-Powered Report Classification** — Gemini returns strict JSON with a `summary`, `category`, and `priority` (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`). Fails open: a missing API key or any error falls back to a truncated summary with `category: General` and `priority: MEDIUM`, so the report pipeline never breaks.
- **Second-Channel Notification Mirroring** — Alerts can be mirrored to a separate Discord channel, with the send outcome persisted to `NotificationLog`.
- **Rich Discord Components** — `/report` opens a modal when invoked without arguments, and its follow-up embed carries `Resolve` / `Dismiss` buttons that update the original message (Type 7) and write the outcome to the audit log.
- **Authenticated Admin Dashboard** — Overview metrics, AI insight cards, filterable paginated audit logs with a raw-JSON detail modal, per-command behaviour toggles, and guild/channel settings.
- **Operational Hardening** — `helmet`, a 300 req/15 min rate limit on `/api/*`, Zod validation on all env and body input, structured Winston logging with secret redaction, `trust proxy` for correct per-IP limiting behind Render, and a DB reconnect monitor that recovers from Neon scale-to-zero.

---

## Tech Stack

**Backend** — Node.js 20+, Express 4, TypeScript 5.8, Zod, Winston, Helmet, `discord-interactions`, `tweetnacl`, `jsonwebtoken`, `bcryptjs`, `express-rate-limit`, `morgan`

**Frontend** — React 19, TypeScript 5.8, Vite 6, React Router 7, Tailwind CSS 3, `lucide-react`, axios

**Data & AI** — PostgreSQL via Prisma 6, `@google/generative-ai` (default model `gemini-2.5-flash`)

**Deployment** — Render (backend), Vercel (frontend), Neon (PostgreSQL)

> The dashboard is dark-theme only — there is no light mode or theme toggle.

---

## Project Structure

```
.
├── server/
│   ├── prisma/schema.prisma        # 8 models, 3 enums
│   ├── src/
│   │   ├── app.ts                  # Express wiring: helmet, CORS, rate limit, raw body, routes
│   │   ├── server.ts               # Boot sequence + graceful shutdown
│   │   ├── config/env.ts           # Zod env schema + prod config assertions
│   │   ├── routes/                 # auth, discord, dashboard, command, server
│   │   ├── controllers/            # request handlers
│   │   ├── middleware/             # discord_verify, auth, error, request_logger
│   │   ├── repositories/           # prisma client + data access (in-memory fallbacks)
│   │   ├── services/
│   │   │   ├── discord/            # interaction routing, command defs, handlers
│   │   │   │   ├── commands/       # status.command.ts, report.command.ts
│   │   │   │   └── components/     # button.handler.ts, modal.handler.ts
│   │   │   ├── ai/ai.service.ts    # Gemini classification + fail-open fallback
│   │   │   ├── notification.service.ts
│   │   │   └── provisioning.service.ts
│   │   └── scripts/register_commands.ts
│   └── tests/                      # signature, discord_endpoint, auth
├── client/
│   ├── src/
│   │   ├── App.tsx                 # Router + ProtectedRoute
│   │   ├── context/AuthContext.tsx
│   │   ├── api/axios_client.ts     # base URL + auth token interceptor
│   │   ├── components/             # Layout, StatusBadge, ErrorBoundary
│   │   ├── pages/                  # Login, Dashboard, Logs, Commands, Settings
│   │   └── utils/cn.ts
│   ├── vite.config.ts              # /api proxy + BACKEND_ env prefix
│   └── vercel.json                 # SPA fallback rewrite
└── .env.example
```

---

## Local Setup

### 1. Prerequisites

- Node.js >= 20
- npm >= 10
- A PostgreSQL database (local, Docker, or Neon)

### 2. Install dependencies

```bash
npm install
```

The repo uses npm workspaces (`server`, `client`), so a single root install covers both.

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in your database and Discord credentials — see [Environment Variables](#environment-variables).

### 4. Generate the Prisma client and apply the schema

```bash
npm run prisma:generate
npm run prisma:migrate
```

> There is no `prisma/migrations` folder in the repo. `prisma:migrate` runs `prisma migrate dev --name init`, which creates it on first run. For an existing database where you don't want a migration history, use `npm --prefix server run prisma:db:push` instead. `npm run prisma:studio` opens Prisma Studio.

### 5. Run

```bash
# Both concurrently
npm run dev
```

Or separately:

```bash
npm run dev:server   # Backend  -> http://localhost:5000
npm run dev:client   # Frontend -> http://localhost:5173
```

In development the Vite dev server proxies `/api` to `http://localhost:5000` (`client/vite.config.ts`), so no client-side URL configuration is needed.

### 6. Build

```bash
npm run build         # tsc for the server, then tsc && vite build for the client
```

If `client/dist` exists next to the server, the Express app serves it in `production` mode as a SPA fallback — useful for single-host deploys. On a split deploy (Vercel + Render) that folder won't be there and the catch-all stays disabled.

---

## Environment Variables

All server variables are validated by Zod in `server/src/config/env.ts` and **every one has a default**, so the server boots with an empty `.env`. Placeholder Discord values only work locally — `assertProductionDiscordConfig()` refuses to start a production process if `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `JWT_SECRET`, or `DATABASE_URL` are unset or still placeholders.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `PORT` | `5000` | |
| `DATABASE_URL` | local postgres fallback | **Must be set in production.** |
| `JWT_SECRET` | dev default | **Must be >= 32 chars in production.** Signs the admin token (7-day expiry). |
| `SESSION_SECRET` | dev default | Declared but currently unused. |
| `DISCORD_APPLICATION_ID` | placeholder | **Must be set in production.** |
| `DISCORD_PUBLIC_KEY` | 64 zeros | **Must be set in production**, 64 hex chars. |
| `DISCORD_BOT_TOKEN` | `''` | **Must be set in production.** |
| `DISCORD_GUILD_ID` | `''` | Set to register commands guild-scoped (instant) instead of globally (up to 1h propagation). |
| `DISCORD_PRIMARY_CHANNEL_ID` | `''` | Seeds the primary channel row on first boot. |
| `DISCORD_MIRROR_CHANNEL_ID` | `''` | Seeds the mirror channel row on first boot. |
| `AI_API_KEY` | `''` | Empty disables AI; reports fall back to a truncated summary. |
| `AI_MODEL` | `gemini-2.5-flash` | |
| `BACKEND_URL` | `http://localhost:5000` | Used for the startup log line. |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowlist, **comma-separated for multiple origins**. An HTTPS value switches admin cookies to `SameSite=None; Secure`. |
| `ALLOW_VERCEL_PREVIEWS` | `false` | Set to `true` to also allow any `*.vercel.app` origin. **Missing from `.env.example`.** |

### Client variable

| Variable | Used when | Notes |
| --- | --- | --- |
| `BACKEND_API_URL` | Production build | Full URL of the backend, e.g. `https://your-api.onrender.com`. Set it as a Vercel environment variable — it is **not** in `client/vercel.json`. Vite exposes it via `envPrefix: ['VITE_', 'BACKEND_']`. |
| `VITE_API_URL` | Fallback | Used only if `BACKEND_API_URL` is unset. |

Resolution order is `BACKEND_API_URL` → `VITE_API_URL` → `/api`. In a production build without either, the dashboard silently calls its own origin and requests 404; the error helper and `ErrorBoundary` both point this out.

---

## First Login (no seed script)

There is **no seed script and no default admin account**. `README`s that advertise `admin@example.com / admin123456` are wrong, and so would be any credentials baked into this repo.


The `AdminUser` table starts empty, and `AuthController.login` self-seeds: if the submitted email isn't found **and** `countAdmins() === 0`, the submitted password is bcrypt-hashed (cost 10) and an admin named `Initial Admin` is created. So:

1. Start the app, open `http://localhost:5173/login`.
2. Enter **any** valid email and a password of at least 6 characters.
3. That account becomes the first admin; subsequent logins must match it.

`POST /api/auth/register` is also unauthenticated and creates admins. Both routes are suitable for local development — restrict or remove them before exposing the app publicly.

---

## Discord Developer Portal Configuration

1. **Create the application** — [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**. Copy **Application ID** → `DISCORD_APPLICATION_ID` and **Public Key** → `DISCORD_PUBLIC_KEY`.

2. **Bot token** — **Bot** tab → **Reset Token** → copy to `DISCORD_BOT_TOKEN`. Resetting invalidates the previous token.

3. **Invite the bot** — **OAuth2** → **URL Generator**. Scopes `bot`, `applications.commands`. Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`, `Read Message History`, and `Use Application Commands`. Open the URL and authorise into your test server.

4. **Register the slash commands**

   ```bash
   npm --prefix server run register-commands
   ```

   With `DISCORD_GUILD_ID` set, this `PUT`s to the guild-scoped endpoint (visible immediately). Without it, registration is global and can take up to an hour to propagate.

   | Command | Options | Response |
   | --- | --- | --- |
   | `/report` | `issue` (string, optional) | Type 9 modal if omitted, otherwise Type 5 deferred |
   | `/status` | none | Type 4 inline |

   The dashboard's **Discord Settings** page also exposes this via `POST /api/discord/sync-commands`.

5. **Set the Interactions Endpoint URL** — expose port 5000 (e.g. `ngrok http 5000`, or your deployed URL) and set, under **General Information**:

   ```
   https://<your-public-url>/api/discord/interactions
   ```

   Discord validates the URL with a signed PING; the backend answers `{ type: 1 }` and Discord saves the URL. Note that `PING` is answered **before** any database access, so endpoint validation succeeds even while the database is down.

---

## API Reference

### Public

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Returns 200 with `database: connected`, or 503 with `database: unavailable`. `status` stays `"ok"` so platform health checks keep passing while the DB is down. |
| `POST` | `/api/discord/interactions` | Discord interactions endpoint. Requires valid Ed25519 signature headers. |
| `POST` | `/api/auth/login` | Sets the `admin_token` cookie, returns the token, and self-seeds the first admin when the table is empty. |
| `POST` | `/api/auth/register` | Creates an admin (unauthenticated). |
| `POST` | `/api/auth/logout` | Clears the cookie. |

### Admin-authenticated (`authenticateAdmin`)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/me` | Current admin profile (never returns `passwordHash`). |
| `POST` | `/api/discord/sync-commands` | Re-registers slash commands with Discord. |
| `GET` | `/api/dashboard/stats` | Overview counters and aggregates. |
| `GET` | `/api/dashboard/logs` | Paginated audit logs. Query: `page`, `limit`, `status`, `command`, `aiOnly`. |
| `GET` | `/api/commands/` | Command configurations with their behaviour toggles. |
| `PATCH` | `/api/commands/:id` | Updates `enabled`, `saveLogs`, `replyInDiscord`, `mirrorNotification`, `aiProcessing`. |
| `GET` | `/api/servers/` | Guilds and channels; seeds a default row from `DISCORD_GUILD_ID` when empty. |
| `POST` | `/api/servers/settings` | Persists guild name plus primary/mirror channel IDs. |

### Authentication

JWTs carry `{ id, email, role }` and expire after 7 days. The token is accepted either as the `admin_token` httpOnly cookie or as an `Authorization: Bearer` header — the client sends both, because browsers can block the third-party cookie between `vercel.app` and `onrender.com`.

### Rate limiting

300 requests per 15 minutes per IP, applied to `/api/*` — **including** `/api/discord/interactions`.

---

## How the Interaction Pipeline Works

**Routing** (`server/src/services/discord/interaction.service.ts`):

| Interaction type | Handler |
| --- | --- |
| 1 — PING | `{ type: 1 }` immediately; no DB access |
| 2 — Application command | `StatusCommandHandler` or `ReportCommandHandler` |
| 3 — Message component | `ButtonComponentHandler` → Type 7 `UPDATE_MESSAGE` |
| 5 — Modal submit | `ModalComponentHandler` → reuses the report pipeline |

**Idempotency.** Every non-PING interaction is inserted into `ProcessedInteraction` *before* any side effect. Because the Discord interaction ID is the primary key, a duplicate throws `P2002` and the pipeline returns an ephemeral `⚠️ This command interaction was already processed.` instead of re-running AI, logging, or mirroring. Note this is a notice, not a replay of the original response.

**`/status`** reads the cached DB-availability flag rather than querying, deliberately staying inside the 3-second budget, and fires logging as a detached promise after the response object is built.

**`/report`** honours the stored configuration in this order: `enabled` gate → `CommandLog` at `PROCESSING` → AI if `aiProcessing` → embed reply via the interaction webhook if `replyInDiscord` (colour-coded by priority, with `Resolve`/`Dismiss` buttons) → mirror post if `mirrorNotification` → `CommandLog` set to `SUCCESS`. The heavy work is deferred with `setImmediate()` so the Type 5 acknowledgement is instant.

**Gemini output** is requested as strict JSON with no Markdown fences; fences are stripped defensively before parsing, priority is validated against the enum (defaulting to `MEDIUM`), and missing fields degrade individually.

**Data model** (`server/prisma/schema.prisma`) — 8 models, 3 enums (`Role`, `CommandStatus`, `PriorityLevel`):

`AdminUser` · `DiscordServer` (PK = guild ID) · `DiscordChannel` (PK = channel ID) · `CommandConfiguration` (unique per `[serverId, commandName]`) · `ProcessedInteraction` (PK = interaction ID) · `CommandLog` (unique `interactionId`) · `AIResult` · `NotificationLog`

`ProcessedInteraction.token` is a live webhook credential, so it is stored in plaintext but excluded by an explicit column select in the log repository and never returned by the dashboard API. Winston redacts passwords, tokens, and API keys from log metadata.

---

## Dashboard Pages

| Route | Purpose |
| --- | --- |
| `/login` | Email + password form. Notes that the first valid login creates the admin account. |
| `/dashboard` | Overview: total commands, successful, AI summaries, notifications sent; AI insight cards; recent activity; manual refresh. |
| `/dashboard/logs` | Audit history — 15 per page, filter by command and status, detail modal with raw options JSON, AI result, and mirror outcome. |
| `/dashboard/commands` | Per-command toggles for `enabled`, `saveLogs`, `replyInDiscord`, `mirrorNotification`, and `aiProcessing` (report only), saved via `PATCH /commands/:id`. |
| `/dashboard/settings` | Guild name plus primary/mirror channel IDs, and a button to sync slash commands with Discord. |

All dashboard routes are wrapped in `ProtectedRoute`, which waits on `GET /auth/me` and redirects to `/login` if unauthenticated.

---

## Automated Testing

```bash
npm test          # or npm run test:server
```

Jest + ts-jest + supertest, 11 tests across 3 files:

| File | Coverage |
| --- | --- |
| `tests/signature.test.ts` | 401 on missing signature headers · 401 on an invalid signature · 200 `{ type: 1 }` on a genuinely nacl-signed body |
| `tests/discord_endpoint.test.ts` | PING → PONG · `/status` → Type 4 "System Operational" · `/report` with `issue` → Type 5 · `/report` without arguments → Type 9 modal · duplicate interaction ID → "already processed" |
| `tests/auth.test.ts` | 401 on unauthenticated `/api/dashboard/stats` · login response · 401 on wrong password |

Tests set `NODE_ENV=test`, which disables the replay-window check, skips `morgan`/request logging, and short-circuits the Discord webhook and mirror network calls. Signature tests supply real nacl keypairs; the interaction tests use the `x-bypass-signature` header.

**Not covered:** the AI service and its fallback path, Prisma repositories, and the button/modal component handlers.

---

## End-to-End Verification Checklist

1. **Log in** at `http://localhost:5173/login` with any email and a 6+ character password — the first login creates the admin.
2. **Run `/status`** in Discord and confirm the inline green "System Operational" message with bot, database, uptime, and environment.
3. **Run `/report issue:"Checkout page payment failed"`** — expect an instant deferral, then an embed with the AI summary, category, priority colour, and `Resolve` / `Dismiss` buttons.
4. **Open `/report` with no arguments** to confirm the modal path.
5. **Click `Resolve`** and confirm the original message updates and the audit log flips to `SUCCESS`.
6. **Check the mirror channel** for the mirrored alert.
7. **Review `/dashboard/logs`** and open a row's detail modal.
8. **Toggle behaviour at `/dashboard/commands`** — set `mirrorNotification` or `aiProcessing` off, run `/report` again, and confirm the behaviour changes. Setting `enabled` off makes `/report` reply that the command is disabled.

---

## Known Limitations

Worth knowing before deploying publicly:

- **First-admin self-seeding and open registration.** Any valid email becomes the initial admin, and `POST /api/auth/register` is unauthenticated. Remove or protect both for production.
- **Buttons are unauthenticated.** Anyone who can click `Resolve`/`Dismiss` in Discord updates the log status.
- **`saveLogs` is stored but never enforced.** The flag is editable in the UI and returned by the API, but no code path reads it — `CommandLog` rows are always written.
- **`/status` ignores all command configuration.** It never reads `CommandConfiguration`, so `enabled`/`saveLogs`/`replyInDiscord` have no effect on it. This differs from `AGENTS.md` rule 5.
- **Duplicate interactions are not replayed.** They receive a generic ephemeral notice rather than the original saved response (`AGENTS.md` rule 3).
- **`SESSION_SECRET` is unused** — declared in the env schema and `.env.example`, read nowhere.
- **`logout` clears the cookie without matching options** (`path`, `sameSite`, `secure`), so the browser may not actually drop it. The client's own token clear hides this.
- **The `tweetnacl` verification fallback is effectively dead.** It only works when `req.rawBody` is present; the `JSON.stringify` fallback body could never validate a real signature.
- **AI failure paths are untested**, and `gemini-2.5-flash` availability depends on your API key's access.
- **Client build artifacts** (`client/dist`) are committed and the server may serve them, which can shadow a fresher deploy.

---

## License

MIT License.