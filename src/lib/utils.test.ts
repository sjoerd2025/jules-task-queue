import { expect, test, describe } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  test("merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("handles conditional classes", () => {
    expect(cn("foo", true && "bar", false && "baz")).toBe("foo bar");
  });

  test("merges tailwind classes correctly (conflict resolution)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  test("handles arrays of classes", () => {
    expect(cn("foo", ["bar", "baz"])).toBe("foo bar baz");
  });

  test("handles objects as input", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
  });

  test("handles mixed inputs", () => {
    expect(cn("foo", ["bar", { baz: true }], "qux", undefined, null, false)).toBe("foo bar baz qux");
  });
});
