# @howells/linearcli

CLI for [Linear](https://linear.app) — issues, projects, teams, cycles, labels, and workflow states.

Designed for AI agents and automation. All output is structured JSON. Full CRUD with dry-run support.

## Install

```bash
npm install -g @howells/linearcli
```

## Setup

Create a personal API key at [linear.app/settings/api](https://linear.app/settings/api) and set it as an env var:

```bash
export LINEAR_API_KEY="lin_api_..."
```

## Usage

### Read

```bash
linearcli issues                                    # All issues (first 50)
linearcli issues --assignee me                      # My issues
linearcli issues --team ENG --state "In Progress"   # Filtered
linearcli issues --fields identifier,title,state    # Field selection
linearcli issue ENG-123                             # Single issue
linearcli issue ENG-123 --comments                  # With comments
linearcli search "auth bug"                         # Full-text search
linearcli teams                                     # List teams
linearcli projects                                  # List projects
linearcli cycles --team ENG                         # Team cycles
linearcli states --team ENG                         # Workflow states
linearcli labels                                    # All labels
linearcli me                                        # Current user
linearcli schema                                    # Schema introspection
```

### Write

```bash
linearcli create "Fix auth bug" --team ENG --priority 2
linearcli create --json '{"title":"Fix bug","team":"ENG","description":"Details..."}'
linearcli update ENG-123 --json '{"priority":1}'
linearcli comment ENG-123 "Fixed in PR #42"
```

### Flags

```
--team          Team key (e.g. ENG)
--assignee      Filter by name or "me"
--state         Filter by workflow state name
--label         Filter by label name
--project       Filter by project name
--limit         Max results
--fields        Comma-separated field names
--json          Raw JSON payload for writes
--dry-run       Validate without executing
--comments      Include comments (issue command)
```

## Agent Features

- All output is JSON (including errors and help)
- `--fields` for context window discipline
- `--limit` for result size control
- `--json` for raw payload input on all writes
- `--dry-run` for validation without side effects
- `schema` command for runtime introspection
- `--assignee me` for current-user filtering

## License

MIT
