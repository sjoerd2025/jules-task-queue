import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildInstallationUrl, INSTALLATION_ERRORS } from './github-app-utils';

// Mock the env module
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_GITHUB_APP_NAME: 'test-app-name',
  },
}));

// Mock the logger module
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { env } from '@/lib/env';

describe('buildInstallationUrl', () => {
  const originalURL = global.URL;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env mock default
    (env as any).NEXT_PUBLIC_GITHUB_APP_NAME = 'test-app-name';
    global.URL = originalURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.URL = originalURL;
  });

  it('should return a valid installation URL when inputs are valid', () => {
    const baseUrl = 'https://example.com';
    const result = buildInstallationUrl(baseUrl);

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();

    const url = new URL(result.url!);
    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe('/apps/test-app-name/installations/new');

    const state = url.searchParams.get('state');
    expect(state).toBeDefined();
    expect(decodeURIComponent(state!)).toBe('https://example.com/github-app/success');
  });

  it('should return invalid URL error when base URL is invalid', () => {
    const baseUrl = 'invalid-url';
    const result = buildInstallationUrl(baseUrl);

    expect(result.success).toBe(false);
    expect(result.error).toBe(INSTALLATION_ERRORS.INVALID_URL.message);
    expect(result.errorCode).toBe(INSTALLATION_ERRORS.INVALID_URL.code);
  });

  it('should return missing app name error when app name is missing', () => {
    (env as any).NEXT_PUBLIC_GITHUB_APP_NAME = undefined;
    const baseUrl = 'https://example.com';
    const result = buildInstallationUrl(baseUrl);

    expect(result.success).toBe(false);
    expect(result.error).toBe(INSTALLATION_ERRORS.MISSING_APP_NAME.message);
    expect(result.errorCode).toBe(INSTALLATION_ERRORS.MISSING_APP_NAME.code);
  });

  it('should return missing app name error when app name is empty string', () => {
    (env as any).NEXT_PUBLIC_GITHUB_APP_NAME = '   ';
    const baseUrl = 'https://example.com';
    const result = buildInstallationUrl(baseUrl);

    expect(result.success).toBe(false);
    expect(result.error).toBe(INSTALLATION_ERRORS.MISSING_APP_NAME.message);
    expect(result.errorCode).toBe(INSTALLATION_ERRORS.MISSING_APP_NAME.code);
  });

  it('should handle exception during URL construction', () => {
     // Mock URL constructor to throw error specifically for the installation URL construction
     // The first call is checking baseUrl validity, which we want to pass.
     // The second call is creating the installation URL, which we want to fail.

     let callCount = 0;
     const mockURL = vi.fn(function(url: string | URL, base?: string | URL) {
         callCount++;
         // The implementation calls new URL(baseUrl) first
         // Then new URL(installationUrlString) second
         if (callCount === 2) {
             throw new Error('Test error');
         }
         return new originalURL(url, base);
     });

     global.URL = mockURL as any;

     const result = buildInstallationUrl('https://example.com');

     expect(result.success).toBe(false);
     expect(result.errorCode).toBe(INSTALLATION_ERRORS.UNKNOWN.code);
     expect(result.error).toBe('Test error');
  });
});
