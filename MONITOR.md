# Monitor Context

> This file is read nightly by the Project Monitor agent to give Claude
> product context beyond what's visible in code metrics.

## What this project is

A personal nightly agent that analyzes four GitHub repositories, generates prioritized improvement suggestions using Claude Sonnet, and delivers a focused email digest every morning. Built entirely on free-tier infrastructure (GitHub Actions, Vercel, Resend, Anthropic API).

## Current status

Stable and running nightly. Actively iterating on suggestion quality and UX.

## Active work (this sprint / this month)

- Tuning prompt quality and suggestion relevance
- Testing the weekly rotation system (Mon–Fri focus areas)
- Validating the one-click dismiss flow via monitor-api on Vercel

## Roadmap (next meaningful steps)

- Populate `MONITOR.md` files in the other three monitored repos (UFNC, Thatswhoi.am, Le Nuove Espressioni)
- Evaluate adding Fix 2 deduplication (structural similarity check against open issues)
- Consider a weekly summary email on Fridays instead of the standard rotation

## Known pain points

- Dismiss endpoint requires `data/seen-suggestions.json` to already exist in the repo before first use
- Heuristic performance score in `site.js` is a rough estimate, not a real Lighthouse run

## Out of scope (don't suggest these)

- Replacing GitHub Actions with a paid CI provider
- Adding a database or persistent backend beyond the committed JSON file
- Building a web dashboard UI for managing suggestions
- Slack or Telegram integration (email is the chosen delivery channel)