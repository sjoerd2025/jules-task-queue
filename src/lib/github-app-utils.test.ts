import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_GITHUB_APP_NAME: "test-app",
  NEXT_PUBLIC_GITHUB_APP_ID: "123",
  GITHUB_APP_PRIVATE_KEY: "test-key",
  GITHUB_APP_WEBHOOK_SECRET: "test-secret",
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { buildInstallationUrl, INSTALLATION_ERRORS } from "./github-app-utils";
import logger from "@/lib/logger";

describe("buildInstallationUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.NEXT_PUBLIC_GITHUB_APP_NAME = "test-app";
  });

  it("should successfully build an installation URL", () => {
    const result = buildInstallationUrl("https://example.com");

    expect(result.success).toBe(true);

    if (result.url) {
      const parsedUrl = new URL(result.url);
      expect(parsedUrl.origin).toBe("https://github.com");
      expect(parsedUrl.pathname).toBe("/apps/test-app/installations/new");

      const state = parsedUrl.searchParams.get("state");
      expect(state).toBe(encodeURIComponent("https://example.com/github-app/success"));
    } else {
      expect.fail("URL should be defined on success");
    }
  });

  it("should return INVALID_URL error for malformed base URL", () => {
    const result = buildInstallationUrl("not-a-url");

    expect(result.success).toBe(false);
    expect(result.error).toBe(INSTALLATION_ERRORS.INVALID_URL.message);
    expect(result.errorCode).toBe(INSTALLATION_ERRORS.INVALID_URL.code);
  });

  it("should return MISSING_APP_NAME error if NEXT_PUBLIC_GITHUB_APP_NAME is not configured", () => {
    mockEnv.NEXT_PUBLIC_GITHUB_APP_NAME = "";

    const result = buildInstallationUrl("https://example.com");

    expect(result.success).toBe(false);
    expect(result.error).toBe(INSTALLATION_ERRORS.MISSING_APP_NAME.message);
    expect(result.errorCode).toBe(INSTALLATION_ERRORS.MISSING_APP_NAME.code);

    // Test with whitespace only
    mockEnv.NEXT_PUBLIC_GITHUB_APP_NAME = "   ";
    const result2 = buildInstallationUrl("https://example.com");
    expect(result2.success).toBe(false);
    expect(result2.errorCode).toBe(INSTALLATION_ERRORS.MISSING_APP_NAME.code);
  });

  it("should catch unknown errors and return UNKNOWN error", () => {
    // Force an error in the outer try-catch block by making .trim() throw
    // @ts-expect-error: Intentionally causing a type error to test error handling
    mockEnv.NEXT_PUBLIC_GITHUB_APP_NAME = {
      trim: () => { throw new Error("Mocked unknown error"); }
    };

    const result = buildInstallationUrl("https://example.com");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Mocked unknown error");
    expect(result.errorCode).toBe(INSTALLATION_ERRORS.UNKNOWN.code);
    expect(logger.error).toHaveBeenCalled();
  });
});
