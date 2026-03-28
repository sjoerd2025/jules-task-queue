## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2025-03-05 - Batching GitHub API requests
**Learning:** Sequential execution of API calls inside loops for syncing data from GitHub significantly bottlenecked synchronization times. At the same time, unbounded concurrency runs a high risk of hitting GitHub API secondary rate limits.
**Action:** Always use bounded concurrency (e.g. `Promise.all` with a chunk/batch size of 10) for multiple concurrent external API calls, notably to the GitHub API, to improve performance without overwhelming rate limits.
