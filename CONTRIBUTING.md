# Contributing

This is a personal project, but these conventions keep the git history readable and the changelog easy to maintain.

## Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `chore` | Maintenance, dependency updates, config changes |
| `docs` | Documentation only (README, CHANGELOG, CONTRIBUTING) |
| `refactor` | Code restructuring with no behaviour change |
| `perf` | Performance improvement |
| `security` | Security hardening (auth, permissions, pinning) |
| `ci` | Changes to GitHub Actions workflows |

### Scopes (optional but recommended)

| Scope | What it covers |
|---|---|
| `agent` | `src/agent.js` — orchestration logic |
| `github` | `src/analyzers/github.js` |
| `site` | `src/analyzers/site.js` |
| `email` | `src/email.js` |
| `memory` | `src/memory.js` and `data/seen-suggestions.json` |
| `dismiss` | `src/issue-url.js` + `monitor-api` dismiss endpoint |
| `workflow` | `.github/workflows/nightly.yml` |

### Examples

```
feat(email): add per-suggestion dismiss button
fix(memory): skip expired entries on startup
chore(deps): bump @anthropic-ai/sdk to 0.40.0
security(workflow): pin actions to commit SHAs
ci(workflow): add explicit permissions per job
docs: add CONTRIBUTING and commit convention
refactor(github): extract openIssueTitles from issue list
```

### Rules

- Use the **imperative mood** in the description: "add", not "added" or "adds"
- Keep the first line **under 72 characters**
- Do **not** end the description with a period
- Append `[skip ci]` to automated commits that should not trigger workflows (e.g. memory updates)
- Breaking changes get a `!` after the type: `feat(agent)!: change suggestion JSON shape`

## Changelog

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and is updated manually alongside any version bump. Bot commits (`chore: update seen suggestions [skip ci]`) are excluded from the changelog.