import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'crypto';

// Mock env
vi.mock('@/lib/env', () => ({
  env: {
    GITHUB_APP_WEBHOOK_SECRET: 'test-secret',
    NODE_ENV: 'test',
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock db
vi.mock('@/server/db', () => ({
  db: {
    webhookLog: {
      create: vi.fn(),
    },
  },
}));

import { verifyGitHubAppSignature } from './webhook-utils';

describe('verifyGitHubAppSignature', () => {
  it('returns true for valid signature', () => {
    const payload = JSON.stringify({ action: 'test' });
    const secret = 'test-secret';
    const signature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

    expect(verifyGitHubAppSignature(payload, signature)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const payload = JSON.stringify({ action: 'test' });
    const signature = 'sha256=invalid';

    expect(verifyGitHubAppSignature(payload, signature)).toBe(false);
  });

  it('returns false for missing sha256 prefix', () => {
    const payload = JSON.stringify({ action: 'test' });
    const secret = 'test-secret';
    const signature = createHmac('sha256', secret).update(payload).digest('hex');

    expect(verifyGitHubAppSignature(payload, signature)).toBe(false);
  });
});
