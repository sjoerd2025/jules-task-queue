## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-07 - Use raw SQL for atomic conditional updates
**Learning:** Prisma's `upsert` followed by `update` does *not* provide atomicity for conditional updates based on existing row state (like window expiry for rate limiting). This approach still allows TOCTOU race conditions under high concurrency.
**Action:** When needing to perform atomic conditional updates, bypass Prisma's ORM and use raw PostgreSQL queries with `INSERT ... ON CONFLICT ... DO UPDATE SET`.
