import logger from "./logger";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

interface RateLimitStore {
  check(
    identifier: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult>;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private limits = new Map<string, { count: number; expiresAt: number }>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup every minute to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
    // Unref so it doesn't block process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.limits.entries()) {
      if (value.expiresAt <= now) {
        this.limits.delete(key);
      }
    }
  }

  async check(
    identifier: string,
    endpoint: string,
    maxRequests: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const key = `${identifier}:${endpoint}`;
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || entry.expiresAt <= now) {
      // New window or expired
      const expiresAt = now + windowMs;
      this.limits.set(key, { count: 1, expiresAt });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: new Date(expiresAt),
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(entry.expiresAt),
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: new Date(entry.expiresAt),
    };
  }
}

// Singleton store instance
const store = new InMemoryRateLimitStore();

/**
 * Checks if a request is allowed under the rate limit policy.
 *
 * @param identifier - A unique identifier for the entity being rate-limited (e.g., IP address, API key).
 * @param endpoint - The API endpoint being accessed.
 * @param maxRequests - The maximum number of requests allowed in the time window.
 * @param windowMs - The time window in milliseconds.
 * @returns An object indicating whether the request is allowed, the number of remaining requests, and when the limit resets.
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000,
): Promise<RateLimitResult> {
  try {
    return await store.check(identifier, endpoint, maxRequests, windowMs);
  } catch (error) {
    logger.error({ error, identifier, endpoint }, "Rate limit check failed");
    // Fallback: allow request to prevent blocking legitimate traffic if something goes wrong
    return {
      allowed: true,
      remaining: 1,
      resetTime: new Date(Date.now() + windowMs),
    };
  }
}
