import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const CLI = "npx tsx src/index.ts";

function run(args: string): {
  ok: boolean;
  data: unknown;
  error?: string;
  command?: string;
} {
  try {
    const stdout = execSync(`${CLI} ${args}`, {
      cwd: `${import.meta.dirname}/..`,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env },
    });
    return JSON.parse(stdout);
  } catch (err) {
    const e = err as { stdout?: string };
    if (e.stdout) return JSON.parse(e.stdout);
    throw err;
  }
}

describe("read commands", () => {
  it("me returns user info", () => {
    const result = run("me");
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("email");
    expect(data).toHaveProperty("teams");
  });

  it("teams returns array", () => {
    const result = run("teams");
    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("issues returns filtered results", () => {
    const result = run("issues --limit 3 --fields identifier,title,state");
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(3);
    if (data.length > 0) {
      const first = data[0] as Record<string, unknown>;
      expect(first).toHaveProperty("identifier");
      expect(first).toHaveProperty("title");
      expect(first).not.toHaveProperty("url");
    }
  });

  it("issues --assignee me works", () => {
    const result = run("issues --assignee me --limit 3");
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("projects returns array", () => {
    const result = run("projects --limit 3");
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("labels returns array", () => {
    const result = run("labels");
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("states returns array", () => {
    const result = run("states --limit 5");
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});

describe("schema", () => {
  it("returns full schema", () => {
    const result = run("schema");
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.cli).toBe("linearcli");
    expect(data.commands).toBeDefined();
    expect(data.flags).toBeDefined();
  });
});

describe("error handling", () => {
  it("returns structured error for unknown command", () => {
    const result = run("nonexistent");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Unknown command");
  });

  it("returns structured error for path traversal in issue ID", () => {
    const result = run("issue ../../etc/passwd");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("path traversal");
  });

  it("returns structured error for invalid limit", () => {
    const result = run("issues --limit abc");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("positive integer");
  });

  it("returns structured error for invalid fields", () => {
    const result = run("issues --fields ../hack");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("alphanumeric");
  });

  it("create requires title", () => {
    const result = run("create --dry-run");
    expect(result.ok).toBe(false);
  });

  it("create requires team", () => {
    const result = run('create "test" --dry-run');
    expect(result.ok).toBe(false);
    expect(result.error).toContain("team");
  });
});

describe("dry-run", () => {
  it("validates create without executing", () => {
    const result = run(
      'create --json \'{"title":"Dry run test","team":"ENG"}\' --dry-run',
    );
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.action).toBe("create");
    expect(data.title).toBe("Dry run test");
    expect(data.team).toBe("ENG");
  });
});

describe("help", () => {
  it("returns structured help", () => {
    const result = run("help");
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.read).toBeDefined();
    expect(data.write).toBeDefined();
  });
});
