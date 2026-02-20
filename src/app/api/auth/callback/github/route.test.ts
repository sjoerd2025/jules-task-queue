import { GET } from "./route";
import { NextRequest } from "next/server";
import { vi, describe, it, expect } from "vitest";

// Mock dependencies
vi.mock("@/lib/env", () => ({
  env: {
    GITHUB_APP_CALLBACK_URL: "http://localhost:3000/api/auth/callback/github",
    GITHUB_APP_CLIENT_ID: "client_id",
    GITHUB_APP_CLIENT_SECRET: "client_secret",
  },
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/server/db", () => ({
  db: {
    gitHubInstallation: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(undefined), // No cookie
    delete: vi.fn(),
  }),
}));

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("GitHub Callback Route CSRF Vulnerability", () => {
  it("SECURE: partial match now fails validation (returns 422)", async () => {
    // Attack vector: state contains "/github-app/success" but is invalid
    const req = new NextRequest(
      "http://localhost:3000/api/auth/callback/github?state=invalid/github-app/success"
    );
    const res = await GET(req);

    // Expect 422 (Invalid CSRF state) because validation failed
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("Invalid or missing CSRF state");
  });

  it("LEGITIMATE: exact match passes validation", async () => {
    // Valid vector: state is exactly "/github-app/success"
    const req = new NextRequest(
      "http://localhost:3000/api/auth/callback/github?state=/github-app/success"
    );
    const res = await GET(req);

    // Expect 400 (Missing OAuth code) because validation passed
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing OAuth code");
  });
});
