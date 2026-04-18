import { describe, expect, it } from "vitest";
import { filterFields } from "./output.ts";

describe("filterFields", () => {
  const items = [
    {
      id: "1",
      identifier: "ENG-1",
      title: "Fix bug",
      state: "Todo",
      url: "https://linear.app/...",
    },
    {
      id: "2",
      identifier: "ENG-2",
      title: "Add feature",
      state: "Done",
      url: "https://linear.app/...",
    },
  ];

  it("returns all fields when no filter", () => {
    expect(filterFields(items, undefined)).toEqual(items);
  });

  it("filters to specified fields", () => {
    expect(filterFields(items, "identifier,title")).toEqual([
      { identifier: "ENG-1", title: "Fix bug" },
      { identifier: "ENG-2", title: "Add feature" },
    ]);
  });

  it("ignores non-existent fields", () => {
    expect(filterFields(items, "identifier,nonexistent")).toEqual([
      { identifier: "ENG-1" },
      { identifier: "ENG-2" },
    ]);
  });
});
