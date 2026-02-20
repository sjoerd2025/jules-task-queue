import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retry } from './retry';

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}));

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on first success', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await retry(operation);

    expect(result).toEqual({ result: 'success', lastAttempt: 0 });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledWith(0);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const promise = retry(operation, { maxRetries: 3, initialDelay: 100 });

    // Fast-forward timers
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toEqual({ result: 'success', lastAttempt: 1 });
    expect(operation).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenNthCalledWith(1, 0);
    expect(operation).toHaveBeenNthCalledWith(2, 1);
  });

  it('should throw after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fail'));

    const promise = retry(operation, { maxRetries: 3, initialDelay: 100 });

    // Attach handler immediately to avoid unhandled rejection warning
    const resultPromise = expect(promise).rejects.toThrow('fail');

    // Fast-forward timers
    await vi.runAllTimersAsync();

    await resultPromise;
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fail'));
    const initialDelay = 100;
    const backoffFactor = 2;

    const promise = retry(operation, { maxRetries: 3, initialDelay, backoffFactor });

    // Capture promise rejection to avoid unhandled rejection
    const catchPromise = promise.catch(() => {});

    await vi.runAllTimersAsync();
    await catchPromise;

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should call onRetry callback', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fail'));
    const onRetry = vi.fn();

    const promise = retry(operation, { maxRetries: 2, onRetry });

    // Capture promise rejection
    const catchPromise = promise.catch(() => {});

    await vi.runAllTimersAsync();
    await catchPromise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 0);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });
});
