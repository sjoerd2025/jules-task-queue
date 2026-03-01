import { describe, it, expect, vi } from "vitest";

// Mock env to prevent validation errors during import
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_GITHUB_APP_NAME: "test-app",
    NEXT_PUBLIC_GITHUB_APP_ID: "12345",
    GITHUB_APP_PRIVATE_KEY: "mock-key",
    GITHUB_APP_WEBHOOK_SECRET: "mock-secret",
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
  },
}));

import { getInstallationStatus } from "./github-app-utils";

describe("getInstallationStatus", () => {
  it("returns success when installation_id is present", () => {
    const params = new URLSearchParams("installation_id=12345");
    const result = getInstallationStatus(params);
    expect(result).toEqual({
      success: true,
      installationId: "12345",
      setupAction: "install",
    });
  });

  it("returns success with custom setup_action", () => {
    const params = new URLSearchParams(
      "installation_id=12345&setup_action=update"
    );
    const result = getInstallationStatus(params);
    expect(result).toEqual({
      success: true,
      installationId: "12345",
      setupAction: "update",
    });
  });

  it("returns error when error param is present", () => {
    const params = new URLSearchParams("error=access_denied");
    const result = getInstallationStatus(params);
    expect(result).toEqual({
      success: false,
      error: "access_denied",
      errorDescription: "Installation failed",
      installationId: null,
    });
  });

  it("returns error with description", () => {
    const params = new URLSearchParams(
      "error=access_denied&error_description=User denied access"
    );
    const result = getInstallationStatus(params);
    expect(result).toEqual({
      success: false,
      error: "access_denied",
      errorDescription: "User denied access",
      installationId: null,
    });
  });

  it("returns error when installation_id is missing", () => {
    const params = new URLSearchParams("");
    const result = getInstallationStatus(params);
    expect(result).toEqual({
      success: false,
      error: "missing_installation_id",
      errorDescription:
        "Installation completed but no installation ID was provided",
    });
  });

  it("prioritizes error over installation_id", () => {
    const params = new URLSearchParams("installation_id=12345&error=failed");
    const result = getInstallationStatus(params);
    expect(result).toEqual({
      success: false,
      error: "failed",
      errorDescription: "Installation failed",
      installationId: "12345",
    });
  });
});
