import { describe, expect, it, vi } from "vitest";

vi.mock("./output.ts", () => ({
  error: (message: string, command?: string) => {
    throw new Error(`[${command}] ${message}`);
  },
  success: () => {},
  filterFields: (t: unknown[]) => t,
}));

import {
  validateFields,
  validateIssueId,
  validatePositiveInt,
  validateTitle,
} from "./validate.ts";

describe("validateIssueId", () => {
  it("accepts Linear identifiers", () => {
    expect(() => validateIssueId("ENG-123", "test")).not.toThrow();
    expect(() => validateIssueId("ARZ-4", "test")).not.toThrow();
  });

  it("accepts UUIDs", () => {
    expect(() =>
      validateIssueId("e3608465-aa78-4aa8-bbe5-b5d2def719d6", "test"),
    ).not.toThrow();
  });

  it("rejects path traversal", () => {
    expect(() => validateIssueId("../../etc/passwd", "test")).toThrow(
      "path traversal",
    );
  });

  it("rejects control characters", () => {
    expect(() => validateIssueId("ENG\x00-123", "test")).toThrow(
      "control characters",
    );
  });

  it("rejects percent encoding", () => {
    expect(() => validateIssueId("ENG%2e123", "test")).toThrow("encoded");
  });

  it("rejects overly long IDs", () => {
    expect(() => validateIssueId("a".repeat(129), "test")).toThrow("too long");
  });
});

describe("validateTitle", () => {
  it("accepts normal titles", () => {
    expect(() => validateTitle("Fix auth bug", "test")).not.toThrow();
  });

  it("rejects empty", () => {
    expect(() => validateTitle("", "test")).toThrow("required");
  });

  it("rejects whitespace-only", () => {
    expect(() => validateTitle("   ", "test")).toThrow("required");
  });

  it("rejects over 1000 chars", () => {
    expect(() => validateTitle("a".repeat(1001), "test")).toThrow("too long");
  });
});

describe("validatePositiveInt", () => {
  it("accepts valid numbers", () => {
    expect(validatePositiveInt("10", "limit", "test")).toBe(10);
  });

  it("rejects zero", () => {
    expect(() => validatePositiveInt("0", "limit", "test")).toThrow("positive");
  });

  it("rejects non-numbers", () => {
    expect(() => validatePositiveInt("abc", "limit", "test")).toThrow(
      "positive",
    );
  });
});

describe("validateFields", () => {
  it("accepts valid fields", () => {
    expect(() =>
      validateFields("identifier,title,state", "test"),
    ).not.toThrow();
  });

  it("rejects invalid characters", () => {
    expect(() => validateFields("title,../hack", "test")).toThrow(
      "alphanumeric",
    );
  });
});
