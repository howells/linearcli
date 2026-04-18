/** Structured CLI response envelope. */
export interface CliResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  command?: string;
}

/** Output a success response and exit. */
export function success(data: unknown, command?: string): never {
  const result: CliResult = { ok: true, data };
  if (command) result.command = command;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

/** Output an error response and exit. */
export function error(message: string, command?: string): never {
  const result: CliResult = { ok: false, error: message };
  if (command) result.command = command;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(1);
}

/** Filter an array of objects to only include specified fields. */
export function filterFields(
  items: Record<string, unknown>[],
  fields: string | undefined,
): Record<string, unknown>[] {
  if (!fields) return items;
  const keys = fields.split(",").map((f) => f.trim());
  return items.map((item) => {
    const filtered: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in item) filtered[key] = item[key];
    }
    return filtered;
  });
}
