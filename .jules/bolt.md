## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Optimize GitHub API concurrent requests
**Learning:** Sequential loops calling external APIs (e.g. GitHub's API during installation syncing) create significant performance bottlenecks, while unbounded `Promise.all` triggers secondary rate limits and exhausts connection pools.
**Action:** Always use bounded batching (e.g., chunking the list with `Promise.all` and a sensible size like 10-50) when making concurrent external API calls, to balance performance gains with resource safety.
