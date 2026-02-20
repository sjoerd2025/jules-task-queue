import logger from "@/lib/logger";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  backoffFactor?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface RetryResult<T> {
  result: T;
  lastAttempt: number;
}

/**
 * Executes an async operation with retries using exponential backoff.
 * Returns the result and the number of attempts made.
 */
export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffFactor = 2,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await operation(attempt);
      return { result, lastAttempt: attempt };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (onRetry) {
        onRetry(lastError, attempt);
      } else {
        logger.warn(
          { error: lastError },
          `Attempt ${attempt + 1} failed (retrying in ${
            initialDelay * Math.pow(backoffFactor, attempt)
          }ms)`
        );
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(backoffFactor, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
