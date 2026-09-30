# AI Development Notes (AI_NOTES.md)

## Overview & Tooling
- **AI Models / Tools Used**: Google Gemini 3.6 Flash (High) via Antigravity Agentic Platform.
- **Architectural Decisions**:
  - Selected Express + TypeScript for the backend to ensure reliable raw body buffer handling required by Discord Ed25519 signature verification.
  - Selected Prisma ORM with PostgreSQL for strict relational schema enforcement, primary/foreign keys, and database-level unique constraints on `interactionId`.
  - Implemented immediate interaction deferral (`DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`) for slow commands to satisfy Discord's strict 3-second webhook response SLA.
  - Formulated a decoupled AI Provider strategy (supporting both Google Gemini and Groq) with fail-open fallback so that AI outages do not block primary Discord message reporting.

## Key Challenges & AI Edge Cases Solved
1. **Raw Request Body Truncation / Parsing Bug**:
   - *Problem*: Standard `express.json()` parses body into a JS object, stripping raw byte strings. Discord Ed25519 verification requires exact raw binary payload bytes concatenated with the timestamp string.
   - *Fix*: Configured Express JSON middleware with a `verify` option to preserve `req.rawBody` as a `Buffer`.
2. **Discord 3-Second SLA & Deferral**:
   - *Problem*: Synchronous AI invocation and second-channel webhooks exceeded 3000ms causing Discord interaction timeouts.
   - *Fix*: Implemented early Type 5 acknowledgment and moved AI processing + webhook execution to asynchronous background tasks.
3. **Idempotency & Retry Collisions**:
   - *Problem*: Discord retries interaction webhooks if network drops occur.
   - *Fix*: Enforced unique database constraint on `interactionId` and checked `ProcessedInteraction` record prior to executing side effects.

## Future Improvements
- Implement distributed Redis queue (e.g. BullMQ) for background task retries and worker pool scaling.
- Add WebSocket live updates from server to client dashboard for zero-latency log streaming.
