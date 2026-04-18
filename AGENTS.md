# linearcli — Agent Guide

CLI for Linear. List, create, update, and comment on issues. Multi-team, filtered queries, search.

## Quick Start

```bash
# My assigned issues
linearcli issues --assignee me --fields identifier,title,state,priority --limit 10

# Get a specific issue with comments
linearcli issue ENG-123 --comments

# Create an issue via JSON
linearcli create --json '{"title":"Fix auth bug","team":"ENG","priority":2}' --dry-run

# Search
linearcli search "authentication" --limit 5

# Schema introspection
linearcli schema
```

## Invariants

- **Always use `--fields`** on list commands. Default includes all fields which wastes tokens. Use `--fields identifier,title,state,assignee` for triage.
- **Always use `--dry-run`** before create/update/comment. Validates inputs without side effects.
- **Always use `--json`** for writes. Avoids shell escaping issues.
- **Use `--assignee me`** to filter to the current user's issues.
- **Use `--team`** to scope to a specific team (e.g. `--team ENG`).
- **All output is JSON** with `{ok, data, error, command}` envelope.
- **Issue identifiers** use the format `TEAM-123` (e.g. `ENG-42`). Always read them from a query first.

## Priority Values

- `0` — No priority
- `1` — Urgent
- `2` — High
- `3` — Medium
- `4` — Low

## Common Workflows

### Triage assigned issues
```bash
linearcli issues --assignee me --state "In Progress" --fields identifier,title,priority,dueDate
```

### Create and assign
```bash
linearcli create --json '{"title":"Fix login redirect","team":"ENG","priority":2,"description":"Users get 404 after OAuth callback"}'
```

### Add a comment
```bash
linearcli comment ENG-123 --json '{"body":"Fixed in PR #42, ready for review"}'
```

### Check team workload
```bash
linearcli issues --team ENG --state "In Progress" --fields identifier,title,assignee
```

## Issue Fields

Available for `--fields`: `id`, `identifier`, `title`, `state`, `priority`, `priorityLabel`, `assignee`, `team`, `project`, `labels`, `estimate`, `dueDate`, `createdAt`, `updatedAt`, `url`
