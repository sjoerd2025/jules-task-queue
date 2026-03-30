## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Use chunked Promises for GitHub API concurrency
**Learning:** Sequential loops for batch API operations (e.g. `syncAllInstallations`) are slow, and unbounded concurrency (`Promise.all` on thousands of items) can trigger GitHub's secondary rate limits or exhaust connection pools.
**Action:** Use bounded concurrent execution (chunked `Promise.all` with a chunk size of 10) to safely optimize synchronization time while respecting API rate limits.
