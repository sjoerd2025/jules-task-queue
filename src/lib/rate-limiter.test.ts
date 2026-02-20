/* eslint-disable @typescript-eslint/no-explicit-any */
import { checkRateLimit } from "@/lib/rate-limiter";
import { db } from "@/server/db";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the db object
vi.mock("@/server/db", () => ({
  db: {
    rateLimit: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock logger to avoid console spam during tests
vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe("checkRateLimit", () => {
  const identifier = "test-ip";
  const endpoint = "test-endpoint";
  const maxRequests = 10;
  const windowMs = 60000;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow request if within limit (new entry)", async () => {
    // Mock findUnique to return null (no existing limit)
    (db.rateLimit.findUnique as any).mockResolvedValue(null);
    // Mock upsert to succeed
    (db.rateLimit.upsert as any).mockResolvedValue({
      identifier,
      endpoint,
      requests: 1,
      windowStart: new Date(),
      expiresAt: new Date(Date.now() + windowMs),
    });

    const result = await checkRateLimit(identifier, endpoint, maxRequests, windowMs);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(maxRequests - 1);
    expect(db.rateLimit.upsert).toHaveBeenCalled();
  });

  it("should allow request if within limit (existing entry)", async () => {
    const existingLimit = {
      id: 1,
      identifier,
      endpoint,
      requests: 5,
      windowStart: new Date(),
      expiresAt: new Date(Date.now() + windowMs),
    };

    (db.rateLimit.findUnique as any).mockResolvedValue(existingLimit);
    (db.rateLimit.update as any).mockResolvedValue({
      ...existingLimit,
      requests: 6,
    });

    const result = await checkRateLimit(identifier, endpoint, maxRequests, windowMs);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(maxRequests - 6);
    expect(db.rateLimit.update).toHaveBeenCalled();
  });

  it("should deny request if limit exceeded", async () => {
    const existingLimit = {
      id: 1,
      identifier,
      endpoint,
      requests: maxRequests,
      windowStart: new Date(),
      expiresAt: new Date(Date.now() + windowMs),
    };

    (db.rateLimit.findUnique as any).mockResolvedValue(existingLimit);

    const result = await checkRateLimit(identifier, endpoint, maxRequests, windowMs);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(db.rateLimit.update).not.toHaveBeenCalled();
  });

  it("should fallback to in-memory cache if db fails", async () => {
    // Mock findUnique to throw error
    (db.rateLimit.findUnique as any).mockRejectedValue(new Error("DB error"));

    // We need to use a new identifier to ensure fallback cache is empty
    const uniqueId = "fallback-test-" + Date.now();

    const result = await checkRateLimit(uniqueId, endpoint, maxRequests, windowMs);

    // Expect fallback behavior (fallback allows 5 requests by default in implementation)
    // The implementation calls checkRateLimitFallback(identifier, 5, windowMs)
    // First call should be allowed
    expect(result.allowed).toBe(true);
    // Remaining should be 4 (5 - 1)
    expect(result.remaining).toBe(4);
  });

  it("should deny request if limit exceeded in fallback mode", async () => {
    (db.rateLimit.findUnique as any).mockRejectedValue(new Error("DB error"));

    const uniqueId = "fallback-limit-test-" + Date.now();
    const fallbackLimit = 5; // Hardcoded in implementation

    // Consume all allowed requests
    for (let i = 0; i < fallbackLimit; i++) {
      const res = await checkRateLimit(uniqueId, endpoint, maxRequests, windowMs);
      expect(res.allowed).toBe(true);
    }

    // Next request should be denied
    const result = await checkRateLimit(uniqueId, endpoint, maxRequests, windowMs);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
