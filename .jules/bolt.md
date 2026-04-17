## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Optimize GitHub API lookups with local fast-path DB cache
**Learning:** External API lookups inside a loop can easily create an N+1 performance bottleneck. In local systems that periodically sync remote resources (like `installationRepository`), a quick fast-path cache lookup in the local database can significantly speed up operation times.
**Action:** When searching for resources that exist in local sync tables, always query the database first to prevent massive bottlenecks before falling back to external APIs.
