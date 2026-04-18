import type { LinearClient } from "@linear/sdk";

/** Simplified issue shape for CLI output. */
interface IssueResult {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: number;
  priorityLabel: string;
  assignee: string | null;
  team: string;
  project: string | null;
  labels: string[];
  estimate: number | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
}

async function mapIssue(
  issue: Awaited<ReturnType<LinearClient["issue"]>>,
): Promise<IssueResult> {
  const [state, assignee, team, project, labels] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.team,
    issue.project,
    issue.labels(),
  ]);

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    state: state?.name ?? "Unknown",
    priority: issue.priority,
    priorityLabel: issue.priorityLabel,
    assignee: assignee?.name ?? null,
    team: team?.name ?? "Unknown",
    project: project?.name ?? null,
    labels: labels.nodes.map((l) => l.name),
    estimate: issue.estimate ?? null,
    dueDate: issue.dueDate ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    url: issue.url,
  };
}

/** List issues with optional filters. */
export async function issues(
  client: LinearClient,
  options: {
    team?: string;
    assignee?: string;
    state?: string;
    label?: string;
    project?: string;
    limit?: number;
  } = {},
): Promise<IssueResult[]> {
  const filter: Record<string, unknown> = {};

  if (options.team) {
    filter.team = { key: { eq: options.team } };
  }
  if (options.assignee) {
    if (options.assignee === "me") {
      const me = await client.viewer;
      filter.assignee = { id: { eq: me.id } };
    } else {
      filter.assignee = { name: { containsIgnoreCase: options.assignee } };
    }
  }
  if (options.state) {
    filter.state = { name: { containsIgnoreCase: options.state } };
  }
  if (options.label) {
    filter.labels = { name: { containsIgnoreCase: options.label } };
  }
  if (options.project) {
    filter.project = { name: { containsIgnoreCase: options.project } };
  }

  const result = await client.issues({
    filter,
    first: options.limit ?? 50,
    orderBy: "updatedAt" as never,
  });

  return Promise.all(result.nodes.map(mapIssue));
}

/** Get a single issue by identifier (e.g. "ENG-123") or UUID. */
export async function issue(
  client: LinearClient,
  idOrIdentifier: string,
): Promise<IssueResult> {
  const result = await client.issue(idOrIdentifier);
  return mapIssue(result);
}

/** Get issue with comments. */
export async function issueWithComments(
  client: LinearClient,
  idOrIdentifier: string,
): Promise<{
  issue: IssueResult;
  comments: { author: string; body: string; createdAt: string }[];
}> {
  const iss = await client.issue(idOrIdentifier);
  const mapped = await mapIssue(iss);
  const comments = await iss.comments();

  const mappedComments = await Promise.all(
    comments.nodes.map(async (c) => {
      const user = await c.user;
      return {
        author: user?.name ?? "Unknown",
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      };
    }),
  );

  return { issue: mapped, comments: mappedComments };
}

/** List teams. */
export async function teams(client: LinearClient) {
  const result = await client.teams();
  return result.nodes.map((t) => ({
    id: t.id,
    key: t.key,
    name: t.name,
    issueCount: t.issueCount,
  }));
}

/** List projects. */
export async function projects(
  client: LinearClient,
  options: { limit?: number } = {},
) {
  const result = await client.projects({
    first: options.limit ?? 50,
    orderBy: "updatedAt" as never,
  });

  return Promise.all(
    result.nodes.map(async (p) => {
      const lead = await p.lead;
      const teams = await p.teams();
      return {
        id: p.id,
        name: p.name,
        state: p.state,
        progress: p.progress,
        lead: lead?.name ?? null,
        teams: teams.nodes.map((t) => t.key),
        targetDate: p.targetDate ?? null,
        url: p.url,
      };
    }),
  );
}

/** List active cycles. */
export async function cycles(
  client: LinearClient,
  options: { team?: string } = {},
) {
  const filter: Record<string, unknown> = {};
  if (options.team) {
    filter.team = { key: { eq: options.team } };
  }

  const result = await client.cycles({
    filter,
    first: 10,
    orderBy: "startsAt" as never,
  });

  return Promise.all(
    result.nodes.map(async (c) => {
      const team = await c.team;
      return {
        id: c.id,
        number: c.number,
        name: c.name ?? `Cycle ${c.number}`,
        team: team?.key ?? "Unknown",
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        progress: c.progress,
        issueCountHistory: c.issueCountHistory,
      };
    }),
  );
}

/** Get current user info. */
export async function me(client: LinearClient) {
  const viewer = await client.viewer;
  const teams = await viewer.teams();

  return {
    id: viewer.id,
    name: viewer.name,
    email: viewer.email,
    admin: viewer.admin,
    teams: teams.nodes.map((t) => ({ key: t.key, name: t.name })),
  };
}

/** List workflow states. */
export async function states(
  client: LinearClient,
  options: { team?: string } = {},
) {
  const filter: Record<string, unknown> = {};
  if (options.team) {
    filter.team = { key: { eq: options.team } };
  }

  const result = await client.workflowStates({ filter });
  return Promise.all(
    result.nodes.map(async (s) => {
      const team = await s.team;
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        team: team?.key ?? "Unknown",
        position: s.position,
        color: s.color,
      };
    }),
  );
}

/** List labels. */
export async function labels(client: LinearClient) {
  const result = await client.issueLabels({ first: 100 });
  return result.nodes.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
  }));
}

/** Create a new issue. */
export async function createIssue(
  client: LinearClient,
  options: {
    title: string;
    teamKey: string;
    description?: string;
    priority?: number;
    assigneeId?: string;
    labelIds?: string[];
    projectId?: string;
    stateId?: string;
    estimate?: number;
    dueDate?: string;
  },
) {
  // Resolve team ID from key
  const teams = await client.teams({
    filter: { key: { eq: options.teamKey } },
  });
  const team = teams.nodes[0];
  if (!team) throw new Error(`Team "${options.teamKey}" not found.`);

  const payload: Record<string, unknown> = {
    title: options.title,
    teamId: team.id,
  };
  if (options.description) payload.description = options.description;
  if (options.priority !== undefined) payload.priority = options.priority;
  if (options.assigneeId) payload.assigneeId = options.assigneeId;
  if (options.labelIds) payload.labelIds = options.labelIds;
  if (options.projectId) payload.projectId = options.projectId;
  if (options.stateId) payload.stateId = options.stateId;
  if (options.estimate !== undefined) payload.estimate = options.estimate;
  if (options.dueDate) payload.dueDate = options.dueDate;

  const result = await client.createIssue(
    payload as Parameters<typeof client.createIssue>[0],
  );
  const created = await result.issue;
  if (!created) throw new Error("Issue creation failed.");

  return mapIssue(created);
}

/** Update an existing issue. */
export async function updateIssue(
  client: LinearClient,
  issueId: string,
  updates: Record<string, unknown>,
) {
  await client.updateIssue(issueId, updates);
  const updated = await client.issue(issueId);
  return mapIssue(updated);
}

/** Add a comment to an issue. */
export async function addComment(
  client: LinearClient,
  issueId: string,
  body: string,
) {
  const result = await client.createComment({ issueId, body });
  const comment = await result.comment;
  if (!comment) throw new Error("Comment creation failed.");
  const user = await comment.user;
  return {
    id: comment.id,
    author: user?.name ?? "Unknown",
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

/** Search issues by text query. */
export async function search(
  client: LinearClient,
  query: string,
  options: { limit?: number } = {},
) {
  const result = await client.searchIssues(query, {
    first: options.limit ?? 20,
  });

  return Promise.all(
    result.nodes.map(async (node) => {
      const iss = await client.issue(node.id);
      return mapIssue(iss);
    }),
  );
}
