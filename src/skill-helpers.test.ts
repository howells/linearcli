import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

// The agent skill's GraphQL helpers in skills/linear/scripts. Fixtures are local:
// no Linear request is made and no real key is used.
const SCRIPTS = join(import.meta.dirname, "..", "skills", "linear", "scripts");
const temporary: string[] = [];

function scratch(): string {
  const directory = mkdtempSync(join(tmpdir(), "linear-skill-"));
  temporary.push(directory);
  return directory;
}

function run(
  command: string,
  args: string[],
  input: string,
  env: NodeJS.ProcessEnv
) {
  return spawnSync(command, args, {
    input,
    env,
    encoding: "utf-8",
    timeout: 10_000,
  });
}

afterEach(() => {
  for (const directory of temporary.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("check-response", () => {
  const check = (body: string) =>
    run("python3", [join(SCRIPTS, "check-response.py")], body, {
      PATH: process.env.PATH,
    });

  it("fails partial errors, failed mutations, null data and non-objects, passing the body through", () => {
    for (const data of [
      { data: { viewer: null }, errors: [{ message: "denied" }] },
      { data: { issueCreate: { success: false } } },
      { data: null },
      [],
    ]) {
      const body = JSON.stringify(data);
      const result = check(body);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe(body);
    }
  });

  it("passes a successful body through unchanged", () => {
    const body = JSON.stringify({ data: { issues: { nodes: [] } } });
    const result = check(body);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(body);
  });

  it("fails a body that is not JSON", () => {
    const result = check("proxy unavailable");
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("proxy unavailable");
  });
});

describe("read-credential", () => {
  it("accepts one clean value and rejects missing, blank or header-injecting ones without echoing them", () => {
    for (const value of [
      undefined,
      "",
      " ",
      "fixture\nInjected: header",
      "fixture\rvalue",
      "fixture\tvalue",
      "fixture-token",
    ]) {
      const env: NodeJS.ProcessEnv = { PATH: process.env.PATH };
      if (value !== undefined) env.TEST_API_KEY = value;
      const result = spawnSync(
        "python3",
        [join(SCRIPTS, "read-credential.py"), "TEST_API_KEY"],
        { env, cwd: scratch(), encoding: "utf-8", timeout: 10_000 }
      );
      if (value === "fixture-token") {
        expect(result.status).toBe(0);
        expect(result.stdout).toBe(value);
      } else {
        expect(result.status).toBe(78);
        expect(result.stdout).toBe("");
        expect(result.stderr).not.toContain("fixture");
      }
    }
  });
});

describe("read-credential .env fallback", () => {
  it("reads the repository root .env when the environment lacks the key, and the environment wins", () => {
    const root = scratch();
    spawnSync("git", ["init", "-q", root]);
    writeFileSync(
      join(root, ".env"),
      '# keys\nexport TEST_API_KEY="from-file"\n'
    );
    const nested = join(root, "apps", "web");
    mkdirSync(nested, { recursive: true });
    const read = (env: NodeJS.ProcessEnv) =>
      spawnSync(
        "python3",
        [join(SCRIPTS, "read-credential.py"), "TEST_API_KEY"],
        {
          env,
          cwd: nested,
          encoding: "utf-8",
          timeout: 10_000,
        }
      );
    expect(read({ PATH: process.env.PATH }).stdout).toBe("from-file");
    expect(
      read({ PATH: process.env.PATH, TEST_API_KEY: "from-env" }).stdout
    ).toBe("from-env");
  });
});

describe("graphql", () => {
  it("stops before the transport runs when no key is set", () => {
    const directory = scratch();
    const marker = join(directory, "called");
    const transport = join(directory, "curl");
    writeFileSync(transport, `#!/bin/sh\ntouch '${marker}'\n`);
    chmodSync(transport, 0o700);
    const result = run(
      "/bin/sh",
      [join(SCRIPTS, "graphql")],
      '{"query":"fixture"}',
      {
        PATH: `${directory}${delimiter}${process.env.PATH}`,
      }
    );
    expect(result.status).toBe(78);
    expect(existsSync(marker)).toBe(false);
    expect(result.stdout).toBe("");
  });

  it("sends the key as a header on stdin and the body on fd 3, never in arguments", () => {
    const directory = scratch();
    const transport = join(directory, "curl");
    writeFileSync(
      transport,
      `#!/usr/bin/env python3
import json, sys
args = sys.argv[1:]
body = open('/dev/fd/3').read() if '--data-binary' in args else None
print(json.dumps({'data': {'header': sys.stdin.read(), 'body': body, 'args': args}}))
`
    );
    chmodSync(transport, 0o700);
    const body = '{"query":"fixture with spaces"}\n';
    const result = run("/bin/sh", [join(SCRIPTS, "graphql")], body, {
      PATH: `${directory}${delimiter}${process.env.PATH}`,
      LINEAR_API_KEY: "fixture-token",
    });
    expect(result.status, result.stderr).toBe(0);
    const data = JSON.parse(result.stdout).data;
    expect(data.header).toBe("Authorization: fixture-token\n");
    expect(data.body).toBe(body);
    expect(data.args).toContain("https://api.linear.app/graphql");
    expect(data.args.join(" ")).not.toContain("fixture-token");
  });
});
