import { error } from "./output.ts";

/** Check if a string contains ASCII control characters. */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x20) return true;
  }
  return false;
}

/** Validate a Linear issue identifier (e.g. "ENG-123" or a UUID). */
export function validateIssueId(value: string, command: string): void {
  if (hasControlChars(value)) {
    error("Invalid issue ID: contains control characters.", command);
  }
  if (value.includes("..") || value.includes("/") || value.includes("\\")) {
    error("Invalid issue ID: contains path traversal characters.", command);
  }
  if (value.includes("%") || value.includes("?") || value.includes("#")) {
    error("Invalid issue ID: contains encoded or query characters.", command);
  }
  if (value.length > 128) {
    error("Invalid issue ID: too long (max 128 characters).", command);
  }
}

/** Validate a title string. */
export function validateTitle(value: string, command: string): void {
  if (!value || value.trim().length === 0) {
    error("Title is required and cannot be empty.", command);
  }
  if (value.length > 1000) {
    error(`Title too long: ${value.length} characters (max 1000).`, command);
  }
}

/** Validate a positive integer string. */
export function validatePositiveInt(
  value: string,
  field: string,
  command: string,
): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    error(`Invalid ${field}: "${value}". Must be a positive integer.`, command);
  }
  return n;
}

/** Validate a --fields filter string. */
export function validateFields(value: string, command: string): void {
  const fields = value.split(",").map((f) => f.trim());
  for (const field of fields) {
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(field)) {
      error(
        `Invalid field name: "${field}". Fields must be alphanumeric.`,
        command,
      );
    }
  }
}
