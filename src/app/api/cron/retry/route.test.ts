import { POST } from "./route";
import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock environment
vi.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "test-secret",
    NODE_ENV: "production",
    TASK_CLEANUP_DAYS: "7",
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock db
vi.mock("@/server/db", () => ({
  db: {
    webhookLog: {
      create: vi.fn(),
    },
  },
}));

// Mock jules lib
vi.mock("@/lib/jules", () => ({
  retryAllFlaggedTasks: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
  cleanupOldTasks: vi.fn().mockResolvedValue(0),
}));

describe("Cron Retry Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if authorization header is missing", async () => {
    const req = new NextRequest("http://localhost/api/cron/retry", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if authorization header is incorrect", async () => {
    const req = new NextRequest("http://localhost/api/cron/retry", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if authorization header has different length", async () => {
    const req = new NextRequest("http://localhost/api/cron/retry", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-secret-length-mismatch", // Length is definitely different from "Bearer test-secret"
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 200 if authorization header is correct", async () => {
    const req = new NextRequest("http://localhost/api/cron/retry", {
      method: "POST",
      headers: {
        authorization: "Bearer test-secret",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
