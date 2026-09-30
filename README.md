# Discord Slash-Command Automation Dashboard

A real-world, production-ready Discord slash command automation platform featuring secure Ed25519 webhook verification, deferred interaction processing, AI issue classification (Google Gemini / Groq), second-channel notification mirroring, and an authenticated management dashboard.

---

## Architecture Diagram

```
                              ┌────────────────────────┐
                              │  Discord Client / App   │
                              └───────────┬────────────┘
                                          │ Slash Command / Component / Modal
                                          ▼
                            ┌────────────────────────────┐
                            │ Public Endpoint (Render)   │
                            │ POST /api/discord/interact │
                            └─────────────┬──────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │ Express Backend (TypeScript)               │
                   ├─────────────────────────────────────────────┤
                   │ 1. Raw Body Capture                        │
                   │ 2. Ed25519 Signature Verification           │
                   │ 3. Check Interaction Type                   │
                   │    - Type 1 (PING) ──► Return PONG {type:1} │
                   │    - Type 2/3/5    ──► Continue            │
                   └──────────────┬──────────────────────────────┘
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │ Idempotency Check (DB/Cache) │
                   │ Check interactionId unique   │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────┴──────────────────────────────┐
                   │ Fast Ack / Deferral Decision                │
                   │ Fast (/status): Inline Ack (Type 4)         │
                   │ Slow (/report): Defer Ack (Type 5)          │
                   └──────────────┬───────────────┘
                                  │
                   ┌──────────────┴──────────────────────────────┐
                   │ Background Command Processing Pipeline      │
                   ├─────────────────────────────────────────────┤
                   │ 1. Fetch Server & Command Config from DB    │
                   │ 2. Execute Command Business Logic           │
                   │ 3. Call AI Service (Gemini/Groq) if enabled │
                   │ 4. Persist CommandLog, Interaction, AI log  │
                   │ 5. Follow-up Discord Response (Webhook API) │
                   │ 6. Send Mirror Notification (2nd Channel)   │
                   └──────────────┬───────────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
     ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
     │  PostgreSQL   │    │ Discord REST  │    │  Admin Web    │
     │    (Neon)     │    │  & Webhooks   │    │  Dashboard    │
     └───────────────┘    └───────────────┘    └───────────────┘
                                                       ▲
                                                       │ Auth (Cookie/JWT)
                                                       │ REST API / Live Logs
                                                 ┌─────┴─────┐
                                                 │ React App │
                                                 │  (Vercel) │
                                                 └───────────┘
```

---

## Core Features & Capabilities

- **Secure Ed25519 Signature Verification**: Validates raw HTTP request body against Discord's public key using `X-Signature-Ed25519` and `X-Signature-Timestamp` headers.
- **3-Second SLA Compliance**: Fast commands (`/status`) respond inline with Type 4 (`CHANNEL_MESSAGE_WITH_SOURCE`). Slow commands (`/report`) immediately issue Type 5 (`DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`) and process background AI + mirror webhooks asynchronously.
- **Idempotency Protection**: Enforces database-level unique constraints on `interactionId` to prevent duplicate AI calls, duplicate database logs, or duplicate notification mirrors if Discord retries webhooks.
- **AI-Powered Report Classification**: Summarizes incoming user reports, assigns category tags, and tags priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) using Google Gemini or Groq, with a fail-open fallback mechanism.
- **Second-Channel Notification Mirroring**: Mirrors report alerts to a configured second Discord channel or Slack incoming webhook.
- **Interactive Discord Components**: Supports interactive Discord buttons (`[Resolve]`, `[Dismiss]`) and rich modal submit windows (`/report`).
- **Authenticated Admin Dashboard**: Real-time Overview metrics, filterable audit history logs, dynamic command behavior configuration toggles, and Discord server/channel management.

---

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Zod, Winston, TweetNaCl, Discord-Interactions
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Database**: PostgreSQL with Prisma ORM
- **AI Provider**: Google Gemini (`@google/generative-ai`) / Groq API
- **Deployment Targets**: Render (Backend), Vercel (Frontend), Neon (PostgreSQL)

---

## Local Setup & Development Guide

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- PostgreSQL database (Local or Neon)

### 2. Environment Setup
Clone the repository and copy the environment template:
```bash
cp .env.example .env
```

Fill in your database and Discord credentials in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/discord_dashboard?sslmode=disable"
DISCORD_APPLICATION_ID="your_discord_application_id"
DISCORD_PUBLIC_KEY="your_discord_public_key"
DISCORD_BOT_TOKEN="your_discord_bot_token"
DISCORD_GUILD_ID="your_test_guild_id"
AI_API_KEY="your_gemini_or_groq_api_key"
JWT_SECRET="super_secret_jwt_key_min_32_characters"
```

### 3. Database Migration & Prisma Client
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Running the Application Locally

Run backend and frontend concurrently:
```bash
npm run dev
```

Or run services individually:
```bash
# Backend (Port 5000)
npm run dev:server

# Frontend (Port 5173)
npm run dev:client
```

---

## Discord Developer Portal Configuration Guide

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications).
   - Create a **New Application** (e.g. `Automation Bot`).
   - Copy **Application ID** and **Public Key** into your `.env`.

2. **Bot Token & Privileged Intents**:
   - Navigate to **Bot** tab -> Click **Reset Token** -> Copy token to `DISCORD_BOT_TOKEN`.

3. **Invite Bot to Server**:
   - Navigate to **OAuth2** -> **URL Generator**.
   - Scopes: `bot`, `applications.commands`.
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`, `Read Message History`.
   - Open generated URL in browser and authorize into your test Discord server.

4. **Register Slash Commands**:
   Run the command registration script:
   ```bash
   npm --prefix server run register-commands
   ```

5. **Set Public Interaction Endpoint URL**:
   - Expose backend port 5000 using an HTTP tunnel (e.g., `ngrok http 5000` or deployed URL).
   - In Discord Developer Portal under **General Information** -> Set **Interactions Endpoint URL**:
     `https://<your-public-url>/api/discord/interactions`
   - Discord will send a test PING request; backend will respond with PONG `{ type: 1 }` and save the verified URL!

---

## Automated Testing

Run backend Jest test suite:
```bash
npm run test
```

Tests cover:
- Admin login, invalid credentials, unauthorized endpoint access
- Ed25519 signature verification with valid and invalid keypairs
- Discord PING (Type 1) -> PONG response
- Slash commands `/status` and `/report`
- Interaction idempotency protection
- AI service fallback behavior

---

## Evaluator Live Verification Checklist

1. **Login to Dashboard**: Navigate to `http://localhost:5173/login`. Login with `admin@example.com` / `admin123456`.
2. **Execute `/status`**: In Discord, run `/status`. Verify inline green operational status message.
3. **Execute `/report`**: In Discord, run `/report issue:"Checkout page payment failed"`. Observe immediate deferral acknowledgment followed by rich embed response with AI summary, category, priority, and `[Resolve]` / `[Dismiss]` buttons.
4. **Verify Second Channel Mirror**: Check configured 2nd Discord channel or Slack webhook for mirrored notification alert.
5. **Verify Audit Log in Dashboard**: Open Dashboard Audit Logs (`/dashboard/logs`) to verify recorded interaction log.
6. **Test UI Command Configuration**: Go to `/dashboard/commands` -> Toggle `Mirror Notification` or `AI Processing` OFF -> Run `/report` in Discord again -> Verify behavior dynamically changes!

---

## License
MIT License.
