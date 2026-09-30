# AI Agent Context & Architecture Guide

## Overview
This repository contains the **Discord Slash-Command Automation Dashboard**, a real-world TypeScript application designed to integrate Discord slash commands with a secure backend API, automated AI analysis, channel mirroring, and an admin management dashboard.

## Core Architectural Rules
1. **Ed25519 Request Verification**: Every request to `POST /api/discord/interactions` MUST verify the `X-Signature-Ed25519` and `X-Signature-Timestamp` headers using `@discord-interactions/verify` or `discord-interactions` / `tweetnacl` against the raw HTTP request body BEFORE parsing JSON.
2. **3-Second Response & Deferral**: Discord expects interaction acknowledgments within 3 seconds.
   - Fast commands (`/status`) respond synchronously with Type 4 (`CHANNEL_MESSAGE_WITH_SOURCE`).
   - Slow or multi-step operations (`/report` with AI or webhooks) MUST return Type 5 (`DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`) immediately, followed by asynchronous webhook updates to `/webhooks/{app_id}/{token}/messages/@original`.
3. **Idempotency Guarantee**: Every interaction possesses a unique `interaction.id`. The backend checks the `ProcessedInteraction` table before executing side effects (database logs, AI calls, mirror notifications). Duplicate interaction IDs must return saved responses without re-executing logic.
4. **Secrets Hygiene**: NEVER hardcode secrets or tokens in source code, client bundles, API responses, or logs. Always consume from `process.env`.
5. **UI Config Respect**: Backend interaction processing MUST read command configurations from the database and respect settings (`enabled`, `saveLogs`, `replyInDiscord`, `mirrorNotification`, `aiProcessing`).
