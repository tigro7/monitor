# AGENTS

Purpose: help coding agents work effectively in this repository with minimal discovery time.

## Scope

- Applies to the whole repository.
- Prefer small, focused edits that preserve existing behavior and output format.

## First Steps

1. Read [README.md](README.md) for product intent and deployment context.
2. Read [CHANGELOG.md](CHANGELOG.md) before changing behavior visible to users.
3. If touching scheduling, secrets, or commit automation, read [nightly workflow](.github/workflows/nightly.yml).

## Runtime and Commands

- Required runtime: Node.js 20+ (see [package.json](package.json)).
- Install dependencies: `npm ci`
- Run locally with env file: `npm run dev`
- Run directly: `npm start`

## Environment and Secrets

- Local env template is [src/.env.example](src/.env.example).
- CI maps `GITHUB_TOKEN` from secret `GH_PAT` (see [nightly workflow](.github/workflows/nightly.yml)).
- Do not hardcode secrets or tokens in source or logs.

## Architecture Map

- Entrypoint and orchestration: [src/agent.js](src/agent.js)
- GitHub repository analysis: [src/analyzers/github.js](src/analyzers/github.js)
- Live site analysis: [src/analyzers/site.js](src/analyzers/site.js)
- Suggestion dedup persistence: [src/memory.js](src/memory.js)
- Email HTML generation: [src/email.js](src/email.js)
- Issue and dismiss URL builders: [src/issue-url.js](src/issue-url.js)
- Persistent suggestion memory: [data/seen-suggestions.json](data/seen-suggestions.json)

## Project Conventions

- Module system is ESM (`"type": "module"` in [package.json](package.json)).
- The monitor analyzes projects, generates suggestions via Anthropic, emails results via Resend.
- Suggestions are deduplicated by fingerprint for 30 days in [src/memory.js](src/memory.js).
- Memory is marked as seen only after successful email delivery in [src/agent.js](src/agent.js).
- If no new suggestions exist, the system sends an all-clear email variant.

## Editing Rules for Agents

- Preserve JSON output expectations sent to the LLM in [src/agent.js](src/agent.js).
- Keep email markup robust for email clients when editing [src/email.js](src/email.js) (prefer inline styles, avoid fragile CSS features).
- Keep analyzer failures non-fatal: per-project errors should not stop the whole run.
- When changing schema-like data returned by analyzers, update all consumers in [src/agent.js](src/agent.js) and [src/email.js](src/email.js).

## Common Pitfalls

- Local env template is under [src/.env.example](src/.env.example), not at repository root.
- [src/analyzers/github.js](src/analyzers/github.js) expects `process.env.GITHUB_TOKEN`; do not rename without updating CI env mapping.
- `staleBranches` is currently placeholder logic; avoid assuming it is implemented.

## Validation Checklist

- Run `npm run dev` with a valid `.env` before finalizing behavior changes.
- For workflow-related changes, verify [nightly workflow](.github/workflows/nightly.yml) still sets required secrets and pushes memory updates.
- If changing suggestion identity fields (`area`, `action`, `repo`), evaluate dedup impact in [src/memory.js](src/memory.js).
