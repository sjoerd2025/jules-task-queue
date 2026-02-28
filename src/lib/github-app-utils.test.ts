import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Hoist the mock env variables
const mockEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_GITHUB_APP_NAME: 'test-app',
  NEXT_PUBLIC_GITHUB_APP_ID: '123456',
  GITHUB_APP_PRIVATE_KEY: 'test-private-key',
  GITHUB_APP_WEBHOOK_SECRET: 'test-webhook-secret',
}));

// 2. Mock the env module before importing the subject
vi.mock('@/lib/env', () => ({
  env: mockEnv,
}));

// 3. Mock the logger to prevent noise
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { validateGitHubAppConfig } from './github-app-utils';

describe('validateGitHubAppConfig', () => {
  beforeEach(() => {
    // Reset all env variables to valid values before each test
    mockEnv.NEXT_PUBLIC_GITHUB_APP_NAME = 'test-app';
    mockEnv.NEXT_PUBLIC_GITHUB_APP_ID = '123456';
    mockEnv.GITHUB_APP_PRIVATE_KEY = 'test-private-key';
    mockEnv.GITHUB_APP_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  it('returns valid=true when all required configuration is present', () => {
    const result = validateGitHubAppConfig();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns an error when NEXT_PUBLIC_GITHUB_APP_NAME is missing', () => {
    mockEnv.NEXT_PUBLIC_GITHUB_APP_NAME = '';
    const result = validateGitHubAppConfig();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('NEXT_PUBLIC_GITHUB_APP_NAME is not configured');
  });

  it('returns an error when NEXT_PUBLIC_GITHUB_APP_NAME is only whitespace', () => {
    mockEnv.NEXT_PUBLIC_GITHUB_APP_NAME = '   ';
    const result = validateGitHubAppConfig();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('NEXT_PUBLIC_GITHUB_APP_NAME is not configured');
  });

  it('returns an error when NEXT_PUBLIC_GITHUB_APP_ID is missing', () => {
    mockEnv.NEXT_PUBLIC_GITHUB_APP_ID = '';
    const result = validateGitHubAppConfig();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('NEXT_PUBLIC_GITHUB_APP_ID is not configured');
  });

  it('returns an error when GITHUB_APP_PRIVATE_KEY is missing', () => {
    mockEnv.GITHUB_APP_PRIVATE_KEY = '';
    const result = validateGitHubAppConfig();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('GITHUB_APP_PRIVATE_KEY is not configured');
  });

  it('returns an error when GITHUB_APP_WEBHOOK_SECRET is missing', () => {
    mockEnv.GITHUB_APP_WEBHOOK_SECRET = '';
    const result = validateGitHubAppConfig();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('GITHUB_APP_WEBHOOK_SECRET is not configured');
  });

  it('returns all errors when multiple configurations are missing', () => {
    mockEnv.NEXT_PUBLIC_GITHUB_APP_NAME = '';
    mockEnv.NEXT_PUBLIC_GITHUB_APP_ID = '';
    mockEnv.GITHUB_APP_PRIVATE_KEY = '';
    mockEnv.GITHUB_APP_WEBHOOK_SECRET = '';

    const result = validateGitHubAppConfig();
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
    expect(result.errors).toContain('NEXT_PUBLIC_GITHUB_APP_NAME is not configured');
    expect(result.errors).toContain('NEXT_PUBLIC_GITHUB_APP_ID is not configured');
    expect(result.errors).toContain('GITHUB_APP_PRIVATE_KEY is not configured');
    expect(result.errors).toContain('GITHUB_APP_WEBHOOK_SECRET is not configured');
  });
});
