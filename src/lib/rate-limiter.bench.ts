import { bench, describe } from 'vitest';
import { checkRateLimit } from './rate-limiter';

describe('Rate Limiter Benchmark', () => {
  bench('checkRateLimit', async () => {
    // This benchmark measures the performance of the in-memory rate limiter
    await checkRateLimit('bench-user', '/api/bench', 100, 60000);
  });
});
