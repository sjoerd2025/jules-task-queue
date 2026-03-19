## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-19 - Replace Prisma upsert with raw SQL to fix TOCTOU race condition in rate-limiter
**Learning:** When using Prisma, prefer atomic operations. However, Prisma's `upsert` cannot handle conditional updates based on existing row state atomically. For such cases, use raw PostgreSQL (`db.$queryRaw`) with `INSERT ... ON CONFLICT DO UPDATE` to prevent TOCTOU race conditions.
**Action:** Implemented a single raw SQL query in `checkRateLimit` to handle both the upsert and the conditional reset of the time window, avoiding a potential race condition and saving an additional database roundtrip.
