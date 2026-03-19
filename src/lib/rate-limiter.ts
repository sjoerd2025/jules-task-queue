import { db } from "@/server/db";
import logger from "./logger";

// Simple in-memory fallback cache for rate limiting if the database is unavailable.
const fallbackCache = new Map<string, { count: number; windowStart: number }>();

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
) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    // Clean up expired rate limit entries first.
    // This is a non-blocking call to avoid delaying the response.
    if (Math.random() < 0.01) {
      // Only run cleanup on 1% of requests to reduce DB load.
      db.rateLimit
        .deleteMany({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        })
        .catch((err) =>
          logger.error(err, "Failed to cleanup expired rate limits"),
        );
    }

    const expiresAt = new Date(now.getTime() + windowMs);

    // Atomically increment the request count, handling window expiration
    // in a single query to prevent TOCTOU race conditions.
    const results = await db.$queryRaw<{ requests: number; expiresAt: Date; windowStart: Date }[]>`
      INSERT INTO rate_limits (identifier, endpoint, requests, "windowStart", "expiresAt", "updatedAt")
      VALUES (${identifier}, ${endpoint}, 1, ${now}, ${expiresAt}, NOW())
      ON CONFLICT (identifier, endpoint)
      DO UPDATE SET
        requests = CASE
          WHEN rate_limits."windowStart" < ${windowStart} THEN 1
          ELSE rate_limits.requests + 1
        END,
        "windowStart" = CASE
          WHEN rate_limits."windowStart" < ${windowStart} THEN ${now}
          ELSE rate_limits."windowStart"
        END,
        "expiresAt" = CASE
          WHEN rate_limits."windowStart" < ${windowStart} THEN ${expiresAt}
          ELSE rate_limits."expiresAt"
        END,
        "updatedAt" = NOW()
      RETURNING *;
    `;

    const updatedLimit = results[0];

    if (updatedLimit.requests > maxRequests) {
      // Limit exceeded.
      return {
        allowed: false,
        remaining: 0,
        resetTime: updatedLimit.expiresAt,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - updatedLimit.requests,
      resetTime: updatedLimit.expiresAt,
    };
  } catch (error) {
    logger.error({ error, identifier, endpoint }, "Rate limit check failed");
    // Fallback to in-memory rate limiter if the database fails.
    return checkRateLimitFallback(identifier, 5, windowMs); // More restrictive fallback
  }
}

/**
 * A fallback in-memory rate limiter to use when the primary database-based one fails.
 *
 * @param identifier - A unique identifier for the entity being rate-limited.
 * @param maxRequests - The maximum number of requests allowed.
 * @param windowMs - The time window in milliseconds.
 * @returns An object indicating if the request is allowed.
 */
function checkRateLimitFallback(
  identifier: string,
  maxRequests: number,
  windowMs: number,
) {
  const now = Date.now();
  const entry = fallbackCache.get(identifier);

  if (!entry || now - entry.windowStart > windowMs) {
    // If no entry or the window has expired, create a new one.
    fallbackCache.set(identifier, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: new Date(now + windowMs),
    };
  }

  if (entry.count >= maxRequests) {
    // Limit exceeded.
    logger.warn(
      { identifier, count: entry.count, maxRequests },
      "Fallback rate limit exceeded",
    );
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(entry.windowStart + windowMs),
    };
  }

  // Increment count and allow the request.
  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: new Date(entry.windowStart + windowMs),
  };
}
