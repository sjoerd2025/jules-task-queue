import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@/lib/github", () => ({
  githubClient: {},
}));
vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/token-manager", () => ({
  getUserAccessToken: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  db: {},
}));

// Now import the module
import {
  analyzeComment,
  isJulesBot,
  isTaskLimitComment,
  isWorkingComment,
} from "./jules";
import type { GitHubComment } from "@/types";

describe("jules.ts", () => {
  describe("isJulesBot", () => {
    it("should return true for 'google-labs-jules[bot]'", () => {
      expect(isJulesBot("google-labs-jules[bot]")).toBe(true);
    });

    it("should return true for 'google-labs-jules'", () => {
      expect(isJulesBot("google-labs-jules")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(isJulesBot("Google-Labs-Jules[bot]")).toBe(true);
    });

    it("should return false for other usernames", () => {
      expect(isJulesBot("other-bot")).toBe(false);
      expect(isJulesBot("jules-imposter")).toBe(false);
    });

    it("should not match usernames that contain the bot name as a substring", () => {
      expect(isJulesBot("xgoogle-labs-julesx")).toBe(false);
      expect(isJulesBot("not-google-labs-jules-really")).toBe(false);
    });
  });

  describe("isTaskLimitComment", () => {
    it("should return true for task limit patterns", () => {
      expect(
        isTaskLimitComment("You are currently at your concurrent task limit"),
      ).toBe(true);
      expect(isTaskLimitComment("You are currently at your limit")).toBe(true);
      expect(isTaskLimitComment("Jules has failed to create a task")).toBe(
        true,
      );
    });

    it("should be case insensitive", () => {
      expect(
        isTaskLimitComment("YOU ARE CURRENTLY AT YOUR CONCURRENT TASK LIMIT"),
      ).toBe(true);
    });

    it("should return false for unrelated text", () => {
      expect(isTaskLimitComment("Hello world")).toBe(false);
      expect(isTaskLimitComment("Task completed successfully")).toBe(false);
    });
  });

  describe("isWorkingComment", () => {
    it("should return true for working patterns", () => {
      expect(
        isWorkingComment("When finished, you will see another comment"),
      ).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(
        isWorkingComment("WHEN FINISHED, YOU WILL SEE ANOTHER COMMENT"),
      ).toBe(true);
    });

    it("should return false for unrelated text", () => {
      expect(isWorkingComment("Hello world")).toBe(false);
    });
  });

  describe("analyzeComment", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const createMockComment = (
      body: string | undefined,
      createdAt: Date = new Date(),
    ): GitHubComment => ({
      id: 123,
      body,
      user: { login: "google-labs-jules[bot]" },
      created_at: createdAt.toISOString(),
    });

    it("should classify task limit comments correctly", () => {
      const comment = createMockComment(
        "You are currently at your concurrent task limit",
      );
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe("task_limit");
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.patterns_matched).toContain(
        "You are currently at your concurrent task limit",
      );
    });

    it("should classify working comments correctly", () => {
      const comment = createMockComment(
        "When finished, you will see another comment",
      );
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe("working");
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.patterns_matched).toContain(
        "When finished, you will see another comment",
      );
    });

    it("should classify unknown comments correctly", () => {
      const comment = createMockComment("Some random comment from Jules");
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe("unknown");
      expect(analysis.confidence).toBe(0);
      expect(analysis.patterns_matched).toHaveLength(0);
    });

    it("should calculate age_minutes correctly", () => {
      const now = new Date("2023-01-01T12:00:00Z");
      vi.setSystemTime(now);

      const tenMinutesAgo = new Date("2023-01-01T11:50:00Z");
      const comment = createMockComment("test", tenMinutesAgo);
      const analysis = analyzeComment(comment);

      expect(analysis.age_minutes).toBeCloseTo(10);
    });

    it("should prioritize task limit over working if both present", () => {
      const comment = createMockComment(
        "You are currently at your concurrent task limit. When finished, you will see another comment",
      );
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe("task_limit");
    });

    it("should handle empty body gracefully", () => {
      const comment = createMockComment(undefined);
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe("unknown");
    });

    it("should handle empty string body gracefully", () => {
      const comment = createMockComment("");
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe("unknown");
    });
  });
});
