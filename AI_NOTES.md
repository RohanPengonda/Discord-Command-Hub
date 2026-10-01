# AI Development Notes (AI_NOTES.md)

## 1. Tools, models, and how the work was split

**Tooling:** Google Gemini (high tier) via the Antigravity agentic platform, in-editor. AI was used
throughout for scaffolding, refactors, test generation, and debugging.

**Rough split — roughly 50/50, but weighted differently per layer:**

| Area | Who did what |
|---|---|
| Backend architecture, Discord interaction flow | I designed it; AI implemented against my spec and wrote the first pass |
| Prisma schema | AI generated, I reviewed field-by-field and corrected relations |
| Frontend UI (React/Tailwind) | AI wrote ~80% of it; I directed the design system and reviewed every screen |
| Debugging | Mostly AI-driven, with me directing the investigation. This is where it performed worst. |

I wrote `AGENTS.md` up front encoding the four non-negotiable rules (Ed25519 verification on the raw
body, 3-second SLA, idempotency via `ProcessedInteraction`, no secrets in code or logs) and required
every AI change to satisfy them. That constraint file was the single highest-leverage thing I did — most
of the security-critical code is correct because the rules were stated before the code was written, not
because I caught the mistakes afterward.

## 2. Key decisions I made myself

**a) Postgres + Prisma over MongoDB, specifically to get a uniqueness constraint on `interactionId`.**
Discord retries interaction webhooks. Without a hard database constraint a retry races the original and
you get duplicate side effects — duplicate AI calls, duplicate mirror notifications, duplicate log rows.
`interactionId @unique` in Postgres makes the second insert fail at the database level, which
`ProcessedInteraction` then converts into "return the saved response." A document store cannot express
that constraint, so Mongo was disqualified on correctness grounds, not preference.

**b) Type 5 deferral with background offload, rather than trying to make the pipeline fast.**
My first instinct was to optimize the AI call and reply synchronously. That's a dead end — Gemini's p99
latency alone can exceed the 3-second budget, so any synchronous design fails intermittently under load.
`report.command.ts` acknowledges with Type 5 immediately and pushes the pipeline onto a background tick,
then updates the original response via webhook. `/status` still replies synchronously because it is
genuinely fast and there is no reason to defer it.

**c) Fail-open AI, and keeping the webhook token out of the API response.**
Two separate calls. On AI: if Gemini is down, `/report` must still log and notify — a classification
failure must never block a user report. On the token: `interaction.token` authorizes editing the bot's
original reply, so anyone holding it can post as the bot. `log.repository.ts` selects it explicitly
rather than including the whole row, and it is never serialized to the dashboard.

Caveat on (c): fail-open is correct for availability, but it made this project's worst bug nearly
invisible. See below.

## 3. The hardest bug

**Symptom:** `/report` did nothing in Discord. No embed, no error, no mirror message. The dashboard was
empty. Worse, when I eventually got partial data flowing, the AI summaries were nonsense — every report
came back categorized `General`, priority `MEDIUM`, with a "summary" that was just the first 77
characters of the user's text.

**Root cause:** I had never filled in the **Interactions Endpoint URL** in the Discord Developer Portal
under General Information. The backend was correct, deployed, publicly reachable, and signature
verification was working perfectly. Discord simply had nowhere to send anything, so it never sent
anything. Setting the URL was a two-minute fix.

**What the AI got wrong — and this is the honest part:** for several rounds the AI did not accept that
the bug was outside the codebase. It kept proposing code-level fixes: rewriting the signature
middleware, adding retry logic to the webhook, switching the JSON body parser, re-checking whether
`express.raw` was being used. Each fix was plausible and each was irrelevant, because no request was
ever arriving. The tell was that every proposed fix assumed traffic existed to be fixed, while the
actual symptom was *zero traffic*. I noticed because the suggestions all had the shape "handle the
request better" while the evidence said "there is no request." The prompt that finally broke the loop
refused the premise and asked it to enumerate every step between a user typing `/report` and the backend
logging an interaction — the missing portal step fell out of that list immediately.

**Why the AI output looked confidently wrong.** This is the part that cost the most time, and it was
caused by my own design. `AIService.analyzeReport` catches *every* error and returns a structurally valid
fallback: a truncated text fragment as `summary`, `General` as `category`, `MEDIUM` as `priority`. So
when the pipeline upstream was dead, the AI layer still produced well-formed, database-persisted,
dashboard-rendering results. It never threw, never flagged degraded mode, and had no visual distinction
between a real Gemini classification and a fallback. The uniform `General` / `MEDIUM` pattern across every
row was the actual diagnostic clue, and I initially read it as "the AI prompt is bad" rather than "the AI
is not running." A real classification has varied categories; a fallback is always identical.

**The fix, and what I got wrong in my own design:**
- Portal: set the Interactions Endpoint URL to the deployed backend.
- The fallback is retained — it is the right availability tradeoff — but it is now explicitly logged
  (`logger.error` on Gemini failure) so a fallback is traceable instead of silent.
- `AIResult` now carries `source: GEMINI | FALLBACK` plus `errorMessage`, so a degraded result is
  distinguishable from a real classification **at the data layer**, not just in the logs.
- The dashboard renders that distinction: a `Gemini` / `Fallback` badge on every AI result, amber styling
  and an explicit warning in the log detail panel, and a "Degraded operations detected" banner on the
  Overview page whenever any fallback or abandoned log exists.
- The `/report` embed also labels degraded results, so an evaluator watching Discord — not just the
  dashboard — can see that the AI did not run.

This turns an invisible failure mode into a visible one. `tests/ai_fallback.test.ts` asserts that both a
missing API key and a failing Gemini call yield `source: FALLBACK` with an error message and a
structurally valid result, so this cannot silently regress back to "looks like success."

## 4. Security issues found in review

Auditing the auth path turned up things more serious than anything in my original design, and they are
worth recording because each was invisible in the code's *shape* rather than its behaviour:

- **`POST /api/auth/register` had no authorization at all.** Any anonymous visitor could POST an email
  and password and mint themselves a dashboard admin. Registration now requires a `bootstrapToken`
  matching `ADMIN_BOOTSTRAP_TOKEN`, compared with `crypto.timingSafeEqual`; with the variable unset the
  endpoint returns `503` and creates nothing. Minimum password length is 12 characters.
- **First-admin auto-provision accepted any email.** When the admin table was empty, `login` created an
  account for whatever address was supplied, so the first person to try could claim admin. It now
  provisions only the address in `ADMIN_EMAIL`, and returns `403` otherwise.
- **Every invalid request returned `500`.** Zod validation failures hit the generic error handler, so a
  malformed body looked like a server outage and would have tripped uptime monitoring. The handler now
  maps `ZodError` to `400` and logs it as a warning rather than an error.
- **`updateLogStatus` swallowed database errors** and returned a fabricated success object, so clicking
  `[Resolve]` in Discord confirmed a save that never happened. It now takes a `throwOnFailure` flag that
  the button handler passes, producing an ephemeral "Could not save this change" message and leaving the
  buttons in place so the action can be retried.
- **The README documented a known demo password.** Removed. The README and `DEPLOYMENT.md` now document
  the bootstrap flow instead of shipping a credential.

The pattern across all five is the same one that produced the original bug: each one *looked* like it
worked. A permissive default, a catch block that returns something reasonable, a status code that
over-reports success. Reviewing for "does the happy path work" misses every one of them; you have to ask
what the failure path actually shows the user.

## 5. Reliability work, and where it stops

The report pipeline runs on the Node event loop rather than a durable queue, so a redeploy or a free-tier
sleep can kill it mid-flight. The interaction was already acknowledged to Discord, so without
mitigation those rows sit on `PROCESSING` forever and are indistinguishable from work still running.

What I added:
- `utils/retry.ts` — exponential backoff with full jitter around every Discord REST call, retrying only
  transient statuses (`408`, `425`, `429`, `5xx`) and never a `4xx` that cannot succeed on retry. A
  single failed `editOriginalInteractionResponse` or mirror post previously aborted the rest of the
  pipeline.
- `services/stuck_log_reaper.ts` — a sweep that marks anything still `PROCESSING` after 5 minutes as
  `FAILED` and surfaces the count on the Overview page.

Where it stops, stated plainly: **this converts silent loss into visible loss; it does not fix the loss.**
The work is still not re-executed after a restart. The reaper's own comment says so rather than
overstating what it does. A durable queue remains the actual answer — see below.

## 6. What I'd improve with more time

1. **A real background job queue (BullMQ + Redis).** This is the one named assignment requirement I do
   not fully meet: "downstream failure resilience and non-loss." Retry and reaping make the failure
   visible; only a durable queue makes it recoverable.
2. **Contract tests against real Discord interaction fixtures,** plus a startup self-check that the
   Interactions Endpoint URL is actually set. The portal is external state the codebase cannot currently
   see; the app should refuse to boot in "working" mode without it. This is the bug that cost the most
   time, and no amount of code-level testing would have caught it.
3. **Honest verification coverage.** `REQUIREMENTS_CHECKLIST.md` originally marked all 28 requirements
   PASS, but several had no test behind them — mirroring, UI config gating, channel configuration, and
   database persistence were asserted by test files that do not actually exercise them. The suite now
   runs 28 tests across 6 files covering signatures, the interaction endpoint, auth hardening, AI
   degradation, retry behaviour, and button persistence. Genuinely still unverified: replay-attack
   freshness (the check is skipped under `NODE_ENV=test`), mirror delivery, config gating, and any
   persistence assertion — the suite runs with no database, so every repository call takes the
   in-memory fallback path.
4. **Structured alerting rather than dashboard-only signalling.** Everything degraded is now visible in
   the UI, but nothing pages anyone. An operator who never opens the dashboard still has a dead pipeline.
5. **WebSocket/SSE live log streaming** so the dashboard doesn't poll.

## 7. Prompt excerpt

The prompt that unblocked the portal bug, after several rounds of code-level theories:

> "Stop proposing code fixes. Every solution you've given assumes a request is arriving. There is no
> request. List every step between a user typing `/report` in Discord and `commandLog` being written in
> Postgres, and mark which ones are inside this repo and which are outside it."

The AI had been confidently optimizing step 4 while step 0 — Discord needs to be told where to send
interactions — was never in the list, because it wasn't in the code and the prompt never pointed at the
platform configuration.

A second prompt, from the security pass, followed the same shape and was just as effective:

> "Audit the auth path for ways a complete outage or an unauthorized user would present as success. Do
> not review whether the happy path works."

That framing is what surfaced the open `/register` endpoint and the swallowed database write — neither is
visible when you only ask whether logging in works.

The general lesson I'm taking: when debugging an integration, enumerate the full boundary crossing before
proposing fixes at any single layer. And when reviewing anything with a failure path, review the failure
path explicitly, because the code that hides an outage is usually code that looks correct.