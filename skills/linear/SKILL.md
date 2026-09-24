---
name: linear
description: "Use configured Linear accounts through linearcli or GraphQL; choose the account that owns the target. Not for transcripts (`muster`)."
---

# Linear

Linear is reached through `linearcli` for everyday issue work and through GraphQL with the bundled helper for everything else. There is no Linear MCP in either harness; never ask for a key and never paste one.

Keys come from the environment, or failing that from `.env` at the root of the current repository: `LINEAR_API_KEY` for the default workspace, and one `LINEAR_API_KEY_<WORKSPACE>` per additional workspace. The user's own instructions say which workspace and team prefixes each variable covers; read that mapping there, never infer it from an email, project or issue prefix.

If neither place has the variable, say which one and stop. Never print a key or copy it into a file or command argument.

[scripts/graphql](scripts/graphql) reads `LINEAR_API_KEY` from the environment or the root `.env`, never from arguments, and posts a complete GraphQL JSON request from standard input to `https://api.linear.app/graphql`. For another workspace, run it with the variable re-pointed for that one subprocess:

```sh
printf '%s' '{"query":"query { viewer { name } }"}' | scripts/graphql
LINEAR_API_KEY="$(python3 scripts/read-credential.py LINEAR_API_KEY_OTHER)" scripts/graphql < request.json
```

## The CLI for everyday issue work

When `linearcli` (npm `@howells/linearcli`) is on the path, use it for listing, reading, searching, creating, updating and commenting on issues. It returns JSON in an `{ok, data, error, command}` envelope. It reads only the environment, so hand it the key through the helper, which also checks the root `.env`:

```sh
LINEAR_API_KEY="$(python3 scripts/read-credential.py LINEAR_API_KEY)" linearcli issues --team ENG --state "In Progress" --fields identifier,title,assignee
LINEAR_API_KEY="$(python3 scripts/read-credential.py LINEAR_API_KEY_OTHER)" linearcli issue OPS-42 --comments
LINEAR_API_KEY="$(python3 scripts/read-credential.py LINEAR_API_KEY)" linearcli create --json '{"title":"Fix login redirect","team":"ENG","priority":2}' --dry-run
```

Always pass `--fields` on lists, write with `--json`, and run `--dry-run` before a create, update or comment. `linearcli schema` lists the commands. Anything it doesn't cover (relations, bulk edits, custom queries) goes through the GraphQL helper above.

## Choose the account

- Honour an account the user names explicitly.
- For an issue identifier, team or project, use the documented mapping. If the prefix is not listed, make a small read-only lookup against each configured workspace and use the one that contains it.
- If more than one contains a plausible target, say so. Read-only work may inspect each; ask before a write whose destination remains ambiguous.
- For an untargeted request such as "check Linear", use the repository's documented team or issue prefix when present. Otherwise list the relevant teams from the configured workspaces before choosing.

Reads are allowed when they serve the request. Create, update, close or comment only when the user asked for that mutation.

The helpers require Python 3. [scripts/read-credential.py](scripts/read-credential.py) takes the credential from the environment, else the repository's root `.env`, and requires a nonempty, single-line value before any request. [scripts/check-response.py](scripts/check-response.py) preserves the response and exits nonzero for GraphQL errors, invalid data or an explicit mutation failure. Inspect the returned entity before claiming success. Never automatically retry a mutation after an uncertain outcome; reconcile current state first.
