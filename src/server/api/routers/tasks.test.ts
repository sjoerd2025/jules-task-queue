import { expect, test, vi, describe, type Mock } from "vitest";
import { tasksRouter } from "./tasks";
import { createCallerFactory, createInnerTRPCContext } from "../trpc";
import { db } from "@/server/db";

// Mock the environment
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test", // Start with test environment
    ADMIN_SECRET: "supersecret",
    DATABASE_URL: "postgres://localhost:5432/db",
  },
}));

// Mock the db
vi.mock("@/server/db", () => ({
  db: {
    julesTask: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    gitHubInstallation: {
      count: vi.fn(),
    },
    installationRepository: {
      count: vi.fn(),
    },
  },
}));

describe("tasks router", () => {
  const createCaller = createCallerFactory(tasksRouter);

  test("list should return tasks", async () => {
    const mockTasks = [
      { id: 1, flaggedForRetry: false, createdAt: new Date() },
      { id: 2, flaggedForRetry: true, createdAt: new Date() },
    ];

    (db.julesTask.findMany as unknown as Mock).mockResolvedValue(mockTasks);

    const ctx = createInnerTRPCContext({ headers: new Headers() });
    const caller = createCaller(ctx);

    const result = await caller.list({});

    expect(result.tasks).toEqual(mockTasks);
    expect(db.julesTask.findMany).toHaveBeenCalled();
  });

  test("retry should update task", async () => {
    const mockTask = { id: 1, retryCount: 0 };
    const updatedTask = { ...mockTask, flaggedForRetry: true, retryCount: 1 };

    (db.julesTask.findUnique as unknown as Mock).mockResolvedValue(mockTask);
    (db.julesTask.update as unknown as Mock).mockResolvedValue(updatedTask);

    const ctx = createInnerTRPCContext({ headers: new Headers() });
    const caller = createCaller(ctx);

    const result = await caller.retry({ id: 1 });

    expect(result).toEqual(updatedTask);
    expect(db.julesTask.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ flaggedForRetry: true }),
    });
  });
});
