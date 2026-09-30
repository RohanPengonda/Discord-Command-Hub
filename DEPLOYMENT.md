# Deployment Guide — Vercel (frontend) + Render (backend) + Neon (database)

Target architecture:

```
Browser ──> Vercel (client, static SPA)  ──HTTPS──>  Render (Express API)  ──>  Neon Postgres
                    │                                          │
                    └── cookie auth (SameSite=None;Secure) ──┘
                                                      │
Discord ──HTTPS──> https://<backend>.onrender.com/api/discord/interactions
```

Deploy order matters because each service needs the other's URL.
**Render first → Vercel second → set `FRONTEND_URL` on Render → set the Discord endpoint.**

---

## 0. Prerequisites

| Item | Status |
| --- | --- |
| Neon Postgres database | Done. `DATABASE_URL` points at `ep-...-pooler.c-7.us-east-2.aws.neon.tech/neondb` |
| Prisma tables created | Done. `npx prisma db push` applied; all 8 tables exist |
| Neon dashboard access | Needed — to copy the connection string |
| GitHub account + repo | **Required.** This folder is not a git repository yet |
| Vercel account | Free tier is enough |
| Render account | Free tier works, but see the warning in §2 |

### 0.1 Push the code to GitHub

Render and Vercel both build from a Git repository. Create an empty GitHub repo, then:

```bash
cd F:\Projects\discord-automation-dashboard
git init
git add .
git status          # confirm .env is NOT listed
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.gitignore` already excludes `.env`, `node_modules`, and `dist`, so your bot token
and secrets will not be committed. Double-check with `git status` before committing.

---

## 1. Neon database

Your database is already created and migrated, so there is nothing to do. Two things to confirm:

1. **Copy the pooled connection string.** In the Neon console: *Connect* → the **Pooled connection**
   (`...-pooler...`) is the correct one for a deployed app; it survives IP changes and scales.
2. Your local `DATABASE_URL` already works. Use the exact same value on Render.

> If you ever see `prepared statement "s0_..." already exists` in Render logs, append
> `&pgbouncer=true&connection_limit=1` to the URL. Neon runs PgBouncer in transaction mode.

---

## 2. Render — backend (do this first)

1. Go to <https://dashboard.render.com> → **New +** → **Web Service** → connect your GitHub repo.
2. Fill in the settings:

| Field | Value |
| --- | --- |
| Name | `discord-automation-api` (gives you `discord-automation-api.onrender.com`) |
| Root Directory | **`server`** |
| Runtime | Node |
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Instance Type | See warning below |

> **Root Directory must be `server`.** The repo root is an npm workspace monorepo
> (`workspaces: ["server", "client"]`); building from the root produces a layout Render
> cannot start.

3. **Environment Variables** — click *Add* for each:

| Key | Value | Notes |
| --- | --- | --- |
| `NODE_VERSION` | `22.x` | Prisma 6 + Vite 6 need modern Node |
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | your Neon pooled URL | **Secret** |
| `JWT_SECRET` | a new random 32+ char string | **Secret.** Do not reuse the dev value |
| `SESSION_SECRET` | a new random string | **Secret** |
| `DISCORD_APPLICATION_ID` | `1554393200142065694` | From Discord → General Information |
| `DISCORD_PUBLIC_KEY` | your 64-char hex key | From Discord → General Information → Public Key |
| `DISCORD_BOT_TOKEN` | your bot token | **Secret.** Discord → Bot → Reset Token |
| `DISCORD_GUILD_ID` | `1554394371917353040` | Keeps commands guild-scoped (instant) |
| `DISCORD_PRIMARY_CHANNEL_ID` | `1554395984157614110` | |
| `DISCORD_MIRROR_CHANNEL_ID` | `1554396626058092554` | |
| `AI_PROVIDER` | `gemini` | |
| `AI_API_KEY` | your Gemini/Groq key | **Secret** |
| `SLACK_WEBHOOK_URL` | *(optional)* | Leave blank if unused |
| `BACKEND_URL` | `https://discord-automation-api.onrender.com` | Replace with your real service name |
| `FRONTEND_URL` | `https://placeholder.vercel.app` | **Update in step 4** once Vercel exists |
| `ALLOW_VERCEL_PREVIEWS` | `false` | Set `true` only if you want Vercel preview URLs to work |

Do **not** set `PORT`. Render injects it automatically and the app reads it from `process.env`.

4. Click **Create Web Service** and wait for the deploy to go green.

### Free tier warning (important)

Render's free tier **sleeps after ~15 minutes idle** and takes roughly 30–60 seconds to wake.
Discord requires a reply within **3 seconds**. Consequence: while the service is asleep,
`/report` and `/status` will fail with *"The application did not respond."*

For a reliable bot, use a **paid instance** (Starter, $7/mo). The free tier is fine for
developing the dashboard UI, but expect intermittent Discord failures.

The dashboard UI itself still works on the free tier — it just takes a few seconds to wake.

### 2.1 Verify the backend

Open `https://<your-service>.onrender.com/health`. Expect:

```json
{ "status": "ok", "env": "production", "service": "discord-automation-backend" }
```

If the deploy failed, check Render's logs. `assertProductionDiscordConfig()` now aborts
the boot with an explicit list of missing or placeholder credentials — that is intentional.

---

## 3. Vercel — frontend

1. Go to <https://vercel.com/new> → import the same GitHub repo.
2. Configure the project:

| Field | Value |
| --- | --- |
| Framework Preset | **Vite** |
| Root Directory | **`client`** |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

> **Root Directory must be `client`.** Same monorepo reason as Render. If you leave it at
> the repo root, Vercel will try to build the server too and fail.

3. **Environment Variables** — add one:

| Key | Value |
| --- | --- |
| `VITE_API_URL` | `https://discord-automation-api.onrender.com/api` |

Note the trailing `/api`. The client calls `api.get('/commands')`, so the base URL must
include `/api`. Without this variable the client falls back to the relative path `/api`,
which resolves against the Vercel domain and 404s.

4. Click **Deploy**. Note the URL, e.g. `https://discord-automation-dashboard.vercel.app`.

---

## 4. Wire the two together

You now have the Vercel URL. Go back to **Render → your service → Environment**, and update:

| Key | Value |
| --- | --- |
| `FRONTEND_URL` | `https://discord-automation-dashboard.vercel.app` |

Then click **Save & Redeploy**. This step is mandatory, not optional: CORS only permits the
origins listed in `FRONTEND_URL`, so until it matches your Vercel URL the browser blocks
every API call and the dashboard stays empty.

To allow Vercel's random preview URLs (each PR gets a unique subdomain), set
`FRONTEND_URL` to your production URL and `ALLOW_VERCEL_PREVIEWS=true`.

---

## 5. Point Discord at the backend

1. In the Render service, **wake it up** first — visit `https://<backend>/health` and wait
   for `ok`. Discord validates the endpoint by sending a signed PING and will refuse to
   save a cold endpoint.
2. Go to <https://discord.com/developers/applications> → your app → **General Information**.
3. Set **Interactions Endpoint URL**:

   ```
   https://discord-automation-api.onrender.com/api/discord/interactions
   ```

4. Click **Save Changes**. Discord immediately sends a test PING; a green checkmark and
   *"Saved"* confirm the Ed25519 handshake works.
5. Register the slash commands. Run this once from your machine (it talks to Discord's API
   directly — the backend does not need to be running):

   ```bash
   npm --prefix server run register-commands
   ```

   Because `DISCORD_GUILD_ID` is set, `/report` and `/status` appear in your server's
   autocomplete within seconds. (Global registration, without a guild ID, can take up to an hour.)

---

## 6. First login

1. Open the Vercel URL, go to the login page.
2. Sign in with your existing admin (`admin@example.com`).
3. `/dashboard/commands` should list **/report** and **/status**.
4. In Discord `#bot-command`, run `/status` — you should get an embed back.

At startup the backend provisions a `discord_servers` row plus one `command_configurations`
row per registered command, so the Commands page is populated even before anyone runs a
command. Admin toggles are never overwritten by re-provisioning.

---

## 7. Updating after changes

Both platforms redeploy automatically on push to the branch you connected.

```bash
git add .
git commit -m "Describe the change"
git push
```

If you add a new slash command to `server/src/services/discord/command_definitions.ts`,
the Commands page picks it up after the next deploy. Register it with Discord using
`npm --prefix server run register-commands` when you are on your machine.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| *"The application did not respond"* | Discord cannot reach the backend, **or** the Render free instance is asleep | Use a paid instance; visit `/health` before using the bot |
| Same error, paid instance | `DISCORD_PUBLIC_KEY` wrong, or URL missing `/api/discord/interactions` | Compare the key against the Discord portal; check the path |
| Dashboard shows no commands | `FRONTEND_URL` on Render does not match the Vercel URL | Update it and redeploy (§4) |
| Login spinner, then 401 | Same-site cookie rejected | `FRONTEND_URL` must be the exact `https://` origin; the cookie is `SameSite=None; Secure`, so both sites must be HTTPS |
| CORS error in the browser console | Origin not in the allowlist | Check the exact origin, including scheme and any trailing slash |
| Render logs `prepared statement ... already exists` | Neon pooled endpoint + Prisma | Append `&pgbouncer=true&connection_limit=1` to `DATABASE_URL` |
| Vercel build fails | Root Directory left at repo root | Set Root Directory to `client` |
| Render build fails on start | Root Directory left at repo root | Set Root Directory to `server` |
| Commands absent in Discord | Registration not run for that guild | `npm --prefix server run register-commands` |
| `429 Too many requests` | Rate limit of 300 requests / 15 min per IP | Expected during heavy local testing; wait for the window to reset |

---

## Security notes

- `.env` is gitignored; secrets live only in Render's environment settings.
- `JWT_SECRET` on Render must be **different** from your local `.env` value, otherwise a
  token minted locally would be valid in production.
- The admin cookie is `httpOnly`, so JavaScript cannot read it, reducing XSS impact.
- Because the cookie is `SameSite=None`, the frontend and API **must both** be HTTPS.
  Never point `FRONTEND_URL` at an `http://` origin in production.