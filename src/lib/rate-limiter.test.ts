import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from './rate-limiter';

// Mock Logger
vi.mock('./logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Since we can't easily clear the singleton store without exposing it,
    // we use unique identifiers for each test.
  });

  it('should allow request if no limit exists', async () => {
    const identifier = 'user-allow-' + Date.now();
    const result = await checkRateLimit(identifier, '/api/test', 10, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('should deny request if limit is exceeded', async () => {
    const identifier = 'user-deny-' + Date.now();
    const maxRequests = 2;

    // 1st request
    let result = await checkRateLimit(identifier, '/api/test', maxRequests, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);

    // 2nd request
    result = await checkRateLimit(identifier, '/api/test', maxRequests, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);

    // 3rd request (should be denied)
    result = await checkRateLimit(identifier, '/api/test', maxRequests, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset limit if window expired', async () => {
    const identifier = 'user-reset-' + Date.now();
    const maxRequests = 2;
    const windowMs = 100; // very short window

    // 1st request
    await checkRateLimit(identifier, '/api/test', maxRequests, windowMs);
    // 2nd request
    await checkRateLimit(identifier, '/api/test', maxRequests, windowMs);
    // 3rd request (denied)
    let result = await checkRateLimit(identifier, '/api/test', maxRequests, windowMs);
    expect(result.allowed).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 50));

    // 4th request (should be allowed now)
    result = await checkRateLimit(identifier, '/api/test', maxRequests, windowMs);
    expect(result.allowed).toBe(true);
    // Since it's a new window, remaining should be maxRequests - 1
    expect(result.remaining).toBe(maxRequests - 1);
  });
});
