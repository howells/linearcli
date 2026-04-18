#!/usr/bin/env node

import { error, success } from "@howells/cli";
import {
  flag,
  getLimit,
  hasFlag,
  readJsonInput,
  readResult,
} from "@howells/cli/args";
import { hardenId, validateTitle } from "@howells/cli/validate";
import { getClient } from "./client.ts";
import * as commands from "./commands.ts";

const args = process.argv.slice(2);
const command = args[0];

// --- Commands ---

const client =
  command && !["help", "--help", "-h", "schema"].includes(command)
    ? getClient()
    : undefined;

switch (command) {
  case "issues": {
    if (!client) break;
    commands
      .issues(client, {
        team: flag("team"),
        assignee: flag("assignee"),
        state: flag("state"),
        label: flag("label"),
        project: flag("project"),
        limit: getLimit("issues"),
      })
      .then((data) =>
        readResult("issues", data as unknown as Record<string, unknown>[]),
      )
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "issues"),
      );
    break;
  }

  case "issue": {
    if (!client) break;
    const id = args[1];
    if (!id) error("issue requires an identifier (e.g. ENG-123).", "issue");
    hardenId(id, "issue", { label: "issue ID" });

    if (hasFlag("comments")) {
      commands
        .issueWithComments(client, id)
        .then((data) => success(data, "issue"))
        .catch((err) =>
          error(err instanceof Error ? err.message : String(err), "issue"),
        );
    } else {
      commands
        .issue(client, id)
        .then((data) => success(data, "issue"))
        .catch((err) =>
          error(err instanceof Error ? err.message : String(err), "issue"),
        );
    }
    break;
  }

  case "search": {
    if (!client) break;
    const query = args[1];
    if (!query) error("search requires a query.", "search");
    commands
      .search(client, query, { limit: getLimit("search") })
      .then((data) =>
        readResult("search", data as unknown as Record<string, unknown>[]),
      )
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "search"),
      );
    break;
  }

  case "teams": {
    if (!client) break;
    commands
      .teams(client)
      .then((data) => success(data, "teams"))
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "teams"),
      );
    break;
  }

  case "projects": {
    if (!client) break;
    commands
      .projects(client, { limit: getLimit("projects") })
      .then((data) =>
        readResult("projects", data as unknown as Record<string, unknown>[]),
      )
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "projects"),
      );
    break;
  }

  case "cycles": {
    if (!client) break;
    commands
      .cycles(client, { team: flag("team") })
      .then((data) => success(data, "cycles"))
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "cycles"),
      );
    break;
  }

  case "states": {
    if (!client) break;
    commands
      .states(client, { team: flag("team") })
      .then((data) =>
        readResult("states", data as unknown as Record<string, unknown>[]),
      )
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "states"),
      );
    break;
  }

  case "labels": {
    if (!client) break;
    commands
      .labels(client)
      .then((data) => success(data, "labels"))
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "labels"),
      );
    break;
  }

  case "me": {
    if (!client) break;
    commands
      .me(client)
      .then((data) => success(data, "me"))
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "me"),
      );
    break;
  }

  case "create": {
    if (!client) break;
    const json = readJsonInput("create");
    const title = (json.title as string) ?? args[1];
    const team = (json.team as string) ?? flag("team");

    if (!title) error("title is required.", "create");
    if (!team) error("--team is required (e.g. --team ENG).", "create");
    validateTitle(title, "create");

    if (hasFlag("dry-run")) {
      success(
        {
          action: "create",
          title,
          team,
          description: (json.description as string) ?? flag("description"),
          priority:
            (json.priority as number) ??
            (flag("priority") ? Number(flag("priority")) : undefined),
          assignee: (json.assignee as string) ?? flag("assignee"),
          label: (json.label as string) ?? flag("label"),
          project: (json.project as string) ?? flag("project"),
          dueDate: (json.dueDate as string) ?? flag("due-date"),
        },
        "create",
      );
    }

    commands
      .createIssue(client, {
        title,
        teamKey: team,
        description: (json.description as string) ?? flag("description"),
        priority:
          (json.priority as number) ??
          (flag("priority") ? Number(flag("priority")) : undefined),
        dueDate: (json.dueDate as string) ?? flag("due-date"),
      })
      .then((data) => success({ action: "created", issue: data }, "create"))
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "create"),
      );
    break;
  }

  case "update": {
    if (!client) break;
    const json = readJsonInput("update");
    const id = (json.id as string) ?? args[1];
    if (!id) error("issue ID is required.", "update");
    hardenId(id, "update", { label: "issue ID" });

    const updates: Record<string, unknown> = {};
    const title = (json.title as string) ?? flag("title");
    const state = (json.state as string) ?? flag("state");
    const priority =
      (json.priority as number) ??
      (flag("priority") ? Number(flag("priority")) : undefined);
    const assignee = (json.assignee as string) ?? flag("assignee");
    const description = (json.description as string) ?? flag("description");
    const dueDate = (json.dueDate as string) ?? flag("due-date");

    if (title) updates.title = title;
    if (state) updates.stateId = state;
    if (priority !== undefined) updates.priority = priority;
    if (assignee) updates.assigneeId = assignee;
    if (description) updates.description = description;
    if (dueDate) updates.dueDate = dueDate;

    if (hasFlag("dry-run")) {
      success({ action: "update", id, updates }, "update");
    }

    commands
      .updateIssue(client, id, updates)
      .then((data) => success({ action: "updated", issue: data }, "update"))
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "update"),
      );
    break;
  }

  case "comment": {
    if (!client) break;
    const json = readJsonInput("comment");
    const id = (json.issueId as string) ?? args[1];
    const body = (json.body as string) ?? args[2];
    if (!id) error("issue ID is required.", "comment");
    if (!body) error("comment body is required.", "comment");
    hardenId(id, "comment", { label: "issue ID" });

    if (hasFlag("dry-run")) {
      success({ action: "comment", issueId: id, body }, "comment");
    }

    commands
      .addComment(client, id, body)
      .then((data) =>
        success({ action: "commented", comment: data }, "comment"),
      )
      .catch((err) =>
        error(err instanceof Error ? err.message : String(err), "comment"),
      );
    break;
  }

  case "schema":
    success(
      {
        cli: "linearcli",
        version: "0.2.0",
        description: "Agent-first CLI for Linear",
        auth: "Set LINEAR_API_KEY or LINEAR env var",
        commands: {
          issues: {
            description: "List issues with optional filters",
            params: {
              team: { type: "string", description: "Team key (e.g. ENG)" },
              assignee: {
                type: "string",
                description: "Assignee name or 'me'",
              },
              state: { type: "string", description: "Workflow state name" },
              label: { type: "string", description: "Label name" },
              project: { type: "string", description: "Project name" },
              limit: { type: "integer" },
              fields: { type: "string" },
            },
            fields: [
              "id",
              "identifier",
              "title",
              "state",
              "priority",
              "priorityLabel",
              "assignee",
              "team",
              "project",
              "labels",
              "estimate",
              "dueDate",
              "createdAt",
              "updatedAt",
              "url",
            ],
          },
          issue: {
            description: "Get a single issue by identifier",
            params: {
              identifier: {
                type: "string",
                required: true,
                description: "e.g. ENG-123 or UUID",
              },
              comments: { type: "boolean", description: "Include comments" },
            },
          },
          search: {
            description: "Search issues by text",
            params: {
              query: { type: "string", required: true },
              limit: { type: "integer" },
              fields: { type: "string" },
            },
          },
          create: {
            description: "Create an issue",
            accepts_json: true,
            params: {
              title: { type: "string", required: true },
              team: { type: "string", required: true, description: "Team key" },
              description: { type: "string" },
              priority: {
                type: "integer",
                description: "0=none, 1=urgent, 2=high, 3=medium, 4=low",
              },
              "due-date": { type: "string", format: "date" },
            },
          },
          update: {
            description: "Update an issue",
            accepts_json: true,
            params: {
              id: { type: "string", required: true },
              title: { type: "string" },
              state: { type: "string", description: "State ID" },
              priority: { type: "integer" },
              assignee: { type: "string", description: "Assignee ID" },
            },
          },
          comment: {
            description: "Add a comment to an issue",
            accepts_json: true,
            params: {
              issueId: { type: "string", required: true },
              body: { type: "string", required: true },
            },
          },
          teams: { description: "List teams", params: {} },
          projects: {
            description: "List projects",
            params: { limit: { type: "integer" }, fields: { type: "string" } },
          },
          cycles: {
            description: "List cycles",
            params: { team: { type: "string" } },
          },
          states: {
            description: "List workflow states",
            params: { team: { type: "string" }, fields: { type: "string" } },
          },
          labels: { description: "List labels", params: {} },
          me: { description: "Current user info", params: {} },
        },
        flags: {
          "--team": "Team key (e.g. ENG)",
          "--assignee": "Filter by assignee name or 'me'",
          "--state": "Filter by workflow state",
          "--label": "Filter by label",
          "--project": "Filter by project",
          "--limit": "Max results",
          "--fields": "Comma-separated field names to return",
          "--json": "Raw JSON payload for write commands",
          "--dry-run": "Validate without executing (writes only)",
          "--comments": "Include comments (issue command only)",
        },
      },
      "schema",
    );
    break;

  case "help":
  case "--help":
  case "-h":
    success(
      {
        usage:
          "linearcli <command> [args] [--team ENG] [--fields ...] [--limit N] [--json '{...}'] [--dry-run]",
        read: [
          "issues",
          "issue <id>",
          "search <query>",
          "teams",
          "projects",
          "cycles",
          "states",
          "labels",
          "me",
        ],
        write: ["create <title>", "update <id>", "comment <id> <body>"],
        meta: ["schema", "help"],
      },
      "help",
    );
    break;

  case undefined:
    error("No command provided. Run 'linearcli help' for usage.");
    break;

  default:
    error(`Unknown command: "${command}". Run 'linearcli help' for usage.`);
    break;
}
