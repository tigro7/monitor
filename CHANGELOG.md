# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.0] - 2025-06-19
 
### Security
- Pinned all GitHub Actions to exact commit SHAs to prevent supply chain attacks (checkout v4.2.2, setup-node v4.4.0)
- Added explicit `permissions` block at workflow level (`contents: read`) and per-job overrides — `run-monitor` gets `contents: write`, `notify-failure` gets `contents: none`
### Changed
- Failure notification extracted into a dedicated `notify-failure` job that runs only on failure, sends email via Resend curl call (no third-party action needed)
- Removed `actions/github-script` dependency from failure path

## [1.1.1] - 2025-06-19
 
### Fixed
- Open issue titles are now passed to Claude as context: suggestions already tracked as GitHub issues are no longer reproposed
- `github.js` now returns `openIssueTitles[]` in addition to the issue count
### Changed
- Claude prompt updated with explicit instruction to skip suggestions already present as open issues

## [1.1.0] - 2025-06-19

### Added
- "✕ Scarta" button in email: one-click dismiss via `monitor-api` Vercel endpoint, suppresses suggestion for 365 days and commits `seen-suggestions.json` automatically
- `monitor-api` companion repo: single serverless function (`/api/dismiss`) with token auth, GitHub Contents API write, and confirmation HTML page
- `DISMISS_API_URL` and `DISMISS_TOKEN` environment variables in workflow and `.env.example`

## [1.0.0] - 2025-06-19

### Added
- Nightly GitHub Actions workflow (cron `0 2 * * 1-5`) with manual `workflow_dispatch` trigger
- GitHub analyzer: open issues, open PRs, days since last commit, outdated dependencies, missing common files, stale branches
- Site analyzer: uptime check, response time, heuristic performance score, missing SEO meta tags, broken internal links, SSL validation
- Claude Sonnet integration: generates 3–5 prioritized suggestions per project (high / medium / low) in JSON
- Resend email digest: formatted HTML report with per-project stats and suggestion cards
- Deduplication via SHA1 fingerprint (`repo + area + action`): seen suggestions are suppressed for 30 days and persisted in `data/seen-suggestions.json`, auto-committed after each run
- "Crea Issue su GitHub →" button on each suggestion: pre-filled GitHub new-issue URL with title, body and priority label, no extra infrastructure required
- All-clear email mode: minimal green-header email when no new suggestions are found
- Covers four projects: UFNC, Thatswhoi.am, Le Nuove Espressioni, Project Monitor itself
